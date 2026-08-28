'use strict'

const SKIP_RESP = new Set([
  'content-security-policy','content-security-policy-report-only',
  'x-frame-options','strict-transport-security','x-content-type-options','alt-svc',
  'cross-origin-opener-policy','cross-origin-embedder-policy','cross-origin-resource-policy',
  'permissions-policy','feature-policy',
  'content-encoding','transfer-encoding','keep-alive','connection','te','trailers','upgrade',
])
const SKIP_REQ = new Set([
  'host','connection','keep-alive','upgrade-insecure-requests',
  'cf-connecting-ip','cf-ray','cf-visitor','cf-ipcountry','x-forwarded-for','x-real-ip',
  'sec-fetch-dest','sec-fetch-mode','sec-fetch-site','sec-fetch-user',
])

function getCookie(request, name) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : null
  } catch { return null }
}

export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: corsHeaders(request) })

    if (/\/generate_204($|\?)/.test(url.pathname))
      return new Response(null, { status: 204, headers: corsHeaders(request) })

    let target = url.searchParams.get('u')
    if (!target && url.pathname !== '/') {
      target = refererTarget(request, url)
      if (!target) {
        const lastOrigin = getCookie(request, '__wos_origin')
        if (lastOrigin) {
          target = lastOrigin + url.pathname + url.search + url.hash
        }
      }
    }
    if (!target) return landing()
    if (!target.startsWith('http')) target = 'https://' + target

    if (/\/generate_204($|\?)/.test(target))
      return new Response(null, { status: 204, headers: corsHeaders(request) })

    let targetUrl
    try { targetUrl = new URL(target) }
    catch { return new Response('Invalid URL', { status: 400, headers: corsHeaders(request) }) }

    return proxyRequest(request, targetUrl, url)
  }
}

function refererTarget(request, reqUrl) {
  try {
    const ref = new URL(request.headers.get('referer') || '')
    const base = ref.searchParams.get('u')
    if (!base) return null
    return new URL(base).origin + reqUrl.pathname + reqUrl.search + reqUrl.hash
  } catch { return null }
}

