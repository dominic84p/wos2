'use strict'
const express   = require('express')
const http      = require('http')
const https     = require('https')
const zlib      = require('zlib')
const { URL }   = require('url')
const WebSocket = require('ws')

const app    = express()
const server = http.createServer(app)
const wss    = new WebSocket.Server({ noServer: true })
const PORT   = process.env.PORT || 8080

const SKIP_RESP = new Set([
  'content-security-policy','content-security-policy-report-only',
  'x-frame-options','strict-transport-security','x-content-type-options','alt-svc',
  'transfer-encoding','keep-alive','connection','te','trailers','upgrade',
])
const SKIP_REQ = new Set([
  'host','connection','keep-alive','upgrade-insecure-requests',
  'cf-connecting-ip','cf-ray','cf-visitor','cf-ipcountry',
])

function cors() {
  return {
    'access-control-allow-origin':  '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD',
    'access-control-allow-headers': '*',
    'access-control-expose-headers':'*',
  }
}

// ── fetch ────────────────────────────────────────────────────────────────────
function doFetch(targetUrl, method, headers, body) {
  return new Promise((resolve, reject) => {
    const lib  = targetUrl.protocol === 'https:' ? https : http
    const req  = lib.request({
      hostname: targetUrl.hostname,
      port:     targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path:     targetUrl.pathname + targetUrl.search,
      method, headers, timeout: 20000,
    }, resolve)
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    if (body && !['GET','HEAD'].includes(method)) {
      Buffer.isBuffer(body) ? (req.write(body), req.end()) : body.pipe(req)
    } else {
      req.end()
    }
  })
}

// follow redirects, return { resp, finalUrl }
async function fetch_(url, method, headers, body, depth = 0) {
  if (depth > 8) throw new Error('Too many redirects')
  const tu   = new URL(url)
  const hdrs = Object.assign({}, headers)
  hdrs['host']   = tu.host
  hdrs['origin'] = tu.origin
  // Decode proxied referer back to real URL so upstream sees correct referer
  try {
    const rUrl = new URL(hdrs['referer'] || '')
    hdrs['referer'] = rUrl.searchParams.get('u') || tu.href
  } catch { hdrs['referer'] = tu.href }
  delete hdrs['content-encoding']
  const resp = await doFetch(tu, method, hdrs, body)
  if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers['location']) {
    resp.resume()
    return fetch_(new URL(resp.headers['location'], url).toString(), 'GET', headers, null, depth + 1)
  }
  return { resp, finalUrl: tu }
}

function bufferDecompress(resp) {
  return new Promise((resolve, reject) => {
    const enc = (resp.headers['content-encoding'] || '').toLowerCase()
    let s = resp
    if      (enc === 'gzip')    s = resp.pipe(zlib.createGunzip())
    else if (enc === 'br')      s = resp.pipe(zlib.createBrotliDecompress())
    else if (enc === 'deflate') s = resp.pipe(zlib.createInflate())
    const chunks = []
    s.on('data', c => chunks.push(c))
    s.on('end',  () => resolve(Buffer.concat(chunks)))
    s.on('error', reject)
  })
}

function refererTarget(req, reqUrl) {
  try {
    const ref  = new URL(req.headers['referer'])
    const base = ref.searchParams.get('u')
    if (!base) return null
    return new URL(base).origin + reqUrl.pathname + reqUrl.search
  } catch { return null }
}

