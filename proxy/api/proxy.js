// WOS Proxy — Vercel Serverless Function
const https = require('https')
const http = require('http')
const zlib = require('zlib')
const { URL } = require('url')

const SKIP_RESP = new Set([
  'content-security-policy', 'content-security-policy-report-only',
  'x-frame-options', 'content-encoding', 'transfer-encoding',
  'connection', 'keep-alive', 'strict-transport-security',
  'x-content-type-options', 'alt-svc',
])

const SKIP_REQ = new Set([
  'host', 'connection', 'keep-alive', 'upgrade-insecure-requests',
  'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry',
])

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
    'access-control-allow-headers': '*',
    'access-control-expose-headers': '*',
  }
}

function refererTarget(req, reqUrl) {
  const ref = req.headers['referer']
  if (!ref) return null
  try {
    const refUrl = new URL(ref)
    const base = refUrl.searchParams.get('u')
    if (!base) return null
    const baseUrl = new URL(base)
    return baseUrl.origin + reqUrl.pathname + reqUrl.search
  } catch { return null }
}

function rewriteUrl(v, targetUrl, workerOrigin) {
  if (!v) return v
  if (v.startsWith('#') || v.startsWith('data:') || v.startsWith('javascript:') ||
      v.startsWith('mailto:') || v.startsWith('blob:')) return v
  try {
    const abs = new URL(v, targetUrl).toString()
    return `${workerOrigin}/?u=${encodeURIComponent(abs)}`
  } catch { return v }
}

function rewriteHtml(html, targetUrl, workerOrigin) {
  html = html.replace(/<base[^>]*>/gi, '')
  html = html.replace(/(\s(?:href|src|action)\s*=\s*)(['"])([^'"]*)\2/gi, (m, pre, q, v) => {
    return pre + q + rewriteUrl(v, targetUrl, workerOrigin) + q
  })
  html = html.replace(/(\ssrcset\s*=\s*)(['"])([^'"]+)\2/gi, (m, pre, q, v) => {
    const out = v.replace(/([^\s,]+)(\s+[^,]+)?/g, (sm, u, d) => {
      try { return `${workerOrigin}/?u=${encodeURIComponent(new URL(u.trim(), targetUrl).toString())}${d ?? ''}` }
      catch { return sm }
    })
    return pre + q + out + q
  })
  const inject = buildInjectScript(workerOrigin, targetUrl.origin)
  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, inject + '</head>')
  else if (/<body/i.test(html)) html = html.replace(/<body/i, inject + '<body')
  else html = inject + html
  return html
}

function rewriteCss(css, targetUrl, workerOrigin) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
    if (u.startsWith('data:') || u.startsWith('#')) return m
    try { return `url("${workerOrigin}/?u=${encodeURIComponent(new URL(u, targetUrl).toString())}")` }
    catch { return m }
  })
}

function buildInjectScript(W, T) {
  W = JSON.stringify(W); T = JSON.stringify(T)
  return `<script>(function(){var W=${W},T=${T};function px(u,base){if(!u||typeof u!=='string')return u;if(u.startsWith('#')||u.startsWith('data:')||u.startsWith('javascript:')||u.startsWith('blob:'))return u;try{var a=new URL(u,base||T);if(a.origin===W)return u;return W+'/?u='+encodeURIComponent(a.toString());}catch(e){return u;}}var _f=window.fetch;window.fetch=function(u,o){return _f.call(this,typeof u==='string'?px(u):u,o);};var _xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){arguments[1]=px(String(u));return _xo.apply(this,arguments);};if(navigator.sendBeacon){var _sb=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=function(u,d){return _sb(px(u),d);};}var _ps=history.pushState.bind(history),_rs=history.replaceState.bind(history);history.pushState=function(s,t,u){_ps(s,t,u?px(u):u);};history.replaceState=function(s,t,u){_rs(s,t,u?px(u):u);};var _wo=window.open;window.open=function(u){return _wo.apply(this,[u?px(u):u].concat([].slice.call(arguments,1)));};try{var _la=location.assign.bind(location),_lr=location.replace.bind(location);location.assign=function(u){_la(px(u));};location.replace=function(u){_lr(px(u));};}catch(e){}try{var lp=Object.getPrototypeOf(location),ld=Object.getOwnPropertyDescriptor(lp,'href');if(ld&&ld.set){var os=ld.set;Object.defineProperty(lp,'href',Object.assign({},ld,{set:function(v){os.call(this,px(v));}}));}}catch(e){}var _ce=document.createElement.bind(document);document.createElement=function(tag){var el=_ce(tag),t=(tag||'').toLowerCase();if('script img audio video source iframe link'.indexOf(t)!==-1){['src','href'].forEach(function(attr){try{Object.defineProperty(el,attr,{configurable:true,get:function(){return el.getAttribute(attr)||'';},set:function(v){el.setAttribute(attr,px(v));}});}catch(e){}});}return el;};})();<\/script>`
}

