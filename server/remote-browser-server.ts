import { chromium, type Browser, type BrowserContext, type Page, type CDPSession } from 'playwright-core'
import { WebSocketServer, type WebSocket } from 'ws'
import http from 'node:http'

interface ClientInitMessage {
  type: 'init'
  width?: number
  height?: number
  url?: string
}

interface ClientNavigateMessage {
  type: 'navigate'
  url: string
}

interface ClientResizeMessage {
  type: 'resize'
  width: number
  height: number
}

interface ClientMouseMessage {
  type: 'mouse'
  action: 'move' | 'down' | 'up'
  x: number
  y: number
  button?: number
}

interface ClientWheelMessage {
  type: 'wheel'
  deltaX: number
  deltaY: number
  x: number
  y: number
}

interface ClientKeyMessage {
  type: 'key'
  action: 'down' | 'up'
  key: string
  code: string
  keyCode?: number
  text?: string
}

type ClientMessage =
  | ClientInitMessage
  | ClientNavigateMessage
  | ClientResizeMessage
  | ClientMouseMessage
  | ClientWheelMessage
  | ClientKeyMessage
  | { type: 'goBack' | 'goForward' | 'reload' }

import fs from 'node:fs'

const PORT = Number(process.env.PORT) || 8080
const MAX_IDLE_MS = 5 * 60 * 1000 // 5 minutes idle cleanup

// Global Shared Chromium Instance
let browserInstance: Browser | null = null

function getChromiumPath(): string | undefined {
  const paths = [
    '/home/gemini/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
    '/root/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return undefined
}

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    const execPath = getChromiumPath()
    console.log(`🚀 Launching High-Performance Chromium Engine (Executable: ${execPath || 'playwright-default'})...`)
    browserInstance = await chromium.launch({
      headless: true,
      executablePath: execPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu-sandbox',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--mute-audio=false',
        '--autoplay-policy=no-user-gesture-required',
      ],
    })
    console.log('✅ Chromium Engine active and ready!')
  }
  return browserInstance
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'ok', runtime: 'TypeScript / Bun', service: 'WOS Ultra-Efficient Remote Browser Server', uptime: process.uptime() }))
})

const wss = new WebSocketServer({ server })