// ── URL rewriter ─────────────────────────────────────────────────────────────
function px(v, base, proxy) {
  if (!v) return v
  if (/^(#|data:|javascript:|mailto:|blob:)/.test(v)) return v
  try { return `${proxy}/?u=${encodeURIComponent(new URL(v, base).toString())}` }
  catch { return v }
}

function rewriteHtml(html, targetUrl, proxyOrigin) {
  // remove base tags
  html = html.replace(/<base[^>]*>/gi, '')
  // rewrite href/src/action/data-src attributes
  html = html.replace(/(\s(?:href|src|action|data-src|data-href|data-lazy-src)\s*=\s*)(['"])([^'"]*)\2/gi,
    (_, pre, q, v) => pre + q + px(v, targetUrl, proxyOrigin) + q)
  // rewrite srcset
  html = html.replace(/(\ssrcset\s*=\s*)(['"])([^'"]+)\2/gi, (_, pre, q, v) => {
    const out = v.replace(/([^\s,]+)(\s+[^,]+)?/g, (m, u, d) => {
      try { return `${proxyOrigin}/?u=${encodeURIComponent(new URL(u.trim(), targetUrl))}${d ?? ''}` }
      catch { return m }
    })
    return pre + q + out + q
  })
  // inject patches before </head>
  const inj = inject(proxyOrigin, targetUrl.href)
  if (/<\/head>/i.test(html))    return html.replace(/<\/head>/i,    inj + '</head>')
  if (/<body[\s>]/i.test(html))  return html.replace(/<body[\s>]/i,  m => inj + m)
  return inj + html
}

function rewriteCss(css, base, proxy) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
    if (/^(data:|#)/.test(u)) return m
    try { return `url("${proxy}/?u=${encodeURIComponent(new URL(u, base))}")` }
    catch { return m }
  })
}

// ── Injected JS — minimal, just patches fetch/XHR/WS/location ───────────────
function inject(W, T) {
  W = JSON.stringify(W); T = JSON.stringify(T)
  return `<script>
(function(){
var W=${W},T=${T};
var _rp=(function(){try{return window.parent!==window?window.parent:null;}catch(e){return null;}})();
try{Object.defineProperty(window,'top',{get:function(){return window;},configurable:true});}catch(e){}
try{Object.defineProperty(window,'parent',{get:function(){return window;},configurable:true});}catch(e){}
try{Object.defineProperty(window,'frameElement',{get:function(){return null;},configurable:true});}catch(e){}
function _wn(u){try{if(_rp)_rp.postMessage({__wos:'nav',url:u},'*');}catch(e){}}
_wn(T);
function px(u,b){
  if(!u||typeof u!=='string')return u;
  if(/^(#|data:|javascript:|blob:|mailto:)/.test(u))return u;
  try{var a=new URL(u,b||T);if(a.origin===W)return u;return W+'/?u='+encodeURIComponent(a.toString());}catch(e){return u;}
}
var _f=window.fetch;
window.fetch=function(u,o){
  if(typeof u==='string')u=px(u);
  else if(u&&u.url){try{u=new Request(px(u.url),u);}catch(e){}}
  return _f.call(this,u,o);
};
var _x=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){arguments[1]=px(String(u));return _x.apply(this,arguments);};
if(navigator.sendBeacon){var _sb=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=function(u,d){return _sb(px(u),d);};}
var _ps=history.pushState.bind(history),_rs=history.replaceState.bind(history);
history.pushState=function(s,t,u){_ps(s,t,u?px(u):u);try{if(u){var _a=new URL(px(u),T);_wn(_a.searchParams.get('u')||String(u));}}catch(e){}};
history.replaceState=function(s,t,u){_rs(s,t,u?px(u):u);try{if(u){var _a=new URL(px(u),T);_wn(_a.searchParams.get('u')||String(u));}}catch(e){}};
try{var lp=Object.getPrototypeOf(location),ld=Object.getOwnPropertyDescriptor(lp,'href');
if(ld&&ld.set){var _h=ld.set;Object.defineProperty(lp,'href',Object.assign({},ld,{set:function(v){_h.call(this,px(v));}}));}}catch(e){}
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
  return typeof h!=='string'?h:h.replace(/(\s(?:src|href|action)\s*=\s*)(['"])([^'"]*)\2/gi,function(_,a,q,v){return a+q+px(v)+q;});
}
try{var _ihd=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
if(_ihd&&_ihd.set){Object.defineProperty(Element.prototype,'innerHTML',{configurable:true,get:_ihd.get,set:function(v){_ihd.set.call(this,rwHtml(v));}});}}catch(e){}
try{var _iah=Element.prototype.insertAdjacentHTML;
Element.prototype.insertAdjacentHTML=function(p,h){return _iah.call(this,p,rwHtml(h));};}catch(e){}
try{var _la=Location.prototype.assign,_lr=Location.prototype.replace;
Location.prototype.assign=function(u){return _la.call(this,px(u));};
Location.prototype.replace=function(u){return _lr.call(this,px(u));};}catch(e){}
var _WS=window.WebSocket;
window.WebSocket=function(u,p){
  try{var a=new URL(u);if(a.origin!==W){var ws=W.replace(/^http/,'ws')+'/?u='+encodeURIComponent(u);return p?new _WS(ws,p):new _WS(ws);}}catch(e){}
  return p?new _WS(u,p):new _WS(u);
};
window.WebSocket.prototype=_WS.prototype;
window.WebSocket.CONNECTING=0;window.WebSocket.OPEN=1;window.WebSocket.CLOSING=2;window.WebSocket.CLOSED=3;
if('serviceWorker'in navigator){navigator.serviceWorker.register=function(){return Promise.reject(new Error('sw-blocked'));};try{navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}catch(e){}}
try{Object.defineProperty(navigator,'onLine',{get:function(){return true;}});}catch(e){}
})();
<\/script>`
}

// ── HTTP proxy ────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.send('ok'))
app.get('/ping',   (_, res) => res.send('pong'))

app.use(async (req, res) => {
  if (req.method === 'OPTIONS') {
    Object.entries(cors()).forEach(([k,v]) => res.setHeader(k,v))
    res.status(204).end(); return
  }

  const proto       = req.headers['x-forwarded-proto'] || 'http'
  const host        = req.headers['x-forwarded-host']  || req.headers['host']
  const proxyOrigin = `${proto}://${host}`

  // Bare-path connectivity pings (no ?u=, no referer needed)
  if (/\/generate_204($|\?)/.test(req.url)) {
    Object.entries(cors()).forEach(([k,v]) => res.setHeader(k,v))
    res.status(204).end(); return
  }

  let reqUrl
  try { reqUrl = new URL(req.url, `${proto}://${host}`) }
  catch {
    try { reqUrl = new URL(req.url.replace(/[{}|\\^`\s]/g, c => encodeURIComponent(c)), `${proto}://${host}`) }
    catch { Object.entries(cors()).forEach(([k,v]) => res.setHeader(k,v)); res.status(200).end(); return }
  }

  let target = reqUrl.searchParams.get('u')
  if (!target && reqUrl.pathname !== '/') target = refererTarget(req, reqUrl)
  if (!target) { res.setHeader('content-type','text/html;charset=utf-8').send(landing()); return }
  if (!target.startsWith('http')) target = 'https://' + target

  // Also intercept when generate_204 comes through as a proxied target URL
  if (/\/generate_204($|\?)/.test(target)) {
    Object.entries(cors()).forEach(([k,v]) => res.setHeader(k,v))
    res.status(204).end(); return
  }

  const outHdrs = {}
  for (const [k,v] of Object.entries(req.headers)) {
    if (!SKIP_REQ.has(k.toLowerCase())) outHdrs[k] = v
  }

  let resp, finalUrl
  try {
    ;({ resp, finalUrl } = await fetch_(target, req.method, outHdrs, req))
  } catch (e) { res.status(502).send(`Proxy error: ${e.message}`); return }

  // Build response headers — only strip security headers, keep everything else
  const rh = {}
  for (const [k,v] of Object.entries(resp.headers)) {
    if (!SKIP_RESP.has(k.toLowerCase())) rh[k] = v
  }
  Object.assign(rh, cors())

  const ct = (resp.headers['content-type'] || '').toLowerCase()

  // HTML — decompress, rewrite, re-serve uncompressed
  if (ct.includes('text/html')) {
    try {
      const body = await bufferDecompress(resp)
      const out  = rewriteHtml(body.toString('utf8'), finalUrl, proxyOrigin)
      const buf  = Buffer.from(out, 'utf8')
      delete rh['content-encoding']
      rh['content-type']   = 'text/html;charset=utf-8'
      rh['content-length'] = buf.length.toString()
      Object.entries(rh).forEach(([k,v]) => res.setHeader(k,v))
      res.status(resp.statusCode).end(buf)
    } catch (e) { res.status(502).send('HTML error: ' + e.message) }
    return
  }

  // CSS — decompress, rewrite URLs, re-serve uncompressed
  if (ct.includes('text/css')) {
    try {
      const body = await bufferDecompress(resp)
      const out  = rewriteCss(body.toString('utf8'), finalUrl, proxyOrigin)
      const buf  = Buffer.from(out, 'utf8')
      delete rh['content-encoding']
      rh['content-length'] = buf.length.toString()
      Object.entries(rh).forEach(([k,v]) => res.setHeader(k,v))
      res.status(resp.statusCode).end(buf)
    } catch (e) { res.status(502).send('CSS error: ' + e.message) }
    return
  }

  // Everything else — pipe through completely untouched
  // Browser handles decompression natively via content-encoding header
  Object.entries(rh).forEach(([k,v]) => res.setHeader(k,v))
  res.status(resp.statusCode)
  resp.pipe(res)
})

// ── WebSocket proxy ───────────────────────────────────────────────────────────
server.on('upgrade', (req, socket, head) => {
  const target = new URL(req.url, 'http://x').searchParams.get('u')
  if (!target) { socket.destroy(); return }
  try {
    const remote = new WebSocket(target, { headers: { 'user-agent': req.headers['user-agent'] || '' } })
    remote.on('open', () => {
      wss.handleUpgrade(req, socket, head, client => {
        const pipe = (a, b) => a.on('message', (d, bin) => b.readyState === 1 && b.send(d, { binary: bin }))
        pipe(client, remote); pipe(remote, client)
        client.on('close', () => remote.readyState < 2 && remote.close())
        remote.on('close', () => client.readyState < 2 && client.close())
        client.on('error', () => {}); remote.on('error', () => {})
      })
    })
    remote.on('error', () => socket.destroy())
  } catch { socket.destroy() }
})

// ── Landing ───────────────────────────────────────────────────────────────────
function landing() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WOS</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{width:460px;padding:36px;background:#161b22;border:1px solid rgba(255,255,255,.1);border-radius:12px}h1{font-size:18px;font-weight:600;margin-bottom:6px}p{font-size:13px;color:#8b949e;margin-bottom:24px}form{display:flex;gap:8px}input{flex:1;padding:10px 14px;background:#21262d;border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e6edf3;font-size:14px;outline:none}button{padding:10px 20px;background:#0078d4;border:none;border-radius:8px;color:#fff;font-size:14px;cursor:pointer}</style>
</head><body><div class="card"><h1>WOS</h1><p>Enter a URL to browse.</p>
<form onsubmit="go(event)"><input id="u" placeholder="https://..." autofocus autocomplete="off" spellcheck="false"><button>Go</button></form>
</div><script>function go(e){e.preventDefault();var u=document.getElementById('u').value.trim();if(!u)return;if(!/^https?:\/\//.test(u))u='https://'+u;location.href='/?u='+encodeURIComponent(u);}<\/script></body></html>`
}

server.listen(PORT, () => console.log(`WOS Proxy on :${PORT}`))