async function getBody(resp) {
  return new Promise((resolve, reject) => {
    let stream = resp
    const enc = (resp.headers['content-encoding'] || '').toLowerCase()
    if (enc === 'gzip') stream = resp.pipe(zlib.createGunzip())
    else if (enc === 'br') stream = resp.pipe(zlib.createBrotliDecompress())
    else if (enc === 'deflate') stream = resp.pipe(zlib.createInflate())
    const chunks = []
    stream.on('data', c => chunks.push(c))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    stream.on('error', reject)
  })
}

function doFetch(targetUrl, method, headers, bodyStream) {
  return new Promise((resolve, reject) => {
    const lib = targetUrl.protocol === 'https:' ? https : http
    const opts = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method,
      headers,
      timeout: 8000,
    }
    const preq = lib.request(opts, resolve)
    preq.on('error', reject)
    preq.on('timeout', () => { preq.destroy(); reject(new Error('Request timed out')) })
    if (!['GET', 'HEAD'].includes(method) && bodyStream) bodyStream.pipe(preq)
    else preq.end()
  })
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v))
    res.status(204).end()
    return
  }

  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers['host']
  const workerOrigin = `${proto}://${host}`

  let reqUrl
  try { reqUrl = new URL(req.url, `${proto}://${host}`) }
  catch { res.status(400).send('Bad request URL'); return }

  if (reqUrl.pathname === '/health') { res.send('ok'); return }

  let target = reqUrl.searchParams.get('u')
  if (!target && reqUrl.pathname !== '/') target = refererTarget(req, reqUrl)

  if (!target) {
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.send(landing())
    return
  }

  if (!target.startsWith('http')) target = 'https://' + target

  let targetUrl
  try { targetUrl = new URL(target) }
  catch { res.status(400).send('Invalid target URL'); return }

  const outHeaders = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (!SKIP_REQ.has(k.toLowerCase())) outHeaders[k] = v
  }
  outHeaders['host'] = targetUrl.host
  outHeaders['origin'] = targetUrl.origin
  outHeaders['referer'] = targetUrl.href

  let resp
  try { resp = await doFetch(targetUrl, req.method, outHeaders, req) }
  catch (e) { res.status(502).send(`Proxy error: ${e.message}`); return }

  if (resp.statusCode >= 300 && resp.statusCode < 400) {
    const loc = resp.headers['location']
    if (loc) {
      const abs = new URL(loc, targetUrl).toString()
      res.redirect(resp.statusCode, `${workerOrigin}/?u=${encodeURIComponent(abs)}`)
      return
    }
  }

  const rh = {}
  for (const [k, v] of Object.entries(resp.headers)) {
    if (!SKIP_RESP.has(k.toLowerCase())) rh[k] = v
  }
  Object.assign(rh, corsHeaders())

  const ct = resp.headers['content-type'] || ''

  if (ct.includes('text/html')) {
    try {
      const body = await getBody(resp)
      const out = rewriteHtml(body, targetUrl, workerOrigin)
      delete rh['content-encoding']
      rh['content-type'] = 'text/html; charset=utf-8'
      rh['content-length'] = Buffer.byteLength(out).toString()
      Object.entries(rh).forEach(([k, v]) => res.setHeader(k, v))
      res.status(resp.statusCode).send(out)
    } catch (e) { res.status(502).send(`HTML rewrite error: ${e.message}`) }
    return
  }

  if (ct.includes('text/css')) {
    try {
      const body = await getBody(resp)
      const out = rewriteCss(body, targetUrl, workerOrigin)
      delete rh['content-encoding']
      rh['content-length'] = Buffer.byteLength(out).toString()
      Object.entries(rh).forEach(([k, v]) => res.setHeader(k, v))
      res.status(resp.statusCode).send(out)
    } catch (e) { res.status(502).send(`CSS rewrite error: ${e.message}`) }
    return
  }

  Object.entries(rh).forEach(([k, v]) => res.setHeader(k, v))
  res.status(resp.statusCode)
  resp.pipe(res)
}

function landing() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WOS Proxy</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{width:460px;padding:36px;background:#161b22;border:1px solid rgba(255,255,255,0.1);border-radius:12px}h1{font-size:18px;font-weight:600;margin-bottom:6px}p{font-size:13px;color:#8b949e;margin-bottom:24px}form{display:flex;gap:8px}input{flex:1;padding:10px 14px;background:#21262d;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#e6edf3;font-size:14px;outline:none}button{padding:10px 20px;background:#0078d4;border:none;border-radius:8px;color:#fff;font-size:14px;cursor:pointer}</style></head><body><div class="card"><h1>WOS</h1><p>Enter a URL to browse.</p><form onsubmit="go(event)"><input id="u" placeholder="https://..." autofocus autocomplete="off" spellcheck="false"><button>Go</button></form></div><script>function go(e){e.preventDefault();var u=document.getElementById('u').value.trim();if(!u)return;if(!u.match(/^https?:\/\//))u='https://'+u;location.href='/?u='+encodeURIComponent(u);}<\/script></body></html>`
}