async function proxyRequest(request, targetUrl, workerUrl) {
  const outHeaders = new Headers()
  for (const [k, v] of request.headers) {
    if (!SKIP_REQ.has(k.toLowerCase())) outHeaders.set(k, v)
  }
  outHeaders.set('host', targetUrl.host)
  outHeaders.set('origin', targetUrl.origin)
  
  const dest = request.headers.get('sec-fetch-dest') || 'empty'
  const mode = request.headers.get('sec-fetch-mode') || 'cors'
  const site = request.headers.get('sec-fetch-site') || 'same-origin'
  outHeaders.set('sec-fetch-dest', dest)
  outHeaders.set('sec-fetch-mode', mode)
  outHeaders.set('sec-fetch-site', site)

  // Decode proxied referer back to real URL
  try {
    const rUrl = new URL(request.headers.get('referer') || '')
    outHeaders.set('referer', rUrl.searchParams.get('u') || targetUrl.href)
  } catch { outHeaders.set('referer', targetUrl.href) }

  let resp
  try {
    resp = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: outHeaders,
      body: ['GET','HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    })
  } catch (e) {
    return new Response(`Proxy error: ${e.message}`, { status: 502, headers: corsHeaders(request) })
  }

  // Follow redirects through proxy
  if (resp.status >= 300 && resp.status < 400) {
    const loc = resp.headers.get('location')
    if (loc) {
      const abs = new URL(loc, targetUrl).toString()
      return Response.redirect(`${workerUrl.origin}/?u=${encodeURIComponent(abs)}`, resp.status)
    }
  }

  const rh = new Headers()
  for (const [k, v] of resp.headers) {
    if (!SKIP_RESP.has(k.toLowerCase()) && k.toLowerCase() !== 'set-cookie') {
      rh.set(k, v)
    }
  }
  // Rewrite Set-Cookie headers for 3rd party iframe compatibility
  let rawCookies = []
  if (typeof resp.headers.getSetCookie === 'function') {
    rawCookies = resp.headers.getSetCookie()
  }
  if (!rawCookies || rawCookies.length === 0) {
    const singleSc = resp.headers.get('set-cookie')
    if (singleSc) rawCookies = splitSetCookie(singleSc)
  }
  for (const sc of rawCookies) {
    const rw = rewriteSetCookie(sc)
    if (rw) rh.append('set-cookie', rw)
  }
  rh.append('set-cookie', `__wos_origin=${encodeURIComponent(targetUrl.origin)}; Path=/; SameSite=None; Secure; Partitioned`)
  Object.entries(corsHeaders(request)).forEach(([k, v]) => rh.set(k, v))

  const ct = resp.headers.get('content-type') ?? ''

  if (ct.includes('text/html')) {
    rh.set('content-type', 'text/html; charset=utf-8')
    return new HTMLRewriter()
      .on('base',                        { element: el => el.remove() })
      .on('a, link',                     new Attr('href',         targetUrl, workerUrl))
      .on('script',                      new Attr('src',          targetUrl, workerUrl))
      .on('img, input[type=image]',      new Attr('src',          targetUrl, workerUrl))
      .on('video, audio, source',        new Attr('src',          targetUrl, workerUrl))
      .on('source',                      new Attr('srcset',       targetUrl, workerUrl, true))
      .on('form',                        new Attr('action',       targetUrl, workerUrl))
      .on('[data-src]',                  new Attr('data-src',     targetUrl, workerUrl))
      .on('[data-lazy-src]',             new Attr('data-lazy-src',targetUrl, workerUrl))
      .on('head',                        new Inject(workerUrl, targetUrl))
      .transform(new Response(resp.body, { status: resp.status, headers: rh }))
  }

  if (ct.includes('text/css')) {
    const css = await resp.text()
    const out = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
      if (/^(data:|#)/.test(u)) return m
      try { return `url("${workerUrl.origin}/?u=${encodeURIComponent(new URL(u, targetUrl).toString())}")` }
      catch { return m }
    })
    return new Response(out, { status: resp.status, headers: rh })
  }

  return new Response(resp.body, { status: resp.status, headers: rh })
}

function corsHeaders(request) {
  const reqOrigin = request ? (typeof request.headers?.get === 'function' ? request.headers.get('origin') : (request.headers?.origin || request.headers?.['origin'])) : null
  return {
    'access-control-allow-origin':   reqOrigin && reqOrigin !== 'null' ? reqOrigin : '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods':  'GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD',
    'access-control-allow-headers':  '*',
    'access-control-expose-headers': '*',
  }
}

class Attr {
  constructor(attr, base, worker, isSrcset = false) {
    this.attr = attr; this.base = base; this.worker = worker; this.isSrcset = isSrcset
  }
  element(el) {
    const v = el.getAttribute(this.attr)
    if (!v || v.startsWith('#') || v.startsWith('data:') || v.startsWith('javascript:') ||
        v.startsWith('mailto:') || v.startsWith('blob:')) return
    if (this.isSrcset) {
      const out = v.replace(/([^\s,]+)(\s+[^,]+)?/g, (m, u, d) => {
        try { return `${this.worker.origin}/?u=${encodeURIComponent(new URL(u.trim(), this.base).toString())}${d ?? ''}` }
        catch { return m }
      })
      el.setAttribute(this.attr, out); return
    }
    try { el.setAttribute(this.attr, `${this.worker.origin}/?u=${encodeURIComponent(new URL(v, this.base).toString())}`) }
    catch {}
  }
}

class Inject {
  constructor(worker, target) { this.worker = worker; this.target = target }
  element(el) {
    const W = JSON.stringify(this.worker.origin)
    const T = JSON.stringify(this.target.href)
    el.prepend(`<script>
(function(){
var W=${W},T=${T};
var _rp=(function(){try{return window.parent!==window?window.parent:null;}catch(e){return null;}})();
try{Object.defineProperty(window,'top',{get:function(){return window;},configurable:true});}catch(e){}
try{Object.defineProperty(window,'parent',{get:function(){return window;},configurable:true});}catch(e){}
try{Object.defineProperty(window,'frameElement',{get:function(){return null;},configurable:true});}catch(e){}
var _ld=Object.getOwnPropertyDescriptor(Location.prototype,'href');
var _rHref=_ld&&_ld.get||null;
function _rawHref(){try{return _rHref?_rHref.call(location):'';}catch(e){return T;}}
function _realProp(p){try{var h=_rawHref(),u=new URL(h),t=u.searchParams.get('u');return t?new URL(t)[p]:new URL(T)[p];}catch(e){try{return new URL(T)[p];}catch(e2){return '';}}}
['href','hostname','host','origin','pathname','search','hash','protocol','port'].forEach(function(p){try{var d=Object.getOwnPropertyDescriptor(Location.prototype,p);if(d&&d.get)Object.defineProperty(Location.prototype,p,Object.assign({},d,{get:function(){return _realProp(p);},configurable:true}));}catch(e){}});
try{Object.defineProperty(document,'URL',{get:function(){return _realProp('href');},configurable:true});}catch(e){}
try{Object.defineProperty(document,'documentURI',{get:function(){return _realProp('href');},configurable:true});}catch(e){}
try{Object.defineProperty(document,'referrer',{get:function(){return '';},configurable:true});}catch(e){}
try{Object.defineProperty(document,'domain',{get:function(){return _realProp('hostname');},configurable:true});}catch(e){}
try{
  var _cd=Object.getOwnPropertyDescriptor(Document.prototype,'cookie')||Object.getOwnPropertyDescriptor(HTMLDocument.prototype,'cookie');
  if(_cd&&_cd.set&&_cd.get){
    Object.defineProperty(document,'cookie',{
      configurable:true,
      get:function(){return _cd.get.call(document);},
      set:function(v){
        if(typeof v==='string'){
          v=v.replace(/;\\s*domain=[^;]*/gi,'').replace(/;\\s*samesite=[^;]*/gi,'').replace(/;\\s*secure/gi,'')+'; SameSite=None; Secure';
        }
        return _cd.set.call(document,v);
      }
    });
  }
}catch(e){}
function _wn(u){try{if(_rp)_rp.postMessage({__wos:'nav',url:u},'*');}catch(e){}}
_wn(T);
function px(u,b){
  if(!u||typeof u!=='string')return u;
  if(/^(#|data:|javascript:|blob:|mailto:|about:)/.test(u))return u;
  try{var a=new URL(u,b||T);if(a.origin===W)return u;return W+'/?u='+encodeURIComponent(a.toString());}catch(e){return u;}
}
var _f=window.fetch;
window.fetch=function(u,o){
  if(typeof u==='string')u=px(u);
  else if(u&&u.url){try{u=new Request(px(u.url),u);}catch(e){}}
  return _f.call(this,u,o);
};
var _x=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
  var args=Array.prototype.slice.call(arguments);
  args[1]=px(String(u));
  return _x.apply(this,args);
};
if(navigator.sendBeacon){var _sb=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=function(u,d){return _sb(px(u),d);};}
var _ps=history.pushState.bind(history),_rs=history.replaceState.bind(history);
history.pushState=function(s,t,u){_ps(s,t,u?px(u):u);try{if(u){var _a=new URL(px(u),T);_wn(_a.searchParams.get('u')||String(u));}}catch(e){}};
history.replaceState=function(s,t,u){_rs(s,t,u?px(u):u);try{if(u){var _a=new URL(px(u),T);_wn(_a.searchParams.get('u')||String(u));}}catch(e){}};
try{var lp=Object.getPrototypeOf(location),ld=Object.getOwnPropertyDescriptor(lp,'href');
if(ld&&ld.set){var _h=ld.set;Object.defineProperty(lp,'href',Object.assign({},ld,{set:function(v){_h.call(this,px(v));}}));}}catch(e){}
try{var _la=Location.prototype.assign,_lr=Location.prototype.replace;
Location.prototype.assign=function(u){return _la.call(this,px(u));};
Location.prototype.replace=function(u){return _lr.call(this,px(u));};}catch(e){}
var _wo=window.open;window.open=function(u){return _wo.apply(this,[u?px(u):u].concat([].slice.call(arguments,1)));};
var _sa=HTMLElement.prototype.setAttribute;
HTMLElement.prototype.setAttribute=function(n,v){
  if(typeof v==='string'&&/^(src|href|data-src|data-href|data-lazy-src)$/i.test(n))v=px(v);
  return _sa.call(this,n,v);
};
var _ce=document.createElement.bind(document);
document.createElement=function(tag){
  var el=_ce(tag),t=(tag||'').toLowerCase();
  if('script img audio video source iframe link'.indexOf(t)!==-1){
    ['src','href'].forEach(function(a){
      try{Object.defineProperty(el,a,{configurable:true,
        get:function(){return el.getAttribute(a)||'';},
        set:function(v){el.setAttribute(a,px(v));}});}catch(e){}
    });
  }
  return el;
};
function rwHtml(h){
  if(typeof h!=='string')return h;
  h=h.replace(/(\s(?:src|href|action)\s*=\s*")([^"]*)/gi,function(_,a,v){return a+px(v);});
  h=h.replace(/(\s(?:src|href|action)\s*=\s*')([^']*)/gi,function(_,a,v){return a+px(v);});
  return h;
}
try{var _ihd=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
if(_ihd&&_ihd.set){Object.defineProperty(Element.prototype,'innerHTML',{configurable:true,get:_ihd.get,set:function(v){_ihd.set.call(this,rwHtml(v));}});}}catch(e){}
try{var _iah=Element.prototype.insertAdjacentHTML;
Element.prototype.insertAdjacentHTML=function(p,h){return _iah.call(this,p,rwHtml(h));};}catch(e){}
var _WS=window.WebSocket;
window.WebSocket=function(u,p){
  try{var a=new URL(u);if(a.origin!==W){var ws=W.replace(/^http/,'ws')+'/?u='+encodeURIComponent(u);return p?new _WS(ws,p):new _WS(ws);}}catch(e){}
  return p?new _WS(u,p):new _WS(u);
};
window.WebSocket.prototype=_WS.prototype;
window.WebSocket.CONNECTING=0;window.WebSocket.OPEN=1;window.WebSocket.CLOSING=2;window.WebSocket.CLOSED=3;
try{Object.defineProperty(location,'ancestorOrigins',{get:function(){return [];},configurable:true});}catch(e){}
if(document.hasStorageAccess){document.hasStorageAccess=function(){return Promise.resolve(true);};}
if(document.requestStorageAccess){document.requestStorageAccess=function(){return Promise.resolve();};}
if('serviceWorker'in navigator){navigator.serviceWorker.register=function(){return Promise.reject(new Error('sw-blocked'));};try{navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}catch(e){}}
try{Object.defineProperty(navigator,'onLine',{get:function(){return true;}});}catch(e){}
})();
<\/script>`, { html: true })
  }
}

function splitSetCookie(str) {
  if (!str) return []
  const cookies = []
  let cur = ''
  for (let i = 0; i < str.length; i++) {
    if (str[i] === ',') {
      const lower = cur.toLowerCase()
      if (lower.includes('expires=') && !lower.slice(lower.lastIndexOf('expires=')).includes('gmt') && !lower.slice(lower.lastIndexOf('expires=')).includes('utc')) {
        cur += ','
      } else {
        if (cur.trim()) cookies.push(cur.trim())
        cur = ''
      }
    } else {
      cur += str[i]
    }
  }
  if (cur.trim()) cookies.push(cur.trim())
  return cookies
}

function rewriteSetCookie(cookie) {
  if (!cookie || typeof cookie !== 'string') return ''
  return cookie
    .replace(/;\s*domain=[^;]*/gi, '')
    .replace(/;\s*samesite=[^;]*/gi, '')
    .replace(/;\s*secure/gi, '')
    .trim()
    + '; SameSite=None; Secure; Partitioned'
}

function landing() {
  return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WOS</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{width:460px;padding:36px;background:#161b22;border:1px solid rgba(255,255,255,.1);border-radius:12px}h1{font-size:18px;font-weight:600;margin-bottom:6px}p{font-size:13px;color:#8b949e;margin-bottom:24px}form{display:flex;gap:8px}input{flex:1;padding:10px 14px;background:#21262d;border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e6edf3;font-size:14px;outline:none}button{padding:10px 20px;background:#0078d4;border:none;border-radius:8px;color:#fff;font-size:14px;cursor:pointer}</style>
</head><body><div class="card"><h1>WOS</h1><p>Enter a URL to browse.</p>
<form onsubmit="go(event)"><input id="u" placeholder="https://..." autofocus autocomplete="off" spellcheck="false"><button>Go</button></form>
</div><script>function go(e){e.preventDefault();var u=document.getElementById('u').value.trim();if(!u)return;if(!/^https?:\/\//.test(u))u='https://'+u;location.href='/?u='+encodeURIComponent(u);}<\/script></body></html>`,
  { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