wss.on('connection', async (ws: WebSocket) => {
  let context: BrowserContext | null = null
  let page: Page | null = null
  let cdp: CDPSession | null = null
  let isStreaming = false
  let idleTimer: any = null
  let currentWidth = 1280
  let currentHeight = 720

  function resetIdle(): void {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      console.log('💤 User idle timeout - tearing down page context')
      cleanup()
      ws.close()
    }, MAX_IDLE_MS)
  }

  async function initSession(): Promise<void> {
    try {
      const browser = await getBrowser()
      context = await browser.newContext({
        viewport: { width: currentWidth, height: currentHeight },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        deviceScaleFactor: 1,
        hasTouch: false,
        locale: 'en-US',
      })

      page = await context.newPage()
      cdp = await context.newCDPSession(page)

      // Listen for CDP Screencast Frames
      cdp.on('Page.screencastFrame', async ({ data, sessionId, metadata }: { data: string; sessionId: number; metadata: any }) => {
        try {
          cdp?.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
          if (ws.readyState === ws.OPEN) {
            // Pack metadata and binary frame
            const frameBuffer = Buffer.from(data, 'base64')
            const metaHeader = Buffer.from(JSON.stringify({
              type: 'frame',
              offsetTop: metadata.offsetTop || 0,
              pageScaleFactor: metadata.pageScaleFactor || 1,
              deviceWidth: metadata.deviceWidth || currentWidth,
              deviceHeight: metadata.deviceHeight || currentHeight,
            }) + '\n', 'utf-8')

            const combined = Buffer.concat([metaHeader, frameBuffer])
            ws.send(combined, { binary: true })
          }
        } catch {}
      })

      // Sync Navigation & Title changes to client
      page.on('load', () => {
        if (page) sendJson({ type: 'nav', url: page.url(), title: '' })
      })

      page.on('domcontentloaded', async () => {
        try {
          if (page) {
            const title = await page.title()
            sendJson({ type: 'nav', url: page.url(), title })
          }
        } catch {}
      })

      await startScreencast()
      sendJson({ type: 'ready' })
    } catch (err: any) {
      console.error('Session init error:', err)
      sendJson({ type: 'error', message: err.message })
    }
  }

  async function startScreencast(): Promise<void> {
    if (!cdp || isStreaming) return
    isStreaming = true
    try {
      await cdp.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 80,
        maxWidth: currentWidth,
        maxHeight: currentHeight,
        everyNthFrame: 1,
      })
    } catch (e) {
      console.warn('Start screencast error:', e)
    }
  }

  function sendJson(obj: Record<string, any>): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(obj))
    }
  }

  async function cleanup(): Promise<void> {
    clearTimeout(idleTimer)
    try {
      if (cdp) await cdp.detach().catch(() => {})
      if (page) await page.close().catch(() => {})
      if (context) await context.close().catch(() => {})
    } catch {}
    cdp = null
    page = null
    context = null
  }

  ws.on('message', async (message: Buffer) => {
    resetIdle()
    try {
      const msg: ClientMessage = JSON.parse(message.toString())

      switch (msg.type) {
        case 'init':
          if (msg.width) currentWidth = Math.max(320, Math.min(2560, msg.width))
          if (msg.height) currentHeight = Math.max(240, Math.min(1440, msg.height))
          await initSession()
          if (msg.url && page) {
            await page.goto(msg.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
          }
          break

        case 'navigate':
          if (page && msg.url) {
            let u = msg.url.trim()
            if (!u.startsWith('http://') && !u.startsWith('https://')) {
              u = u.includes(' ') || !u.includes('.')
                ? `https://duckduckgo.com/?q=${encodeURIComponent(u)}`
                : 'https://' + u
            }
            sendJson({ type: 'loading', loading: true })
            await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => {
              sendJson({ type: 'error', message: e.message })
            })
            sendJson({ type: 'loading', loading: false })
          }
          break

        case 'goBack':
          if (page) await page.goBack().catch(() => {})
          break

        case 'goForward':
          if (page) await page.goForward().catch(() => {})
          break

        case 'reload':
          if (page) await page.reload().catch(() => {})
          break

        case 'resize':
          if (msg.width && msg.height) {
            currentWidth = Math.max(320, Math.min(2560, msg.width))
            currentHeight = Math.max(240, Math.min(1440, msg.height))
            if (page) {
              await page.setViewportSize({ width: currentWidth, height: currentHeight }).catch(() => {})
              if (cdp) {
                await cdp.send('Page.stopScreencast').catch(() => {})
                isStreaming = false
                await startScreencast()
              }
            }
          }
          break

        case 'mouse':
          if (cdp && msg.action) {
            const x = Math.round(msg.x || 0)
            const y = Math.round(msg.y || 0)
            const button: 'left' | 'right' | 'middle' = msg.button === 2 ? 'right' : msg.button === 1 ? 'middle' : 'left'

            if (msg.action === 'move') {
              await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }).catch(() => {})
            } else if (msg.action === 'down') {
              await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: 1 }).catch(() => {})
            } else if (msg.action === 'up') {
              await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1 }).catch(() => {})
            }
          }
          break

        case 'wheel':
          if (cdp) {
            await cdp.send('Input.dispatchMouseEvent', {
              type: 'mouseWheel',
              x: Math.round(msg.x || 0),
              y: Math.round(msg.y || 0),
              deltaX: msg.deltaX || 0,
              deltaY: msg.deltaY || 0,
            }).catch(() => {})
          }
          break

        case 'key':
          if (cdp && msg.action) {
            if (msg.action === 'down') {
              await cdp.send('Input.dispatchKeyEvent', {
                type: 'keyDown',
                key: msg.key,
                code: msg.code,
                text: msg.text || (msg.key?.length === 1 ? msg.key : undefined),
                windowsVirtualKeyCode: msg.keyCode,
              }).catch(() => {})
            } else if (msg.action === 'up') {
              await cdp.send('Input.dispatchKeyEvent', {
                type: 'keyUp',
                key: msg.key,
                code: msg.code,
                windowsVirtualKeyCode: msg.keyCode,
              }).catch(() => {})
            }
          }
          break
      }
    } catch (err) {
      console.warn('Incoming message error:', err)
    }
  })

  ws.on('close', cleanup)
  ws.on('error', cleanup)
  resetIdle()
})

server.listen(PORT, () => {
  console.log(`\n======================================================`)
  console.log(`⚡ WOS Remote Chromium Streaming Server is LIVE (TypeScript / Bun)!`)
  console.log(`📡 WebSocket Endpoint: ws://localhost:${PORT}`)
  console.log(`⚡ Ultra-low latency, zero-copy buffer streaming`)
  console.log(`======================================================\n`)
  // Pre-warm master Chromium process
  getBrowser().catch(() => {})
})
