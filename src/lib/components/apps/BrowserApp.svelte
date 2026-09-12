<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Home,
    ShieldCheck,
    ExternalLink,
    EyeOff,
    Cookie,
    Zap,
    Lock,
    X,
    Minus,
    Plus,
    RotateCcw,
    Check,
    MoreVertical,
    Globe,
    Compass,
    SlidersHorizontal,
    Monitor,
    Puzzle,
    Star,
    Menu,
    Share,
    CircleUser,
    Search,
    Sliders,
    Settings,
    Cloud,
    ChevronDown,
    MoreHorizontal,
    Play,
    Pause,
    Pencil,
  } from 'lucide-svelte'
  import { windows } from '../../stores/windows'

  export let windowId: string = ''

  // Firefox Landing Interactive States
  let ffTimerRunning = false
  let ffTimerSeconds = 25 * 60
  let ffTimerInterval: any = null
  let ffTimerMode: 'focus' | 'break' = 'focus'
  let ffShowQrBanner = true
  let ffShowWidgets = true
  let ffWeatherCity = (typeof localStorage !== 'undefined' && localStorage.getItem('wos_ff_weather_city')) || 'New York'
  let ffWeatherTemp = (typeof localStorage !== 'undefined' && localStorage.getItem('wos_ff_weather_temp')) || '21°C'
  let ffWeatherRange = (typeof localStorage !== 'undefined' && localStorage.getItem('wos_ff_weather_range')) || '↑24° ↓17°'

  function editFfWeather() {
    const newCity = prompt('Enter city name for weather widget (or type anything you want):', ffWeatherCity)
    if (newCity !== null && newCity.trim()) {
      ffWeatherCity = newCity.trim()
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('wos_ff_weather_city', ffWeatherCity)
      }
    }
  }

  function toggleFfTimer() {
    ffTimerRunning = !ffTimerRunning
    if (ffTimerRunning) {
      ffTimerInterval = setInterval(() => {
        if (ffTimerSeconds > 0) {
          ffTimerSeconds--
        } else {
          ffTimerRunning = false
          clearInterval(ffTimerInterval)
        }
      }, 1000)
    } else if (ffTimerInterval) {
      clearInterval(ffTimerInterval)
    }
  }

  function formatFfTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  function setFfTimerMode(mode: 'focus' | 'break') {
    ffTimerMode = mode
    ffTimerSeconds = mode === 'focus' ? 25 * 60 : 5 * 60
    if (ffTimerRunning && ffTimerInterval) {
      clearInterval(ffTimerInterval)
      ffTimerRunning = false
    }
  }

  const PROXY_HOST = 'https://learning.dogegage.xyz'

  // Impersonation Theme State: 'wos' | 'chrome' | 'safari' | 'firefox'
  type ImpersonationMode = 'wos' | 'chrome' | 'safari' | 'firefox'
  let impersonationTheme: ImpersonationMode = 
    (typeof localStorage !== 'undefined' && (localStorage.getItem('wos_browser_impersonation') as ImpersonationMode)) || 'wos'

  // Landing Page Look: 'auto' (follow theme) | 'chrome' | 'firefox' | 'safari' | 'wos'
  type LandingStyleMode = 'auto' | 'chrome' | 'firefox' | 'safari' | 'wos'
  let landingStyle: LandingStyleMode = 
    (typeof localStorage !== 'undefined' && (localStorage.getItem('wos_browser_landing_style') as LandingStyleMode)) || 'auto'
  let showLandingCustomizeModal = false

  $: effectiveLandingStyle = landingStyle === 'auto' ? impersonationTheme : landingStyle

  function setLandingStyle(style: LandingStyleMode) {
    landingStyle = style
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wos_browser_landing_style', style)
    }
  }

  function getBrowserName(theme: ImpersonationMode): string {
    switch (theme) {
      case 'chrome': return 'Google Chrome'
      case 'safari': return 'Safari'
      case 'firefox': return 'Mozilla Firefox'
      default: return 'Browser'
    }
  }

  // Window titlebar ONLY shows the browser name (never the website URL)
  function updateBrowserTitle() {
    if (!windowId) return
    const appName = getBrowserName(impersonationTheme)
    windows.setTitle(windowId, appName)
  }

  function setImpersonation(theme: ImpersonationMode) {
    impersonationTheme = theme
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wos_browser_impersonation', theme)
      window.dispatchEvent(new Event('wos_browser_theme_change'))
    }
    updateBrowserTitle()
  }

  // Transport State
  let selectedTransport: string = (typeof localStorage !== 'undefined' && localStorage.getItem('wos_proxy_transport')) || 'libcurl'

  // Multi-Tab State
  interface Tab {
    id: string
    title: string
    url: string
    displayUrl: string
    loading: boolean
  }

  let tabs: Tab[] = [
    {
      id: 'tab_init_1',
      title: 'New Tab',
      url: '',
      displayUrl: '',
      loading: false,
    },
  ]
  let activeTabId: string = 'tab_init_1'
  let iframeRefs: Record<string, HTMLIFrameElement> = {}

  $: activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]

  $: if (impersonationTheme || windowId) {
    updateBrowserTitle()
  }

  // Address Bar URL input
  let addressBarInput: string = ''
  let isEditingUrl: boolean = false

  $: if (!isEditingUrl && activeTab) {
    addressBarInput = activeTab.displayUrl || (activeTab.url.includes(PROXY_HOST) && !activeTab.url.includes('/scramjet/') ? '' : activeTab.displayUrl)
  }

  // Overflow 3-Dot Menu State
  let showThreeDotMenu = false

  // Cookie Importer State
  let showCookieModal = false
  let cookieInput = ''
  let cookieStatusMsg = ''
  let cookieStatusType: 'success' | 'error' | '' = ''

  // Cloaking & Panic State
  interface CloakPreset {
    id: string
    name: string
    title: string
    icon: string
  }

  const CLOAKS: CloakPreset[] = [
    { id: 'none', name: 'Default', title: 'Home', icon: '/favicon.png' },
    { id: 'classroom', name: 'Google Classroom', title: 'Classes', icon: 'https://ssl.gstatic.com/classroom/favicon.png' },
    { id: 'drive', name: 'Google Drive', title: 'My Drive - Google Drive', icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
    { id: 'docs', name: 'Google Docs', title: 'Untitled document - Google Docs', icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
    { id: 'canvas', name: 'Canvas LMS', title: 'Dashboard', icon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico' },
    { id: 'desmos', name: 'Desmos Calculator', title: 'Desmos | Graphing Calculator', icon: 'https://www.desmos.com/favicon.ico' },
    { id: 'edpuzzle', name: 'Edpuzzle', title: 'Edpuzzle', icon: 'https://edpuzzle.imgix.net/favicons/favicon-32.png' },
  ]

  let activeCloak: CloakPreset = CLOAKS[0]
  let showCloakMenu = false
  let panicKey = '`'
  let panicUrl = 'https://classroom.google.com'
  let antiClose = false

  // Render scale / zoom controls
  let renderScale: number = 1.0
  const SCALE_STEPS = [0.5, 0.67, 0.75, 0.85, 0.9, 1.0, 1.1, 1.25, 1.5]

  function zoomOut() {
    const currentIndex = SCALE_STEPS.findIndex((s) => s >= renderScale)
    if (currentIndex > 0) {
      renderScale = SCALE_STEPS[currentIndex - 1]
    } else {
      renderScale = Math.max(0.3, +(renderScale - 0.1).toFixed(2))
    }
  }

  function zoomIn() {
    const currentIndex = SCALE_STEPS.findIndex((s) => s > renderScale)
    if (currentIndex !== -1) {
      renderScale = SCALE_STEPS[currentIndex]
    } else {
      renderScale = Math.min(2.0, +(renderScale + 0.1).toFixed(2))
    }
  }

  function resetZoom() {
    renderScale = 1.0
  }

  function setScale(val: number) {
    renderScale = val
  }

  // Derive clean domain URL for tab title (e.g. tiktok.com instead of page title)
  function deriveFriendlyTitle(input: string): string {
    if (!input) return 'New Tab'
    let target = cleanDisplayUrl(input.trim())
    if (!/^https?:\/\//i.test(target) && !/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i.test(target)) {
      return 'duckduckgo.com'
    }
    try {
      const u = new URL(target.startsWith('http') ? target : 'https://' + target)
      return u.hostname.replace(/^www\./, '')
    } catch {
      return target || 'New Tab'
    }
  }

  // Extract embedded clean domain from iframe DOM or URL
  function tryExtractTabTitle(tabId: string) {
    const frame = iframeRefs[tabId]
    const tab = tabs.find((t) => t.id === tabId)
    if (!frame || !tab) return

    let currentHref = ''
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document
      if (doc && doc.location?.href) {
        currentHref = doc.location.href
      }
    } catch {}

    if (!currentHref) {
      try {
        currentHref = frame.contentWindow?.location?.href || ''
      } catch {
        currentHref = frame.src || ''
      }
    }

    if (currentHref) {
      const clean = cleanDisplayUrl(currentHref)
      const isProxyHome = clean.includes(PROXY_HOST) || clean === 'about:blank' || !clean
      if (!isProxyHome) {
        if (clean !== tab.displayUrl) {
          tab.displayUrl = clean
          if (tab.id === activeTabId && !isEditingUrl) addressBarInput = clean
        }
        const friendly = deriveFriendlyTitle(clean)
        if (friendly && friendly !== tab.title) {
          tab.title = friendly
          tabs = [...tabs]
        }
      }
    }
  }

  async function fetchEmbeddedTitle(targetUrl: string, tabId: string) {
    try {
      const cleanUrl = cleanDisplayUrl(targetUrl)
      if (!cleanUrl || !cleanUrl.startsWith('http')) return
      const proxyFetchUrl = `${PROXY_HOST}/?transport=${selectedTransport}&url=${encodeURIComponent(cleanUrl)}`
      const res = await fetch(proxyFetchUrl, { method: 'GET' })
      if (res.ok) {
        const html = await res.text()
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (match && match[1]) {
          const decoded = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .trim()
          const currentTab = tabs.find((t) => t.id === tabId)
          if (currentTab && decoded && decoded !== 'WOS') {
            currentTab.title = decoded
            tabs = [...tabs]
          }
        }
      }
    } catch {}
  }

  // Multi-Tab Actions
  function addTab(initialTargetUrl?: string) {
    const newId = 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const targetUrl = initialTargetUrl ? `${PROXY_HOST}/?transport=${selectedTransport}&url=${encodeURIComponent(initialTargetUrl)}` : ''
    const display = initialTargetUrl ? cleanDisplayUrl(initialTargetUrl) : ''
    const newTab: Tab = {
      id: newId,
      title: display ? deriveFriendlyTitle(display) : 'New Tab',
      url: targetUrl,
      displayUrl: display,
      loading: !!targetUrl,
    }
    tabs = [...tabs, newTab]
    activeTabId = newId
    addressBarInput = newTab.displayUrl
    if (display.startsWith('http')) {
      fetchEmbeddedTitle(display, newId)
    }
  }

  function switchTab(tabId: string) {
    activeTabId = tabId
    const tab = tabs.find((t) => t.id === tabId)
    if (tab) {
      addressBarInput = tab.displayUrl
    }
  }

  function closeTab(tabId: string, e?: MouseEvent) {
    if (e) e.stopPropagation()
    const index = tabs.findIndex((t) => t.id === tabId)
    if (index === -1) return

    if (tabs.length === 1) {
      const freshId = 'tab_' + Date.now()
      tabs = [
        {
          id: freshId,
          title: 'New Tab',
          url: '',
          displayUrl: '',
          loading: false,
        },
      ]
      activeTabId = freshId
      addressBarInput = ''
      delete iframeRefs[tabId]
      return
    }

    const nextActiveTab = tabId === activeTabId 
      ? (tabs[index + 1] || tabs[index - 1]) 
      : null

    tabs = tabs.filter((t) => t.id !== tabId)
    delete iframeRefs[tabId]

    if (nextActiveTab) {
      switchTab(nextActiveTab.id)
    }
  }

  function cleanDisplayUrl(url: string): string {
    if (!url) return ''
    try {
      let cur = url.trim()
      // Decode DuckDuckGo redirect wrapper immediately
      if (cur.includes('uddg=')) {
        try {
          const u = new URL(cur.startsWith('http') ? cur : 'https://' + cur)
          const uddg = u.searchParams.get('uddg')
          if (uddg) {
            cur = decodeURIComponent(uddg)
          }
        } catch {}
      }
      if (cur.includes('/scramjet/')) {
        const parts = cur.split('/scramjet/')
        const sub = decodeURIComponent(parts[1] || '')
        if (sub.startsWith('http://') || sub.startsWith('https://')) return sub
        if (sub) return 'https://' + sub
      }
      if (cur.includes('?u=') || cur.includes('&u=') || cur.includes('?url=') || cur.includes('&url=')) {
        const parsed = new URL(cur, PROXY_HOST)
        const u = parsed.searchParams.get('u') || parsed.searchParams.get('url')
        if (u) return decodeURIComponent(u)
      }
      if (cur.includes('/uv/service/')) {
        const parts = cur.split('/uv/service/')
        return parts[1] || cur
      }
      if (cur.startsWith('http://') || cur.startsWith('https://')) {
        try {
          const parsed = new URL(cur)
          if (parsed.origin !== new URL(PROXY_HOST).origin) {
            return cur
          }
        } catch {}
      }
      return cur
    } catch {}
    return url
  }

  function buildProxyUrl(rawInput: string): { iframeSrc: string; display: string } {
    let query = rawInput.trim()
    if (!query) {
      return {
        iframeSrc: '',
        display: '',
      }
    }

    let target = query
    const hasProtocol = /^https?:\/\//i.test(query)
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(query)

    if (hasProtocol || isDomain) {
      if (!hasProtocol) target = 'https://' + query
      return {
        iframeSrc: `${PROXY_HOST}/?transport=${selectedTransport}&url=${encodeURIComponent(target)}`,
        display: target,
      }
    }

    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    return {
      iframeSrc: `${PROXY_HOST}/?transport=${selectedTransport}&url=${encodeURIComponent(searchUrl)}`,
      display: query,
    }
  }

  function navigateCurrentTab(inputUrl: string) {
    if (!activeTab) return
    const { iframeSrc, display } = buildProxyUrl(inputUrl)
    activeTab.url = iframeSrc
    activeTab.displayUrl = display
    activeTab.title = deriveFriendlyTitle(display)
    activeTab.loading = true
    tabs = [...tabs]

    const iframe = iframeRefs[activeTab.id]
    if (iframe) {
      iframe.src = iframeSrc
    }
    isEditingUrl = false
    if (display.startsWith('http')) {
      fetchEmbeddedTitle(display, activeTab.id)
    }
  }

  function handleAddressKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      navigateCurrentTab(addressBarInput)
      ;(e.target as HTMLInputElement)?.blur()
    } else if (e.key === 'Escape') {
      isEditingUrl = false
      if (activeTab) addressBarInput = activeTab.displayUrl
      ;(e.target as HTMLInputElement)?.blur()
    }
  }

  // In-Browser Tab Panic (Does NOT reload or touch OS!)
  function triggerInBrowserPanic() {
    if (!activeTab) return
    activeTab.title = 'Classes'
    activeTab.displayUrl = panicUrl
    const targetSrc = `${PROXY_HOST}/?transport=${selectedTransport}&url=${encodeURIComponent(panicUrl)}`
    activeTab.url = targetSrc
    activeTab.loading = true
    tabs = [...tabs]
    addressBarInput = panicUrl

    const iframe = iframeRefs[activeTab.id]
    if (iframe) {
      iframe.src = targetSrc
    }
    showThreeDotMenu = false
  }

  function goBack() {
    try {
      const frame = iframeRefs[activeTabId]
      if (!frame?.contentWindow) return
      frame.contentWindow.history.back()
      setTimeout(() => tryExtractTabTitle(activeTabId), 150)
      setTimeout(() => tryExtractTabTitle(activeTabId), 500)
      setTimeout(() => tryExtractTabTitle(activeTabId), 1500)
    } catch {}
  }

  function goForward() {
    try {
      const frame = iframeRefs[activeTabId]
      if (!frame?.contentWindow) return
      frame.contentWindow.history.forward()
      setTimeout(() => tryExtractTabTitle(activeTabId), 150)
      setTimeout(() => tryExtractTabTitle(activeTabId), 500)
      setTimeout(() => tryExtractTabTitle(activeTabId), 1500)
    } catch {}
  }

  function refresh() {
    if (activeTab) {
      activeTab.loading = true
      tabs = [...tabs]
      const frame = iframeRefs[activeTabId]
      if (frame) {
        frame.src = activeTab.url.includes('?') 
          ? `${activeTab.url}&_t=${Date.now()}` 
          : `${activeTab.url}?_t=${Date.now()}`
      }
    }
  }

  function goHome() {
    navigateCurrentTab('')
  }

  function onIframeLoad(tabId: string) {
    const tab = tabs.find((t) => t.id === tabId)
    if (tab) {
      tab.loading = false
      tabs = [...tabs]
    }
    tryExtractTabTitle(tabId)
    setTimeout(() => tryExtractTabTitle(tabId), 350)
    setTimeout(() => tryExtractTabTitle(tabId), 1200)
    setTimeout(() => tryExtractTabTitle(tabId), 2600)
  }

  function handleTransportChange() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wos_proxy_transport', selectedTransport)
    }
    if (activeTab) {
      activeTab.loading = true
      tabs = [...tabs]
      const frame = iframeRefs[activeTabId]
      if (frame) {
        frame.src = `${PROXY_HOST}/?transport=${selectedTransport}&t=${Date.now()}`
      }
    }
    showThreeDotMenu = false
  }

  function openAboutBlank() {
    showThreeDotMenu = false
    const win = window.open('about:blank', '_blank')
    if (!win) {
      alert('Pop-up was blocked! Please allow popups to open about:blank.')
      return
    }

    win.document.title = activeCloak.title || 'Home'
    const link = win.document.createElement('link')
    link.rel = 'icon'
    link.href = activeCloak.icon || 'https://ssl.gstatic.com/classroom/favicon.png'
    win.document.head.appendChild(link)

    win.document.body.style.margin = '0'
    win.document.body.style.padding = '0'
    win.document.body.style.overflow = 'hidden'
    win.document.body.style.background = '#18181b'

    const iframe = win.document.createElement('iframe')
    iframe.style.width = '100vw'
    iframe.style.height = '100vh'
    iframe.style.border = 'none'
    iframe.style.margin = '0'
    iframe.style.padding = '0'
    iframe.style.display = 'block'
    iframe.allow = 'autoplay; fullscreen; clipboard-read; clipboard-write; camera; microphone; geolocation'
    iframe.src = location.origin
    win.document.body.appendChild(iframe)
  }

  function applyCloak(preset: CloakPreset) {
    activeCloak = preset
    document.title = preset.title
    let favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }
    favicon.href = preset.icon
    showCloakMenu = false
  }

  function toggleAntiClose() {
    antiClose = !antiClose
    if (antiClose) {
      window.onbeforeunload = () => 'Leave site?'
    } else {
      window.onbeforeunload = null
    }
  }

  function parseCookies(input: string): Array<{ name: string; value: string; domain?: string; path?: string }> {
    const trimmed = input.trim().replace(/^["']|["']$/g, '')
    if (!trimmed) return []

    if (/^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{20,}$/.test(trimmed) || (trimmed.startsWith('mfa.') && trimmed.length > 40)) {
      return [{ name: '__discord_token__', value: trimmed, path: '/' }]
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            name: item.name || item.key || '',
            value: item.value || '',
            domain: item.domain || '',
            path: item.path || '/',
          })).filter((c) => c.name && c.value)
        }
      } catch {}
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        return Object.entries(parsed).map(([name, value]) => ({
          name,
          value: String(value),
          path: '/',
        })).filter((c) => c.name && c.value)
      } catch {}
    }

    const result: Array<{ name: string; value: string; domain?: string; path?: string }> = []
    const pairs = trimmed.split(';')
    for (const pair of pairs) {
      const idx = pair.indexOf('=')
      if (idx > 0) {
        const name = pair.substring(0, idx).trim()
        const value = pair.substring(idx + 1).trim()
        if (name && value) {
          result.push({ name, value, path: '/' })
        }
      }
    }
    return result
  }

  function handleImportCookies() {
    cookieStatusMsg = ''
    cookieStatusType = ''

    const parsed = parseCookies(cookieInput)
    if (parsed.length === 0) {
      cookieStatusMsg = 'Could not parse any cookies or token.'
      cookieStatusType = 'error'
      return
    }

    try {
      const isToken = parsed.length === 1 && parsed[0].name === '__discord_token__'
      const frame = iframeRefs[activeTabId]
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage(
          {
            type: isToken ? 'wos_import_token' : 'wos_import_cookies',
            token: isToken ? parsed[0].value : undefined,
            cookies: parsed,
            raw: cookieInput,
            reload: true,
          },
          '*'
        )
      }
      cookieStatusMsg = isToken 
        ? 'Discord Token detected! Logging in...' 
        : `Injected ${parsed.length} cookie(s)! Reloading...`
      cookieStatusType = 'success'
      setTimeout(() => {
        showCookieModal = false
        cookieInput = ''
        cookieStatusMsg = ''
        if (isToken) {
          if (frame) {
            frame.src = `${PROXY_HOST}/scramjet/${encodeURIComponent('https://discord.com/app')}`
          }
        } else {
          refresh()
        }
      }, 750)
    } catch (err: any) {
      cookieStatusMsg = `Import error: ${err?.message || 'Failed to inject'}`
      cookieStatusType = 'error'
    }
  }

  function handleWindowMessage(e: MessageEvent) {
    if (!e.data) return

    let msgData: any = e.data
    if (typeof e.data === 'string') {
      try {
        msgData = JSON.parse(e.data)
      } catch {}
    }

    if (typeof msgData !== 'object' || !msgData) return

    // Identify message type and payload
    let incomingTitle = ''
    let incomingUrl = ''

    if (msgData.__wos === 'title' || msgData.__wos === 'nav' || msgData.type === 'title' || msgData.type === 'page-title' || msgData.type === 'navigation' || msgData.type === 'url-change') {
      incomingTitle = msgData.title || msgData.documentTitle || ''
      incomingUrl = msgData.url || msgData.href || ''
    } else {
      if (typeof msgData.title === 'string') incomingTitle = msgData.title
      if (typeof msgData.documentTitle === 'string') incomingTitle = msgData.documentTitle
      if (typeof msgData.url === 'string') incomingUrl = msgData.url
      if (typeof msgData.href === 'string') incomingUrl = msgData.href
    }

    // Match to corresponding tab iframe by checking source or active tab
    let matchedTab = tabs.find((t) => {
      const frame = iframeRefs[t.id]
      return frame && (frame.contentWindow === e.source || frame.contentWindow === (e.source as any)?.parent)
    })

    if (!matchedTab) {
      matchedTab = tabs.find((t) => t.id === activeTabId)
    }

    if (!matchedTab) return
    let changed = false

    if (incomingUrl && incomingUrl.trim()) {
      const rawUrl = incomingUrl.trim()
      const clean = cleanDisplayUrl(rawUrl)
      const isProxyHome = !clean || clean === 'about:blank' || clean === PROXY_HOST || clean === (PROXY_HOST + '/')
      if (!isProxyHome && clean) {
        if (clean !== matchedTab.displayUrl || !matchedTab.displayUrl) {
          matchedTab.displayUrl = clean
          if (matchedTab.id === activeTabId && !isEditingUrl) {
            addressBarInput = clean
          }
          changed = true
        }
        const friendly = deriveFriendlyTitle(clean)
        if (friendly && friendly !== matchedTab.title) {
          matchedTab.title = friendly
          changed = true
        }
        matchedTab.loading = false
      }
    }

    if (incomingTitle && incomingTitle.trim()) {
      const cleanTitle = incomingTitle.trim()
      if (cleanTitle && cleanTitle !== 'WOS' && cleanTitle !== 'about:blank' && cleanTitle !== 'Classes' && cleanTitle !== matchedTab.title) {
        matchedTab.title = cleanTitle
        changed = true
      }
    }

    if (changed) {
      tabs = [...tabs]
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === panicKey) {
      e.preventDefault()
      triggerInBrowserPanic()
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 't') {
        e.preventDefault()
        addTab()
      } else if (e.key === 'w') {
        e.preventDefault()
        closeTab(activeTabId)
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomOut()
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        zoomIn()
      } else if (e.key === '0') {
        e.preventDefault()
        resetZoom()
      }
    }
  }

  function closeAllMenus() {
    showThreeDotMenu = false
    showCloakMenu = false
  }

  let pollTimer: any = null

  onMount(() => {
    updateBrowserTitle()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('message', handleWindowMessage)

    pollTimer = setInterval(() => {
      if (activeTabId) {
        tryExtractTabTitle(activeTabId)
      }
    }, 1000)
  })

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer)
    if (ffTimerInterval) clearInterval(ffTimerInterval)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('message', handleWindowMessage)
    if (window.onbeforeunload) window.onbeforeunload = null
  })
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="browser-window theme-{impersonationTheme}" on:click={closeAllMenus}>
  <!-- Top Tab Strip (Real Browser Multi-Tab - NO GIVEAWAYS OR BRAND WATERMARKS) -->
  <div class="tab-strip" on:click|stopPropagation>
    <div class="tab-list">
      {#each tabs as tab (tab.id)}
        <div
          class="browser-tab"
          class:active={tab.id === activeTabId}
          on:click={() => switchTab(tab.id)}
          title={tab.title}
        >
          <div class="tab-icon-wrapper">
            {#if tab.loading}
              <div class="tab-spinner"></div>
            {/if}
          </div>
          <span class="tab-title">{tab.title || 'New Tab'}</span>
          <button
            class="tab-close-btn"
            on:click={(e) => closeTab(tab.id, e)}
            title="Close tab"
          >
            <X size={12} />
          </button>
        </div>
      {/each}

      <button class="new-tab-btn" on:click={() => addTab()} title="New tab">
        <Plus size={14} />
      </button>
    </div>
  </div>

  <!-- Main Toolbar (Authentic browser styling) -->
  <div class="main-toolbar" on:click|stopPropagation>
    <!-- Navigation Buttons -->
    <div class="nav-controls">
      <button class="tool-btn" on:click={goBack} title="Click to go back">
        <ArrowLeft size={15} />
      </button>
      <button class="tool-btn" on:click={goForward} title="Click to go forward">
        <ArrowRight size={15} />
      </button>
      <button class="tool-btn" class:spin={activeTab?.loading} on:click={refresh} title="Reload this page">
        <RotateCw size={14} />
      </button>
      {#if impersonationTheme === 'wos'}
        <button class="tool-btn" on:click={goHome} title="Home">
          <Home size={14} />
        </button>
      {/if}
    </div>

    <!-- Omnibox / Address Bar -->
    <div class="omnibox-container" class:focused={isEditingUrl}>
      <div class="omnibox-icon" title="View site information">
        {#if impersonationTheme === 'firefox'}
          <ShieldCheck size={14} class="omnibox-shield" />
        {:else}
          <Lock size={12} class="omnibox-lock" />
        {/if}
      </div>
      <input
        type="text"
        class="omnibox-input"
        bind:value={addressBarInput}
        placeholder={impersonationTheme === 'safari' ? 'Search or enter website name' : 'Search Google or type a URL'}
        on:focus={() => (isEditingUrl = true)}
        on:blur={() => setTimeout(() => (isEditingUrl = false), 150)}
        on:keydown={handleAddressKeyDown}
      />
      {#if isEditingUrl && addressBarInput}
        <button class="omnibox-clear" on:click={() => (addressBarInput = '')}>
          <X size={12} />
        </button>
      {:else if impersonationTheme === 'chrome'}
        <div class="omnibox-star" title="Bookmark this tab">
          <Star size={13} />
        </div>
      {/if}
    </div>

    <!-- Realistic Browser Action Buttons (Extensions, Profile, Menu) -->
    <div class="toolbar-actions">
      {#if impersonationTheme === 'chrome'}
        <!-- Disguised Extensions Icon (Secret in-browser emergency tab switch) -->
        <button
          class="tool-btn"
          on:click={triggerInBrowserPanic}
          title="Extensions"
        >
          <Puzzle size={15} />
        </button>

        <!-- Chrome Profile Avatar -->
        <div class="chrome-avatar-btn" title="Google Account">
          <CircleUser size={18} />
        </div>

        <!-- Chrome 3-Dot Kebab Menu -->
        <button
          class="tool-btn kebab-btn"
          class:active={showThreeDotMenu}
          on:click={() => (showThreeDotMenu = !showThreeDotMenu)}
          title="Customize and control Google Chrome"
        >
          <MoreVertical size={16} />
        </button>

      {:else if impersonationTheme === 'safari'}
        <!-- Safari Share Button -->
        <button class="tool-btn" title="Share">
          <Share size={14} />
        </button>

        <!-- Safari New Tab -->
        <button class="tool-btn" on:click={() => addTab()} title="New Tab">
          <Plus size={14} />
        </button>

        <!-- Safari Extensions (Secret emergency tab switch) -->
        <button
          class="tool-btn"
          on:click={triggerInBrowserPanic}
          title="Extensions"
        >
          <Puzzle size={14} />
        </button>

        <!-- Safari Settings Menu -->
        <button
          class="tool-btn kebab-btn"
          class:active={showThreeDotMenu}
          on:click={() => (showThreeDotMenu = !showThreeDotMenu)}
          title="Safari Settings"
        >
          <MoreVertical size={15} />
        </button>

      {:else if impersonationTheme === 'firefox'}
        <!-- Firefox Extensions Puzzle Icon (Secret emergency tab switch) -->
        <button
          class="tool-btn"
          on:click={triggerInBrowserPanic}
          title="Extensions"
        >
          <Puzzle size={15} />
        </button>

        <!-- Firefox Hamburger Menu -->
        <button
          class="tool-btn kebab-btn"
          class:active={showThreeDotMenu}
          on:click={() => (showThreeDotMenu = !showThreeDotMenu)}
          title="Open application menu"
        >
          <Menu size={16} />
        </button>

      {:else}
        <!-- WOS Normal Mode -->
        <button
          class="tool-btn"
          on:click={triggerInBrowserPanic}
          title="Extensions"
        >
          <Puzzle size={15} />
        </button>

        <button
          class="tool-btn kebab-btn"
          class:active={showThreeDotMenu}
          on:click={() => (showThreeDotMenu = !showThreeDotMenu)}
          title="Options"
        >
          <MoreVertical size={16} />
        </button>
      {/if}
    </div>
  </div>

  <!-- Browser Overflow Menu Panel -->
  {#if showThreeDotMenu}
    <div class="menu-dropdown-overlay" on:click={() => (showThreeDotMenu = false)}>
      <div class="three-dot-menu" on:click|stopPropagation>
        <!-- Impersonation Selector Section -->
        <div class="menu-section">
          <div class="menu-section-header">
            <Monitor size={13} />
            <span>Browser Theme & Style</span>
          </div>
          <div class="impersonation-grid">
            <button
              class="impersonate-chip"
              class:selected={impersonationTheme === 'chrome'}
              on:click={() => setImpersonation('chrome')}
            >
              <img src="/icons/chrome.svg" alt="" class="chip-icon" />
              <span>Chrome</span>
            </button>
            <button
              class="impersonate-chip"
              class:selected={impersonationTheme === 'safari'}
              on:click={() => setImpersonation('safari')}
            >
              <img src="/icons/safari.svg" alt="" class="chip-icon" />
              <span>Safari</span>
            </button>
            <button
              class="impersonate-chip"
              class:selected={impersonationTheme === 'firefox'}
              on:click={() => setImpersonation('firefox')}
            >
              <img src="/icons/firefox.svg" alt="" class="chip-icon" />
              <span>Firefox</span>
            </button>
            <button
              class="impersonate-chip"
              class:selected={impersonationTheme === 'wos'}
              on:click={() => setImpersonation('wos')}
            >
              <Globe size={14} class="chip-icon-globe" />
              <span>Normal WOS</span>
            </button>
          </div>
        </div>

        <div class="menu-divider"></div>

        <!-- Landing Page Look Selector -->
        <div class="menu-section">
          <div class="menu-section-header">
            <Compass size={13} />
            <span>New Tab Landing Look</span>
          </div>
          <div class="landing-style-pills">
            <button
              class="style-pill"
              class:active={landingStyle === 'auto'}
              on:click={() => setLandingStyle('auto')}
            >
              Auto
            </button>
            <button
              class="style-pill"
              class:active={landingStyle === 'chrome'}
              on:click={() => setLandingStyle('chrome')}
            >
              Chrome
            </button>
            <button
              class="style-pill"
              class:active={landingStyle === 'firefox'}
              on:click={() => setLandingStyle('firefox')}
            >
              Firefox
            </button>
            <button
              class="style-pill"
              class:active={landingStyle === 'safari'}
              on:click={() => setLandingStyle('safari')}
            >
              Safari
            </button>
            <button
              class="style-pill"
              class:active={landingStyle === 'wos'}
              on:click={() => setLandingStyle('wos')}
            >
              WOS
            </button>
          </div>
        </div>

        <div class="menu-divider"></div>

        <!-- In-Browser Emergency Switch Option (Discreetly styled) -->
        <div class="menu-section">
          <button class="menu-action-btn" on:click={triggerInBrowserPanic}>
            <div class="btn-left">
              <ShieldCheck size={14} />
              <span>Switch Active Tab to Classroom</span>
            </div>
            <kbd class="inline-kbd">{panicKey}</kbd>
          </button>
        </div>

        <div class="menu-divider"></div>

        <!-- Proxy Transport Selector -->
        <div class="menu-section">
          <div class="menu-section-header">
            <ShieldCheck size={13} />
            <span>Proxy Transport</span>
          </div>
          <div class="transport-pills">
            <button
              class="transport-pill"
              class:active={selectedTransport === 'bare'}
              on:click={() => { selectedTransport = 'bare'; handleTransportChange(); }}
            >
              Bare
            </button>
            <button
              class="transport-pill"
              class:active={selectedTransport === 'libcurl'}
              on:click={() => { selectedTransport = 'libcurl'; handleTransportChange(); }}
            >
              Wisp (Libcurl)
            </button>
            <button
              class="transport-pill"
              class:active={selectedTransport === 'epoxy'}
              on:click={() => { selectedTransport = 'epoxy'; handleTransportChange(); }}
            >
              Wisp (Epoxy)
            </button>
          </div>
        </div>

        <div class="menu-divider"></div>

        <!-- Stealth Cloak, Cookies, About:Blank Buttons -->
        <div class="menu-list">
          <button
            class="menu-action-btn"
            on:click={() => { showThreeDotMenu = false; showCloakMenu = true; }}
          >
            <div class="btn-left">
              <EyeOff size={14} />
              <span>Tab Disguises & Cloaking</span>
            </div>
            <span class="badge-sub">{activeCloak.name}</span>
          </button>

          <button
            class="menu-action-btn"
            on:click={() => { showThreeDotMenu = false; showCookieModal = true; }}
          >
            <div class="btn-left">
              <Cookie size={14} />
              <span>Cookie & Token Importer</span>
            </div>
          </button>

          <button class="menu-action-btn" on:click={openAboutBlank}>
            <div class="btn-left">
              <ExternalLink size={14} />
              <span>Open in about:blank</span>
            </div>
          </button>
        </div>

        <div class="menu-divider"></div>

        <!-- Render Scale / Zoom Quick Options -->
        <div class="menu-section">
          <div class="menu-section-header">
            <SlidersHorizontal size={13} />
            <span>Zoom ({Math.round(renderScale * 100)}%)</span>
          </div>
          <div class="zoom-quick-row">
            <button class="zoom-chip" on:click={zoomOut} title="Zoom Out">
              <Minus size={12} />
            </button>
            {#each [0.75, 1.0, 1.25] as scale}
              <button
                class="zoom-chip"
                class:active={renderScale === scale}
                on:click={() => setScale(scale)}
              >
                {Math.round(scale * 100)}%
              </button>
            {/each}
            <button class="zoom-chip" on:click={zoomIn} title="Zoom In">
              <Plus size={12} />
            </button>
            {#if renderScale !== 1}
              <button class="zoom-chip reset-chip" on:click={resetZoom} title="Reset to 100%">
                <RotateCcw size={11} />
              </button>
            {/if}
          </div>
        </div>

        <!-- Anti-Close Tab Toggle -->
        <div class="menu-section">
          <div class="toggle-row" on:click={toggleAntiClose}>
            <div class="toggle-info">
              <Lock size={13} />
              <span>Anti-Close Tab Protection</span>
            </div>
            <div class="switch" class:on={antiClose}>
              <div class="switch-handle"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Stealth Cloak Modal -->
  {#if showCloakMenu}
    <div class="cloak-overlay" on:click={() => (showCloakMenu = false)}>
      <div class="cloak-menu" on:click|stopPropagation>
        <div class="menu-header">
          <div class="menu-title-group">
            <EyeOff size={15} class="header-icon" />
            <span class="menu-title">Stealth Cloaking & Tab Disguises</span>
          </div>
          <button class="close-btn" on:click={() => (showCloakMenu = false)}>
            <X size={14} />
          </button>
        </div>

        <div class="menu-section">
          <span class="section-label">Tab Disguise Presets</span>
          <div class="preset-grid">
            {#each CLOAKS as preset}
              <button
                class="preset-card"
                class:selected={activeCloak.id === preset.id}
                on:click={() => applyCloak(preset)}
              >
                <img src={preset.icon} alt={preset.name} class="preset-icon" />
                <span class="preset-name">{preset.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="menu-section">
          <span class="section-label">Emergency Switch Hotkey</span>
          <div class="panic-row">
            <div class="panic-info">
              <Zap size={14} class="panic-icon" />
              <span>Press <kbd class="key-badge">{panicKey}</kbd> to instantly switch active tab</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Cookie Importer Modal -->
  {#if showCookieModal}
    <div class="cloak-overlay" on:click={() => (showCookieModal = false)}>
      <div class="cookie-menu" on:click|stopPropagation>
        <div class="menu-header">
          <div class="menu-title-group">
            <Cookie size={16} class="header-icon" />
            <span class="menu-title">Cookie Importer</span>
          </div>
          <button class="close-btn" on:click={() => (showCookieModal = false)}>
            <X size={14} />
          </button>
        </div>

        <div class="menu-section">
          <p class="cookie-desc">
            Paste cookies exported from <strong>Cookie-Editor</strong>, <strong>EditThisCookie</strong>, or a standard <code>name=value;</code> header string.
          </p>

          <textarea
            class="cookie-textarea"
            bind:value={cookieInput}
            placeholder={`Paste JSON array, object, or header format here:\n\n[\n  { "name": "token", "value": "..." }\n]\n\nOR\n\nname=value; session=xyz;`}
            rows="7"
          ></textarea>

          {#if cookieStatusMsg}
            <div class="cookie-status {cookieStatusType}">
              {#if cookieStatusType === 'success'}
                <Check size={13} />
              {/if}
              <span>{cookieStatusMsg}</span>
            </div>
          {/if}

          <div class="cookie-actions">
            <button
              class="cookie-btn primary"
              on:click={handleImportCookies}
              disabled={!cookieInput.trim()}
            >
              <Cookie size={13} />
              <span>Import & Reload</span>
            </button>
            <button
              class="cookie-btn secondary"
              on:click={() => { cookieInput = ''; cookieStatusMsg = ''; }}
              disabled={!cookieInput.trim()}
            >
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Landing Page Customization Modal -->
  {#if showLandingCustomizeModal}
    <div class="cloak-overlay" on:click={() => (showLandingCustomizeModal = false)}>
      <div class="cookie-menu landing-modal" on:click|stopPropagation>
        <div class="menu-header">
          <div class="menu-title-group">
            <Sliders size={16} class="header-icon" />
            <span class="menu-title">Customize New Tab Landing Page</span>
          </div>
          <button class="close-btn" on:click={() => (showLandingCustomizeModal = false)}>
            <X size={14} />
          </button>
        </div>

        <div class="landing-options-list">
          <button
            class="landing-opt-card"
            class:selected={landingStyle === 'auto'}
            on:click={() => { setLandingStyle('auto'); showLandingCustomizeModal = false; }}
          >
            <div class="opt-badge-icon auto-icon">
              <Compass size={18} />
            </div>
            <div class="opt-text-col">
              <span class="opt-name">Match Theme (Automatic)</span>
              <span class="opt-desc">Matches your active browser style ({impersonationTheme})</span>
            </div>
            {#if landingStyle === 'auto'}
              <Check size={16} class="check-icon" />
            {/if}
          </button>

          <button
            class="landing-opt-card"
            class:selected={landingStyle === 'chrome'}
            on:click={() => { setLandingStyle('chrome'); showLandingCustomizeModal = false; }}
          >
            <div class="opt-badge-icon">
              <img src="/icons/chrome.svg" alt="Chrome" width="22" height="22" />
            </div>
            <div class="opt-text-col">
              <span class="opt-name">Google Chrome</span>
              <span class="opt-desc">Google logo, search pill with mic/lens, circular shortcuts</span>
            </div>
            {#if landingStyle === 'chrome'}
              <Check size={16} class="check-icon" />
            {/if}
          </button>

          <button
            class="landing-opt-card"
            class:selected={landingStyle === 'firefox'}
            on:click={() => { setLandingStyle('firefox'); showLandingCustomizeModal = false; }}
          >
            <div class="opt-badge-icon">
              <img src="/icons/firefox.svg" alt="Firefox" width="22" height="22" />
            </div>
            <div class="opt-text-col">
              <span class="opt-name">Mozilla Firefox</span>
              <span class="opt-desc">Firefox flame logo, dark search bar, top shortcuts grid</span>
            </div>
            {#if landingStyle === 'firefox'}
              <Check size={16} class="check-icon" />
            {/if}
          </button>

          <button
            class="landing-opt-card"
            class:selected={landingStyle === 'safari'}
            on:click={() => { setLandingStyle('safari'); showLandingCustomizeModal = false; }}
          >
            <div class="opt-badge-icon">
              <img src="/icons/safari.svg" alt="Safari" width="22" height="22" />
            </div>
            <div class="opt-text-col">
              <span class="opt-name">Apple Safari</span>
              <span class="opt-desc">macOS Favorites squircle grid, Privacy Report card</span>
            </div>
            {#if landingStyle === 'safari'}
              <Check size={16} class="check-icon" />
            {/if}
          </button>

          <button
            class="landing-opt-card"
            class:selected={landingStyle === 'wos'}
            on:click={() => { setLandingStyle('wos'); showLandingCustomizeModal = false; }}
          >
            <div class="opt-badge-icon wos-icon">
              <Globe size={18} />
            </div>
            <div class="opt-text-col">
              <span class="opt-name">WOS Learning Hub</span>
              <span class="opt-desc">Unrestricted gaming, proxy, and media shortcut hub</span>
            </div>
            {#if landingStyle === 'wos'}
              <Check size={16} class="check-icon" />
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Tab Frames Body (Zero reloads when switching tabs) -->
  <div class="browser-body">
    {#each tabs as tab (tab.id)}
      {#if !tab.url}
        <div class="start-page style-{effectiveLandingStyle}" class:active={tab.id === activeTabId}>
          {#if effectiveLandingStyle === 'chrome'}
            <!-- ============================================================= -->
            <!-- GOOGLE CHROME AUTHENTIC NEW TAB PAGE                          -->
            <!-- ============================================================= -->
            <div class="chrome-ntp-container">
              <div class="chrome-top-right-nav">
                <span class="chrome-text-link" on:click={() => navigateCurrentTab('https://mail.google.com')}>Gmail</span>
                <span class="chrome-text-link" on:click={() => navigateCurrentTab('https://images.google.com')}>Images</span>
                <button class="chrome-apps-btn" title="Google apps" on:click={() => navigateCurrentTab('https://about.google/products/')}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#9aa0a6"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </button>
                <div class="chrome-profile-avatar" title="Google Account">
                  <span>D</span>
                </div>
              </div>

              <div class="chrome-center-stage">
                <!-- Authentic Google Logo -->
                <div class="google-logo">
                  <span class="g-blue">G</span><span class="g-red">o</span><span class="g-yellow">o</span><span class="g-blue">g</span><span class="g-green">l</span><span class="g-red">e</span>
                </div>

                <!-- Chrome Search Box -->
                <div class="chrome-search-box">
                  <Search size={18} class="chrome-search-icon" />
                  <input
                    type="text"
                    class="chrome-search-input"
                    placeholder="Search Google or type a URL"
                    on:keydown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value
                        if (val.trim()) navigateCurrentTab(val)
                      }
                    }}
                  />
                  <div class="chrome-search-actions">
                    <button class="chrome-icon-btn" title="Search by voice">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="#9aa0a6"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    </button>
                    <button class="chrome-icon-btn" title="Search by image">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="#9aa0a6"><path d="M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0-4.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm11 16H4V6h4.05l1.83-2h4.24l1.83 2H20v12z"/></svg>
                    </button>
                  </div>
                </div>

                <!-- Chrome Circular Shortcuts Grid -->
                <div class="chrome-shortcuts-grid">
                  <button class="chrome-shortcut-tile" on:click={() => navigateCurrentTab('https://www.youtube.com')}>
                    <div class="chrome-circle-icon">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </div>
                    <span class="chrome-tile-label">YouTube</span>
                  </button>

                  <button class="chrome-shortcut-tile" on:click={() => navigateCurrentTab('https://mail.google.com')}>
                    <div class="chrome-circle-icon">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#ea4335"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    </div>
                    <span class="chrome-tile-label">Gmail</span>
                  </button>

                  <button class="chrome-shortcut-tile" on:click={() => navigateCurrentTab('https://classroom.google.com')}>
                    <div class="chrome-circle-icon">
                      <img src="https://ssl.gstatic.com/classroom/favicon.png" alt="Classroom" width="22" height="22" />
                    </div>
                    <span class="chrome-tile-label">Classroom</span>
                  </button>

                  <button class="chrome-shortcut-tile" on:click={() => navigateCurrentTab('https://drive.google.com')}>
                    <div class="chrome-circle-icon">
                      <svg viewBox="0 0 24 24" width="20" height="20"><polygon fill="#34a853" points="2.5,19 9,7.5 15.5,7.5 9,19"/><polygon fill="#4285f4" points="9,7.5 15.5,7.5 22,19 15.5,19"/><polygon fill="#fbbc05" points="15.5,7.5 8.75,7.5 12,2 18.75,2"/></svg>
                    </div>
                    <span class="chrome-tile-label">Google Drive</span>
                  </button>

                  <button class="chrome-shortcut-tile" on:click={() => navigateCurrentTab('https://discord.com/app')}>
                    <div class="chrome-circle-icon">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    </div>
                    <span class="chrome-tile-label">Discord</span>
                  </button>

                  <button class="chrome-shortcut-tile" on:click={() => navigateCurrentTab('https://github.com')}>
                    <div class="chrome-circle-icon">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                    </div>
                    <span class="chrome-tile-label">GitHub</span>
                  </button>

                  <button class="chrome-shortcut-tile" on:click={() => navigateCurrentTab('https://reddit.com')}>
                    <div class="chrome-circle-icon">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#ff4500"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.492 1.207-.492.941 0 1.704.763 1.704 1.704 0 .604-.315 1.135-.789 1.436.02.179.03.361.03.546 0 2.766-3.217 5.013-7.185 5.013s-7.185-2.247-7.185-5.013c0-.185.01-.367.03-.546A1.696 1.696 0 0 1 4.1 11.896c0-.941.763-1.704 1.704-1.704.477 0 .899.183 1.207.492 1.194-.856 2.85-1.418 4.674-1.488l.8-3.747a.25.25 0 0 1 .29-.196l2.842.6a1.244 1.244 0 0 1 .393-.109z"/></svg>
                    </div>
                    <span class="chrome-tile-label">Reddit</span>
                  </button>

                  <button class="chrome-shortcut-tile" on:click={() => showLandingCustomizeModal = true}>
                    <div class="chrome-circle-icon add-btn">
                      <Plus size={20} />
                    </div>
                    <span class="chrome-tile-label">Add shortcut</span>
                  </button>
                </div>
              </div>

              <!-- Chrome Bottom Right Customize Button -->
              <button class="chrome-customize-pill" on:click={() => showLandingCustomizeModal = true}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                <span>Customize Chrome</span>
              </button>
            </div>

          {:else if effectiveLandingStyle === 'firefox'}
            <!-- ============================================================= -->
            <!-- MOZILLA FIREFOX EXACT REPLICA FROM USER SCREENSHOT            -->
            <!-- ============================================================= -->
            <div class="firefox-ntp-container">
              <!-- Top Row: Left Brand + Right Weather Widget -->
              <div class="ff-top-nav-bar">
                <div class="ff-brand-left">
                  <img src="/icons/firefox.svg" alt="Firefox" class="ff-brand-logo" />
                  <span class="ff-brand-name">Firefox</span>
                </div>

                <div class="ff-weather-card" on:click={editFfWeather} title="Click to change weather location">
                  <div class="ff-weather-header">
                    <span class="ff-city">{ffWeatherCity}</span>
                    <MoreHorizontal size={13} class="ff-muted-dots" />
                  </div>
                  <div class="ff-weather-body">
                    <div class="ff-weather-cloud-icon">
                      <Cloud size={20} color="#737373" />
                    </div>
                    <div class="ff-weather-temp-col">
                      <span class="ff-temp-now">{ffWeatherTemp}</span>
                      <span class="ff-temp-range">{ffWeatherRange}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Main Centered Content Column -->
              <div class="ff-page-stream">
                <!-- Search Bar with Google G Icon -->
                <div class="ff-search-wrapper">
                  <div class="ff-search-pill">
                    <svg class="ff-google-g" viewBox="0 0 24 24" width="18" height="18">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <input
                      type="text"
                      class="ff-search-input"
                      placeholder="Search with Google or enter address"
                      on:keydown={(e) => {
                        if (e.key === 'Enter') {
                          const val = e.currentTarget.value
                          if (val.trim()) navigateCurrentTab(val)
                        }
                      }}
                    />
                  </div>
                </div>

                <!-- 10 Firefox Shortcuts Row (Exact replica of user screenshot) -->
                <div class="ff-shortcuts-strip">
                  <!-- 1. Amazon -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('https://amazon.com')}>
                    <div class="ff-square-tile">
                      <span class="ff-amazon-a">a</span>
                    </div>
                    <span class="ff-s-title">Amazon</span>
                    <span class="ff-s-sub">Sponsored</span>
                  </button>

                  <!-- 2. Expedia -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('https://expedia.com')}>
                    <div class="ff-square-tile yellow-tile">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="#000"><path d="M5 19L19 5M19 5H9M19 5V15" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <span class="ff-s-title">Expedia</span>
                    <span class="ff-s-sub">Sponsored</span>
                  </button>

                  <!-- 3. Temu -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('https://temu.com')}>
                    <div class="ff-square-tile orange-tile">
                      <span class="ff-temu-txt">TEMU</span>
                    </div>
                    <span class="ff-s-title">Temu</span>
                    <span class="ff-s-sub">Sponsored</span>
                  </button>

                  <!-- 4. GitHub -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('https://github.com')}>
                    <div class="ff-square-tile white-tile">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="#000000"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                    </div>
                    <span class="ff-s-title">GitHub</span>
                  </button>

                  <!-- 5. WOS -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('')}>
                    <div class="ff-square-tile white-tile">
                      <ShieldCheck size={22} color="#0091ff" />
                    </div>
                    <span class="ff-s-title">WOS</span>
                  </button>

                  <!-- 6. Workers & Pages -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('https://dash.cloudflare.com')}>
                    <div class="ff-square-tile orange-soft-tile">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="#f38020"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                    </div>
                    <span class="ff-s-title">Workers &amp; Pages |...</span>
                  </button>

                  <!-- 7. DogeGage Chat -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('https://chat.dogegage.xyz')}>
                    <div class="ff-square-tile purple-tile">
                      <Zap size={22} color="#9059ff" fill="#9059ff" />
                    </div>
                    <span class="ff-s-title">DogeGage Chat</span>
                  </button>

                  <!-- 8. Catholic vs Christian -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('https://duckduckgo.com/?q=catholic+vs+christian')}>
                    <div class="ff-square-tile star-tile">
                      <Star size={20} color="#f59e0b" fill="#f59e0b" />
                    </div>
                    <span class="ff-s-title">Catholic vs Christian...</span>
                  </button>

                  <!-- 9. Cloudflare -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('https://cloudflare.com')}>
                    <div class="ff-square-tile orange-tile">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                    </div>
                    <span class="ff-s-title">Cloudflare Build for th...</span>
                  </button>

                  <!-- 10. DogeGage Dash -->
                  <button class="ff-shortcut-btn" on:click={() => navigateCurrentTab('https://dogegage.xyz')}>
                    <div class="ff-square-tile blue-tile">
                      <Compass size={22} color="#0091ff" />
                    </div>
                    <span class="ff-s-title">DogeGage Dash</span>
                  </button>
                </div>

                <!-- Widgets Section -->
                <div class="ff-section-container">
                  <div class="ff-sec-header">
                    <div class="ff-sec-left" on:click={() => ffShowWidgets = !ffShowWidgets}>
                      <span class="ff-sec-heading">Widgets</span>
                      <ChevronDown size={15} class="ff-chevron" />
                    </div>
                    <MoreHorizontal size={15} class="ff-muted-dots" />
                  </div>

                  {#if ffShowWidgets}
                    <div class="ff-widgets-grid">
                      <!-- Widget 1: Daily Crossword -->
                      <div class="ff-widget-card crossword-card">
                        <div class="w-badge-row">
                          <span class="ff-new-badge green-badge">NEW</span>
                          <span class="w-card-title">Daily crossword</span>
                        </div>
                        <div class="w-crossword-inner">
                          <div class="w-crossword-dots">
                            {#each Array(20) as _}
                              <div class="c-dot"></div>
                            {/each}
                          </div>
                          <div class="w-crossword-action">
                            <span class="c-sub">Explain This</span>
                            <button class="c-play-btn" on:click={() => navigateCurrentTab('https://dictionary.com/e/crossword')}>
                              Play
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- Widget 2: Set Wallpaper -->
                      <div class="ff-widget-card wallpaper-card">
                        <span class="ff-new-badge green-badge w-corner-badge">NEW</span>
                        <div class="w-wallpaper-btn-wrap">
                          <button class="w-wallpaper-btn" on:click={() => showLandingCustomizeModal = true}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                            <span>Set wallpaper</span>
                          </button>
                        </div>
                      </div>

                      <!-- Widget 3: World Clock -->
                      <div class="ff-widget-card clock-card">
                        <div class="w-clock-cols">
                          <div class="w-clock-item">
                            <span class="c-city">LAX</span>
                            <span class="c-tz">PDT</span>
                            <span class="c-time">10:30 PM</span>
                          </div>
                          <div class="w-clock-item">
                            <span class="c-city">BER</span>
                            <span class="c-tz">GMT+2</span>
                            <span class="c-time">7:30 AM</span>
                          </div>
                          <div class="w-clock-item">
                            <span class="c-city">SYD</span>
                            <span class="c-tz">GMT+10</span>
                            <span class="c-time">3:30 PM</span>
                          </div>
                          <div class="w-clock-item">
                            <span class="c-city">NYC</span>
                            <span class="c-tz">EDT</span>
                            <span class="c-time">1:30 AM</span>
                          </div>
                        </div>
                      </div>

                      <!-- Widget 4: Pomodoro Focus Timer -->
                      <div class="ff-widget-card timer-card">
                        <div class="w-timer-inner">
                          <button class="w-timer-play-btn" on:click={toggleFfTimer} title={ffTimerRunning ? 'Pause timer' : 'Start focus timer'}>
                            {#if ffTimerRunning}
                              <Pause size={16} fill="#7057ff" color="#7057ff" />
                            {:else}
                              <Play size={16} fill="#7057ff" color="#7057ff" style="margin-left: 2px;" />
                            {/if}
                          </button>
                          <div class="w-timer-digits-row">
                            <span class="w-minus" on:click={() => { if (ffTimerSeconds > 60) ffTimerSeconds -= 60 }}>-</span>
                            <span class="w-time-val">{formatFfTime(ffTimerSeconds)}</span>
                            <span class="w-plus" on:click={() => ffTimerSeconds += 60}>+</span>
                          </div>
                          <div class="w-timer-pills">
                            <button
                              class="w-timer-pill"
                              class:active={ffTimerMode === 'focus'}
                              on:click={() => setFfTimerMode('focus')}
                            >
                              Focus
                            </button>
                            <button
                              class="w-timer-pill"
                              class:active={ffTimerMode === 'break'}
                              on:click={() => setFfTimerMode('break')}
                            >
                              Break
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="ff-show-more-row">
                      <button class="ff-show-more-pill" on:click={() => showLandingCustomizeModal = true}>
                        Show more widgets
                      </button>
                    </div>
                  {/if}
                </div>

                <!-- Jump in to Firefox on the go Banner -->
                {#if ffShowQrBanner}
                  <div class="ff-qr-card">
                    <div class="ff-qr-graphic">
                      <div class="ff-qr-matrix">
                        <svg viewBox="0 0 100 100" width="70" height="70" fill="#000">
                          <rect x="0" y="0" width="30" height="30" rx="4" fill="#000"/>
                          <rect x="5" y="5" width="20" height="20" rx="2" fill="#fff"/>
                          <rect x="10" y="10" width="10" height="10" fill="#000"/>
                          <rect x="70" y="0" width="30" height="30" rx="4" fill="#000"/>
                          <rect x="75" y="5" width="20" height="20" rx="2" fill="#fff"/>
                          <rect x="80" y="10" width="10" height="10" fill="#000"/>
                          <rect x="0" y="70" width="30" height="30" rx="4" fill="#000"/>
                          <rect x="5" y="75" width="20" height="20" rx="2" fill="#fff"/>
                          <rect x="10" y="80" width="10" height="10" fill="#000"/>
                          <circle cx="50" cy="50" r="14" fill="#9059ff" />
                        </svg>
                      </div>
                    </div>
                    <div class="ff-qr-info">
                      <h4 class="ff-qr-title">Jump in to Firefox on the go</h4>
                      <p class="ff-qr-desc">
                        Get all the built-in privacy of Firefox on your phone. Protection is on from the start. Just scan the QR code to download and go.
                      </p>
                      <button class="ff-dismiss-pill" on:click={() => ffShowQrBanner = false}>
                        Dismiss
                      </button>
                    </div>
                    <button class="ff-qr-close-x" on:click={() => ffShowQrBanner = false} title="Close banner">
                      <X size={14} />
                    </button>
                  </div>
                {/if}

                <!-- Popular Today Section -->
                <div class="ff-section-container">
                  <div class="ff-sec-header">
                    <div class="ff-sec-left">
                      <span class="ff-sec-heading">Popular Today</span>
                      <Plus size={14} class="ff-plus-icon" />
                    </div>
                    <MoreHorizontal size={15} class="ff-muted-dots" />
                  </div>

                  <div class="ff-news-grid">
                    <div class="ff-news-card" on:click={() => navigateCurrentTab('https://news.ycombinator.com')}>
                      <div class="ff-news-img-box img-1"></div>
                      <div class="ff-news-caption">
                        <span class="ff-news-headline">World News &amp; Trending Stories Across Global Markets</span>
                      </div>
                    </div>
                    <div class="ff-news-card" on:click={() => navigateCurrentTab('https://wikipedia.org')}>
                      <div class="ff-news-img-box img-2"></div>
                      <div class="ff-news-caption">
                        <span class="ff-news-headline">Hidden Wonders: Top Coastal Getaways &amp; Architectural Gems</span>
                      </div>
                    </div>
                    <div class="ff-news-card" on:click={() => navigateCurrentTab('https://github.com')}>
                      <div class="ff-news-img-box img-3"></div>
                      <div class="ff-news-caption">
                        <span class="ff-news-headline">Tech Frontier: Major Advances in Autonomous Software Systems</span>
                      </div>
                    </div>
                    <div class="ff-news-card" on:click={() => navigateCurrentTab('https://reddit.com')}>
                      <div class="ff-news-img-box img-4"></div>
                      <div class="ff-news-caption">
                        <span class="ff-news-headline">Cultural Perspectives: Historic Architecture Across Europe</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Floating Purple Edit Button in Bottom Right -->
              <button class="ff-floating-edit" on:click={() => showLandingCustomizeModal = true} title="Customize this page">
                <Pencil size={17} color="#ffffff" />
              </button>
            </div>

          {:else if effectiveLandingStyle === 'safari'}
            <!-- ============================================================= -->
            <!-- APPLE SAFARI AUTHENTIC START PAGE                             -->
            <!-- ============================================================= -->
            <div class="safari-ntp-container">
              <div class="safari-stage">
                <!-- Favorites Header -->
                <div class="safari-section-head">
                  <h2>Favorites</h2>
                </div>

                <!-- macOS Squircle Favorites Grid -->
                <div class="safari-favorites-grid">
                  <button class="safari-squircle-card" on:click={() => navigateCurrentTab('https://apple.com')}>
                    <div class="safari-squircle-icon apple-bg">
                      <svg viewBox="0 0 24 24" width="30" height="30" fill="#ffffff"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.85-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.68-.9 2.71.99.08 2.02-.45 2.5-1.2z"/></svg>
                    </div>
                    <span class="safari-squircle-label">Apple</span>
                  </button>

                  <button class="safari-squircle-card" on:click={() => navigateCurrentTab('https://icloud.com')}>
                    <div class="safari-squircle-icon icloud-bg">
                      <svg viewBox="0 0 24 24" width="30" height="30" fill="#ffffff"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
                    </div>
                    <span class="safari-squircle-label">iCloud</span>
                  </button>

                  <button class="safari-squircle-card" on:click={() => navigateCurrentTab('https://google.com')}>
                    <div class="safari-squircle-icon google-bg">
                      <svg viewBox="0 0 24 24" width="28" height="28"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
                    </div>
                    <span class="safari-squircle-label">Google</span>
                  </button>

                  <button class="safari-squircle-card" on:click={() => navigateCurrentTab('https://www.youtube.com')}>
                    <div class="safari-squircle-icon yt-bg">
                      <svg viewBox="0 0 24 24" width="30" height="30" fill="#ffffff"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </div>
                    <span class="safari-squircle-label">YouTube</span>
                  </button>

                  <button class="safari-squircle-card" on:click={() => navigateCurrentTab('https://www.wikipedia.org')}>
                    <div class="safari-squircle-icon wiki-bg">
                      <span class="safari-w">W</span>
                    </div>
                    <span class="safari-squircle-label">Wikipedia</span>
                  </button>

                  <button class="safari-squircle-card" on:click={() => navigateCurrentTab('https://discord.com/app')}>
                    <div class="safari-squircle-icon discord-bg">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="#ffffff"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    </div>
                    <span class="safari-squircle-label">Discord</span>
                  </button>

                  <button class="safari-squircle-card" on:click={() => navigateCurrentTab('https://github.com')}>
                    <div class="safari-squircle-icon github-bg">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="#ffffff"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                    </div>
                    <span class="safari-squircle-label">GitHub</span>
                  </button>

                  <button class="safari-squircle-card" on:click={() => showLandingCustomizeModal = true}>
                    <div class="safari-squircle-icon add-bg">
                      <Plus size={26} color="#9aa0a6" />
                    </div>
                    <span class="safari-squircle-label">Add</span>
                  </button>
                </div>

                <!-- Safari Privacy Report Card -->
                <div class="safari-privacy-wrapper">
                  <div class="safari-privacy-card">
                    <div class="safari-shield-icon">
                      <ShieldCheck size={28} color="#34c759" />
                    </div>
                    <div class="safari-privacy-info">
                      <span class="safari-card-title">Privacy Report</span>
                      <span class="safari-card-desc">In the last 30 days, Safari prevented 78 trackers from profiling you.</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Safari Bottom Right Sliders Button -->
              <button class="safari-sliders-btn" on:click={() => showLandingCustomizeModal = true} title="Customize Start Page">
                <SlidersHorizontal size={16} />
              </button>
            </div>

          {:else}
            <!-- ============================================================= -->
            <!-- NORMAL WOS / LEARNING HUB START PAGE                          -->
            <!-- ============================================================= -->
            <div class="sj-main-container">
              <div class="brand-header">
                <h1 class="brand-title">Learning Hub</h1>
              </div>

              <div class="sj-search-container">
                <input
                  type="text"
                  class="sj-address-input"
                  placeholder="Search the web or enter a URL"
                  on:keydown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value
                      if (val.trim()) navigateCurrentTab(val)
                    }
                  }}
                />
              </div>

              <div class="sj-shortcuts-grid">
                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://www.tiktok.com')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#00f2fe"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .56.04.83.1v-3.5a6.37 6.37 0 0 0-.83-.05A6.34 6.34 0 0 0 3.15 15.6a6.34 6.34 0 0 0 10.82 4.48 6.27 6.27 0 0 0 1.87-4.48V8.69a8.31 8.31 0 0 0 5.16 1.8v-3.5a4.84 4.84 0 0 1-1.41-.3z"/></svg>
                  </div>
                  <span class="shortcut-label">TikTok</span>
                </button>

                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://www.crunchyroll.com')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#f47521"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-12.5c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5c1.66 0 3.11-.9 3.9-2.25-.66.16-1.35.25-2.07.25-3.31 0-6-2.69-6-6 0-.72.09-1.41.25-2.07 1.22.7 2.32 1.48 3.92 1.07z"/></svg>
                  </div>
                  <span class="shortcut-label">Crunchyroll</span>
                </button>

                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://www.youtube.com')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </div>
                  <span class="shortcut-label">YouTube</span>
                </button>

                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://discord.com')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                  </div>
                  <span class="shortcut-label">Discord</span>
                </button>

                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://chat.dogegage.xyz')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#89b4fa"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                  </div>
                  <span class="shortcut-label">DogeGage</span>
                </button>

                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://www.crazygames.com')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#a6e3a1"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                  </div>
                  <span class="shortcut-label">CrazyGames</span>
                </button>

                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://poki.com')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#38bdf8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-6h2v6zm0-8h-2V7h2v1z"/></svg>
                  </div>
                  <span class="shortcut-label">Poki</span>
                </button>

                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://www.twitch.tv')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#9146ff"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
                  </div>
                  <span class="shortcut-label">Twitch</span>
                </button>

                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://open.spotify.com')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  </div>
                  <span class="shortcut-label">Spotify</span>
                </button>

                <button class="shortcut-box" on:click={() => navigateCurrentTab('https://github.com')}>
                  <div class="shortcut-icon-tile">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  </div>
                  <span class="shortcut-label">GitHub</span>
                </button>
              </div>

              <!-- Switcher trigger -->
              <button class="wos-customize-pill" on:click={() => showLandingCustomizeModal = true}>
                <SlidersHorizontal size={13} />
                <span>Customize Landing Look</span>
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <iframe
          bind:this={iframeRefs[tab.id]}
          src={tab.url}
          class="browser-tab-frame"
          class:active={tab.id === activeTabId}
          style="width: {renderScale === 1 ? '100%' : `calc(100% / ${renderScale})`}; height: {renderScale === 1 ? '100%' : `calc(100% / ${renderScale})`}; transform: {renderScale === 1 ? 'none' : `scale(${renderScale})`}; transform-origin: 0 0;"
          title={tab.title}
          allow="autoplay; fullscreen; clipboard-read; clipboard-write; camera; microphone; geolocation"
          on:load={() => onIframeLoad(tab.id)}
        ></iframe>
      {/if}
    {/each}
  </div>
</div>

<style>
  .browser-window {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #18181b;
    color: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    user-select: none;
    overflow: hidden;
    position: relative;
  }

  /* ========================================================================= */
  /* TAB STRIP (Multi-Tab UI)                                                  */
  /* ========================================================================= */
  .tab-strip {
    display: flex;
    align-items: flex-end;
    height: 38px;
    padding: 4px 8px 0 8px;
    background: #161618;
    border-bottom: 1px solid #27272a;
    position: relative;
  }

  .tab-list {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }
  .tab-list::-webkit-scrollbar {
    display: none;
  }

  .browser-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 120px;
    max-width: 220px;
    height: 30px;
    padding: 0 8px 0 10px;
    background: #1f1f23;
    border: 1px solid #27272a;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
    position: relative;
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .browser-tab:hover:not(.active) {
    background: #27272e;
  }
  .browser-tab.active {
    background: #25252b;
    border-color: #3b3b44;
  }

  .tab-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tab-favicon-img {
    width: 14px;
    height: 14px;
    object-fit: contain;
  }

  .tab-spinner {
    width: 11px;
    height: 11px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #60a5fa;
    border-radius: 50%;
    animation: tabSpin 0.7s linear infinite;
  }
  @keyframes tabSpin {
    to { transform: rotate(360deg); }
  }

  .tab-title {
    flex: 1;
    font-size: 11.5px;
    font-weight: 500;
    color: #a1a1aa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .browser-tab.active .tab-title {
    color: #f4f4f5;
  }

  .tab-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #71717a;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .tab-close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #f4f4f5;
  }

  .new-tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    margin-bottom: 2px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .new-tab-btn:hover {
    background: #27272e;
    color: #f4f4f5;
  }

  /* ========================================================================= */
  /* MAIN TOOLBAR                                                              */
  /* ========================================================================= */
  .main-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    padding: 0 10px;
    background: #202024;
    border-bottom: 1px solid #2e2e33;
    flex-shrink: 0;
  }

  .nav-controls {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f4f4f5;
  }
  .tool-btn.spin {
    animation: tabSpin 0.8s linear infinite;
  }

  /* Omnibox / Address Bar */
  .omnibox-container {
    display: flex;
    align-items: center;
    flex: 1;
    height: 30px;
    background: #141416;
    border: 1px solid #2e2e33;
    border-radius: 16px;
    padding: 0 10px;
    gap: 7px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .omnibox-container.focused {
    border-color: #3b82f6;
    background: #18181b;
  }

  .omnibox-icon {
    display: flex;
    align-items: center;
    color: #71717a;
  }
  .omnibox-lock {
    color: #9aa0a6;
  }
  .omnibox-shield {
    color: #a855f7;
  }

  .omnibox-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #f4f4f5;
    font-size: 12px;
    outline: none;
    padding: 0;
  }
  .omnibox-input::placeholder {
    color: #52525b;
  }

  .omnibox-star {
    display: flex;
    align-items: center;
    color: #9aa0a6;
    cursor: pointer;
    padding: 2px;
  }
  .omnibox-star:hover {
    color: #f4f4f5;
  }

  .omnibox-clear {
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    color: #71717a;
    cursor: pointer;
    padding: 2px;
  }
  .omnibox-clear:hover {
    color: #f4f4f5;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .chrome-avatar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    color: #8ab4f8;
    cursor: pointer;
  }
  .chrome-avatar-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .kebab-btn.active {
    background: rgba(255, 255, 255, 0.15);
    color: #f4f4f5;
  }

  /* ========================================================================= */
  /* THREE-DOT OVERFLOW MENU PANEL                                             */
  /* ========================================================================= */
  .menu-dropdown-overlay {
    position: absolute;
    top: 80px;
    right: 12px;
    z-index: 2000;
  }

  .three-dot-menu {
    width: 300px;
    background: #1f1f23;
    border: 1px solid #2e2e33;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: menuFadeIn 0.12s ease-out;
  }
  @keyframes menuFadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .menu-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .menu-section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #a1a1aa;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 2px 4px;
  }

  .menu-divider {
    height: 1px;
    background: #27272a;
    margin: 2px 0;
  }

  .impersonation-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5px;
  }

  .impersonate-chip {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 9px;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 500;
    color: #d4d4d8;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .impersonate-chip:hover {
    background: #2e2e33;
    border-color: #3f3f46;
  }
  .impersonate-chip.selected {
    background: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
    color: #ffffff;
  }

  .chip-icon {
    width: 14px;
    height: 14px;
    object-fit: contain;
  }
  .chip-icon-globe {
    color: #a78bfa;
  }

  .inline-kbd {
    background: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 3px;
    padding: 0 4px;
    font-family: monospace;
    font-size: 10px;
    color: #e4e4e7;
  }

  .transport-pills {
    display: flex;
    gap: 4px;
  }
  .transport-pill {
    flex: 1;
    padding: 5px 0;
    font-size: 10px;
    font-weight: 600;
    text-align: center;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 4px;
    color: #a1a1aa;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }
  .transport-pill:hover {
    background: #2e2e33;
    color: #f4f4f5;
  }
  .transport-pill.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: #ffffff;
  }

  .menu-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .menu-action-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 8px;
    background: #242429;
    border: 1px solid transparent;
    border-radius: 5px;
    color: #d4d4d8;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .menu-action-btn:hover {
    background: #2e2e33;
    border-color: #3f3f46;
    color: #f4f4f5;
  }
  .menu-action-btn .btn-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .badge-sub {
    font-size: 10px;
    color: #71717a;
  }

  .zoom-quick-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .zoom-chip {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 0;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 4px;
    font-size: 10.5px;
    color: #d4d4d8;
    cursor: pointer;
  }
  .zoom-chip:hover {
    background: #2e2e33;
  }
  .zoom-chip.active {
    border-color: #38bdf8;
    color: #38bdf8;
  }
  .reset-chip {
    color: #f59e0b;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 5px;
    cursor: pointer;
  }
  .toggle-row:hover {
    background: #2e2e33;
  }
  .toggle-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #d4d4d8;
  }
  .switch {
    width: 28px;
    height: 16px;
    background: #3f3f46;
    border-radius: 10px;
    position: relative;
    transition: background 0.15s ease;
  }
  .switch.on { background: #4ade80; }
  .switch-handle {
    width: 12px;
    height: 12px;
    background: #ffffff;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.15s ease;
  }
  .switch.on .switch-handle { transform: translateX(12px); }

  /* ========================================================================= */
  /* STEALTH CLOAK & COOKIES OVERLAYS                                          */
  /* ========================================================================= */
  .cloak-overlay {
    position: absolute;
    top: 80px;
    right: 12px;
    z-index: 2000;
  }
  .cloak-menu {
    width: 320px;
    background: #1c1c20;
    border: 1px solid #2e2e33;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid #2e2e33;
  }
  .menu-title-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .menu-title {
    font-size: 12px;
    font-weight: 700;
    color: #f4f4f5;
  }
  .close-btn {
    background: transparent;
    border: none;
    color: #a1a1aa;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .close-btn:hover { color: #f4f4f5; }
  .section-label {
    font-size: 11px;
    font-weight: 600;
    color: #a1a1aa;
    text-transform: uppercase;
  }
  .preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  .preset-card {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 5px;
    cursor: pointer;
  }
  .preset-card.selected {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.15);
  }
  .preset-icon {
    width: 16px;
    height: 16px;
    border-radius: 3px;
  }
  .preset-name {
    font-size: 11px;
    color: #d4d4d8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .panic-row {
    padding: 8px;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 5px;
  }
  .panic-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #d4d4d8;
  }
  .key-badge {
    background: #2e2e33;
    border: 1px solid #3f3f46;
    border-radius: 3px;
    padding: 1px 5px;
    font-family: monospace;
    font-weight: bold;
    color: #f59e0b;
  }

  /* Cookie Importer Modal */
  .cookie-menu {
    width: 360px;
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 8px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .cookie-desc {
    font-size: 11px;
    color: #a1a1aa;
    line-height: 1.4;
    margin: 0 0 8px 0;
  }
  .cookie-desc strong { color: #e4e4e7; }
  .cookie-desc code {
    background: #27272a;
    padding: 2px 4px;
    border-radius: 4px;
    color: #a78bfa;
    font-size: 10px;
  }
  .cookie-textarea {
    width: 100%;
    background: #121215;
    border: 1px solid #27272a;
    border-radius: 6px;
    color: #f4f4f5;
    font-family: monospace;
    font-size: 11px;
    padding: 8px;
    resize: vertical;
    box-sizing: border-box;
    outline: none;
  }
  .cookie-textarea:focus { border-color: #8b5cf6; }
  .cookie-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    padding: 6px 8px;
    border-radius: 4px;
    margin-top: 4px;
  }
  .cookie-status.success {
    background: rgba(74, 222, 128, 0.1);
    color: #4ade80;
    border: 1px solid rgba(74, 222, 128, 0.2);
  }
  .cookie-status.error {
    background: rgba(248, 113, 113, 0.1);
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.2);
  }
  .cookie-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .cookie-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    padding: 7px 12px;
    border-radius: 5px;
    cursor: pointer;
    border: none;
  }
  .cookie-btn.primary {
    background: #8b5cf6;
    color: #ffffff;
    flex: 1;
  }
  .cookie-btn.secondary {
    background: #27272a;
    color: #d4d4d8;
    border: 1px solid #3f3f46;
  }
  .cookie-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ========================================================================= */
  /* TAB FRAMES BODY (Zero Reload Architecture)                                */
  /* ========================================================================= */
  .browser-body {
    position: relative;
    flex: 1;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #18181b;
  }

  .browser-tab-frame {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    background: #18181b;
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    z-index: 1;
  }

  .browser-tab-frame.active {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
    z-index: 2;
  }

  /* ========================================================================= */
  /* BROWSER IMPERSONATION THEMES                                              */
  /* ========================================================================= */

  /* 1. GOOGLE CHROME IMPERSONATION */
  .theme-chrome .tab-strip {
    background: #1f1f1f;
    border-bottom: none;
    height: 40px;
    padding: 6px 8px 0 8px;
  }
  .theme-chrome .browser-tab {
    background: #242424;
    border: none;
    border-radius: 8px 8px 0 0;
    color: #e3e3e3;
    height: 34px;
    position: relative;
  }
  .theme-chrome .browser-tab:not(.active)::after {
    content: '';
    position: absolute;
    right: -2px;
    top: 8px;
    bottom: 8px;
    width: 1px;
    background: rgba(255, 255, 255, 0.12);
  }
  .theme-chrome .browser-tab.active {
    background: #35363a;
    color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  .theme-chrome .browser-tab.active::after {
    display: none;
  }
  .theme-chrome .main-toolbar {
    background: #35363a;
    border-bottom: 1px solid #282828;
    height: 44px;
  }
  .theme-chrome .omnibox-container {
    background: #202124;
    border: 1px solid transparent;
    border-radius: 20px;
    height: 32px;
  }
  .theme-chrome .omnibox-container.focused {
    border-color: #8ab4f8;
    box-shadow: 0 0 0 1px #8ab4f8;
  }

  /* 2. APPLE SAFARI IMPERSONATION */
  .theme-safari .tab-strip {
    background: #252526;
    border-bottom: 1px solid #1e1e1e;
    height: 38px;
    padding: 5px 8px 0 8px;
  }
  .theme-safari .browser-tab {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    height: 28px;
    margin-bottom: 4px;
  }
  .theme-safari .browser-tab.active {
    background: rgba(255, 255, 255, 0.16);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  }
  .theme-safari .main-toolbar {
    background: #202021;
    border-bottom: 1px solid #1a1a1a;
  }
  .theme-safari .omnibox-container {
    background: #2d2d2f;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    max-width: 580px;
    margin: 0 auto;
  }
  .theme-safari .omnibox-input {
    text-align: center;
  }
  .theme-safari .omnibox-container.focused .omnibox-input {
    text-align: left;
  }
  .safari-tab-icon {
    color: #38bdf8;
  }

  /* 3. MOZILLA FIREFOX IMPERSONATION */
  .theme-firefox .tab-strip {
    background: #1c1b22;
    border-bottom: 1px solid #2b2a33;
    height: 42px;
    padding: 6px 8px 0 8px;
  }
  .theme-firefox .browser-tab {
    background: transparent;
    border: none;
    border-radius: 6px;
    height: 32px;
    margin-bottom: 4px;
  }
  .theme-firefox .browser-tab:hover:not(.active) {
    background: #2b2a33;
  }
  .theme-firefox .browser-tab.active {
    background: #42414d;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.35);
  }
  .theme-firefox .main-toolbar {
    background: #2b2a33;
    border-bottom: 1px solid #1c1b22;
  }
  .theme-firefox .omnibox-container {
    background: #1c1b22;
    border: 1px solid #42414d;
    border-radius: 6px;
  }
  .theme-firefox .omnibox-container.focused {
    border-color: #00ddff;
    box-shadow: 0 0 0 1px #00ddff;
  }

  /* 4. NORMAL WOS DEFAULT IMPERSONATION */
  .theme-wos .tab-strip {
    background: #161618;
    border-bottom: 1px solid #27272a;
  }
  .theme-wos .browser-tab.active {
    background: #222227;
    border-color: #3f3f46;
  }
  .theme-wos .main-toolbar {
    background: #1c1c1f;
    border-bottom: 1px solid #27272a;
  }
  .theme-wos .omnibox-container {
    background: #121214;
    border: 1px solid #2e2e33;
    border-radius: 6px;
  }
  .theme-wos .omnibox-container.focused {
    border-color: #8b5cf6;
  }
  .wos-tab-icon {
    color: #a78bfa;
  }

  /* START PAGE STYLING (Ultra-clean Chrome Dark Style) */
  .start-page {
    display: none;
    width: 100%;
    height: 100%;
    background: #1f1f23;
    overflow-y: auto;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    box-sizing: border-box;
  }
  .start-page.active {
    display: flex;
  }
  .sj-main-container {
    max-width: 560px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    margin-top: -40px;
  }
  .brand-header {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .brand-title {
    font-size: 38px;
    font-weight: 600;
    color: #f4f4f5;
    margin: 0;
    letter-spacing: -0.5px;
  }
  .sj-search-container {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .sj-address-input {
    background: #2b2b30;
    font-family: inherit;
    padding: 0 20px;
    height: 44px;
    border: none;
    color: #ffffff;
    border-radius: 22px;
    outline: none;
    width: 100%;
    max-width: 480px;
    font-size: 14px;
    transition: background 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .sj-address-input:focus {
    background: #323238;
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4);
  }
  .sj-address-input::placeholder {
    color: #8e8e93;
  }
  .sj-shortcuts-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    width: 100%;
    max-width: 500px;
  }
  @media (max-width: 520px) {
    .sj-shortcuts-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .shortcut-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    border-radius: 8px;
    padding: 10px 4px;
    cursor: pointer;
    transition: background 0.15s;
    color: #e4e4e7;
  }
  .shortcut-box:hover {
    background: rgba(255, 255, 255, 0.07);
  }
  .shortcut-icon-tile {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: #2b2b30;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .shortcut-box:hover .shortcut-icon-tile {
    background: #34343a;
  }
  .shortcut-label {
    font-size: 11px;
    font-weight: 400;
    color: #a1a1aa;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 72px;
  }

  /* ========================================================================= */
  /* LANDING STYLE PILLS (3-DOT MENU)                                          */
  /* ========================================================================= */
  .landing-style-pills {
    display: flex;
    gap: 4px;
    padding: 2px;
    background: #18181b;
    border-radius: 6px;
    border: 1px solid #27272a;
  }
  .style-pill {
    flex: 1;
    background: transparent;
    border: none;
    border-radius: 4px;
    padding: 5px 2px;
    font-size: 11px;
    font-weight: 500;
    color: #a1a1aa;
    cursor: pointer;
    text-align: center;
    transition: all 0.12s ease;
  }
  .style-pill:hover {
    color: #f4f4f5;
    background: rgba(255, 255, 255, 0.05);
  }
  .style-pill.active {
    background: #3b82f6;
    color: #ffffff;
  }

  /* ========================================================================= */
  /* LANDING CUSTOMIZATION MODAL                                               */
  /* ========================================================================= */
  .landing-modal {
    max-width: 440px !important;
  }
  .landing-options-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px 18px 16px;
  }
  .landing-opt-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s, border-color 0.12s;
    color: #f4f4f5;
    width: 100%;
    box-sizing: border-box;
  }
  .landing-opt-card:hover {
    background: #323238;
    border-color: #52525b;
  }
  .landing-opt-card.selected {
    background: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
  }
  .opt-badge-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #18181b;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .opt-badge-icon.auto-icon {
    color: #38bdf8;
  }
  .opt-badge-icon.wos-icon {
    color: #a78bfa;
  }
  .opt-text-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    overflow: hidden;
  }
  .opt-name {
    font-size: 13px;
    font-weight: 600;
    color: #f4f4f5;
  }
  .opt-desc {
    font-size: 11px;
    color: #a1a1aa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .check-icon {
    color: #3b82f6;
    flex-shrink: 0;
  }

  /* ========================================================================= */
  /* 1. GOOGLE CHROME AUTHENTIC NEW TAB PAGE                                   */
  /* ========================================================================= */
  .start-page.style-chrome {
    background: #202124;
    color: #e8eaed;
    position: relative;
    padding: 0;
    align-items: flex-start;
    justify-content: center;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  }
  .chrome-ntp-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    box-sizing: border-box;
    overflow-y: auto;
  }
  .chrome-top-right-nav {
    position: absolute;
    top: 14px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 10;
  }
  .chrome-text-link {
    font-size: 13px;
    color: #e8eaed;
    cursor: pointer;
    text-decoration: none;
    opacity: 0.9;
  }
  .chrome-text-link:hover {
    text-decoration: underline;
    opacity: 1;
  }
  .chrome-apps-btn {
    background: transparent;
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
  }
  .chrome-apps-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .chrome-profile-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #8ab4f8;
    color: #202124;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .chrome-center-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 600px;
    margin-top: calc(14vh + 10px);
    gap: 28px;
    padding: 0 16px;
    box-sizing: border-box;
  }
  .google-logo {
    font-size: 78px;
    font-weight: 500;
    letter-spacing: -2.5px;
    line-height: 1;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  .g-blue   { color: #4285f4; }
  .g-red    { color: #ea4335; }
  .g-yellow { color: #fbbc05; }
  .g-green  { color: #34a853; }

  .chrome-search-box {
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 560px;
    height: 46px;
    background: #303134;
    border-radius: 24px;
    padding: 0 14px 0 18px;
    box-sizing: border-box;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.28);
    transition: background 0.15s, box-shadow 0.15s;
  }
  .chrome-search-box:hover, .chrome-search-box:focus-within {
    background: #3c4043;
    box-shadow: 0 2px 8px 1px rgba(0, 0, 0, 0.38);
  }
  .chrome-search-icon {
    color: #9aa0a6;
    margin-right: 12px;
    flex-shrink: 0;
  }
  .chrome-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e8eaed;
    font-size: 14px;
    font-family: inherit;
  }
  .chrome-search-input::placeholder {
    color: #9aa0a6;
  }
  .chrome-search-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .chrome-icon-btn {
    background: transparent;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.12s;
  }
  .chrome-icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .chrome-shortcuts-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px 24px;
    width: 100%;
    max-width: 480px;
  }
  .chrome-shortcut-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    border-radius: 8px;
    padding: 8px 4px;
    cursor: pointer;
    transition: background 0.15s;
    outline: none;
  }
  .chrome-shortcut-tile:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .chrome-circle-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #303134;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .chrome-shortcut-tile:hover .chrome-circle-icon {
    background: #3c4043;
  }
  .chrome-circle-icon.add-btn {
    color: #8ab4f8;
  }
  .chrome-tile-label {
    font-size: 12px;
    font-weight: 400;
    color: #e8eaed;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 82px;
  }
  .chrome-customize-pill {
    position: absolute;
    bottom: 16px;
    right: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #303134;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #8ab4f8;
    border-radius: 18px;
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .chrome-customize-pill:hover {
    background: #3c4043;
    color: #d2e3fc;
  }

  /* ========================================================================= */
  /* 2. MOZILLA FIREFOX AUTHENTIC NEW TAB PAGE (MATCHING EXACT FIREFOX SCREENSHOT) */
  /* ========================================================================= */
  .start-page.style-firefox {
    background: #fbfbfe;
    color: #15141a;
    padding: 0;
    align-items: stretch;
    justify-content: flex-start;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  .firefox-ntp-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Top Nav Bar (Brand on left, Weather card on right) */
  .ff-top-nav-bar {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 20px 32px 0 32px;
  }
  .ff-brand-left {
    display: flex;
    align-items: center;
    gap: 10px;
    user-select: none;
  }
  .ff-brand-logo {
    width: 32px;
    height: 32px;
  }
  .ff-brand-name {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: #15141a;
  }

  .ff-weather-card {
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    padding: 8px 14px 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 96px;
    box-sizing: border-box;
    cursor: default;
    user-select: none;
  }
  .ff-weather-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .ff-city {
    font-size: 11px;
    font-weight: 500;
    color: #5b5b66;
  }
  .ff-muted-dots {
    color: #8f8f9d;
    cursor: pointer;
  }
  .ff-weather-body {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ff-weather-cloud-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ff-weather-temp-col {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }
  .ff-temp-now {
    font-size: 15px;
    font-weight: 700;
    color: #15141a;
  }
  .ff-temp-range {
    font-size: 10px;
    color: #737373;
  }

  /* Centered Stream */
  .ff-page-stream {
    width: 100%;
    max-width: 860px;
    margin: 10px auto 40px auto;
    padding: 0 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
    box-sizing: border-box;
  }

  /* Firefox Search Bar with Google G Icon */
  .ff-search-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 10px;
  }
  .ff-search-pill {
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 620px;
    height: 48px;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 24px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    padding: 0 16px;
    box-sizing: border-box;
    transition: all 0.15s ease;
  }
  .ff-search-pill:focus-within {
    border-color: #0060df;
    box-shadow: 0 0 0 3px rgba(0, 96, 223, 0.2);
  }
  .ff-google-g {
    margin-right: 12px;
    flex-shrink: 0;
  }
  .ff-search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: #15141a;
    font-family: inherit;
  }
  .ff-search-input::placeholder {
    color: #737373;
  }

  /* Shortcuts Strip: 10 rounded tiles */
  .ff-shortcuts-strip {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    width: 100%;
  }
  .ff-shortcut-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 68px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px 2px;
    border-radius: 8px;
    transition: background 0.15s ease;
  }
  .ff-shortcut-btn:hover {
    background: rgba(0, 0, 0, 0.04);
  }
  .ff-square-tile {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    overflow: hidden;
  }
  .ff-shortcut-btn:hover .ff-square-tile {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  }
  .ff-amazon-a {
    font-size: 26px;
    font-weight: 800;
    color: #15141a;
    font-family: serif;
    line-height: 1;
  }
  .yellow-tile {
    background: #ffd207;
    border-color: #ffd207;
  }
  .orange-tile {
    background: #f38020;
    border-color: #f38020;
  }
  .ff-temu-txt {
    font-size: 11px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: -0.5px;
  }
  .white-tile {
    background: #ffffff;
  }
  .orange-soft-tile {
    background: #fff3e8;
    border-color: #ffd7b5;
  }
  .purple-tile {
    background: #ede9fe;
    border-color: #ddd6fe;
  }
  .star-tile {
    background: #fffbeb;
    border-color: #fde68a;
  }
  .blue-tile {
    background: #e0f2fe;
    border-color: #bae6fd;
  }
  .ff-s-title {
    margin-top: 6px;
    font-size: 11px;
    font-weight: 500;
    color: #15141a;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 66px;
  }
  .ff-s-sub {
    font-size: 10px;
    color: #737373;
    text-align: center;
    line-height: 1.1;
  }

  /* Section Containers */
  .ff-section-container {
    width: 100%;
    display: flex;
    flex-direction: column;
  }
  .ff-sec-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .ff-sec-left {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
  }
  .ff-sec-heading {
    font-size: 14px;
    font-weight: 600;
    color: #15141a;
  }
  .ff-chevron {
    color: #5b5b66;
    transition: transform 0.15s ease;
  }
  .ff-plus-icon {
    color: #5b5b66;
  }

  /* Widgets Grid */
  .ff-widgets-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    width: 100%;
  }
  @media (max-width: 800px) {
    .ff-widgets-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .ff-widget-card {
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    height: 115px;
    padding: 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  /* Green NEW badge */
  .ff-new-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .green-badge {
    background: #00875a;
    color: #ffffff;
  }
  .w-corner-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 2;
  }

  /* Card 1: Crossword */
  .crossword-card {
    justify-content: space-between;
  }
  .w-badge-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .w-card-title {
    font-size: 12px;
    font-weight: 600;
    color: #15141a;
  }
  .w-crossword-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .w-crossword-dots {
    display: grid;
    grid-template-columns: repeat(5, 8px);
    gap: 4px;
  }
  .c-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: #ddd6fe;
  }
  .w-crossword-action {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .c-sub {
    font-size: 11px;
    color: #737373;
  }
  .c-play-btn {
    background: #7057ff;
    color: #ffffff;
    border: none;
    border-radius: 14px;
    padding: 4px 18px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .c-play-btn:hover {
    background: #5b40e6;
  }

  /* Card 2: Wallpaper */
  .wallpaper-card {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #831843 100%),
      radial-gradient(circle at 70% 30%, #fbbf24 0%, transparent 60%);
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
  }
  .w-wallpaper-btn-wrap {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: auto;
  }
  .w-wallpaper-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(112, 87, 255, 0.9);
    backdrop-filter: blur(8px);
    color: #ffffff;
    border: none;
    border-radius: 16px;
    padding: 5px 14px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .w-wallpaper-btn:hover {
    background: #7057ff;
    transform: scale(1.03);
  }

  /* Card 3: Clock */
  .clock-card {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }
  .w-clock-cols {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    width: 100%;
    text-align: center;
  }
  .w-clock-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .c-city {
    font-size: 12px;
    font-weight: 700;
    color: #15141a;
  }
  .c-tz {
    font-size: 9px;
    color: #8f8f9d;
  }
  .c-time {
    font-size: 10px;
    font-weight: 600;
    color: #15141a;
    margin-top: 4px;
  }

  /* Card 4: Focus Timer */
  .timer-card {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .w-timer-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 6px;
  }
  .w-timer-play-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #ede9fe;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease;
    flex-shrink: 0;
  }
  .w-timer-play-btn:hover {
    background: #ddd6fe;
  }
  .w-timer-digits-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .w-minus, .w-plus {
    font-size: 14px;
    font-weight: 600;
    color: #8f8f9d;
    cursor: pointer;
    user-select: none;
    padding: 0 2px;
  }
  .w-minus:hover, .w-plus:hover {
    color: #7057ff;
  }
  .w-time-val {
    font-size: 14px;
    font-weight: 700;
    color: #15141a;
    font-variant-numeric: tabular-nums;
  }
  .w-timer-pills {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .w-timer-pill {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid #7057ff;
    color: #7057ff;
    background: transparent;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .w-timer-pill.active {
    background: #7057ff;
    color: #ffffff;
  }

  /* Show more widgets pill */
  .ff-show-more-row {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 10px;
  }
  .ff-show-more-pill {
    background: #e0e0e6;
    color: #2b2a33;
    border-radius: 14px;
    padding: 4px 14px;
    font-size: 11px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .ff-show-more-pill:hover {
    background: #d0d0d8;
  }

  /* Jump in to Firefox QR Banner */
  .ff-qr-card {
    width: 100%;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: center;
    gap: 20px;
    position: relative;
    box-sizing: border-box;
  }
  .ff-qr-graphic {
    flex-shrink: 0;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 8px;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ff-qr-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .ff-qr-title {
    font-size: 14px;
    font-weight: 700;
    color: #15141a;
    margin: 0 0 4px 0;
  }
  .ff-qr-desc {
    font-size: 12px;
    color: #5b5b66;
    margin: 0 0 10px 0;
    line-height: 1.4;
    max-width: 600px;
  }
  .ff-dismiss-pill {
    border: 1px solid #cfcfd8;
    background: #ffffff;
    color: #15141a;
    border-radius: 16px;
    padding: 4px 16px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .ff-dismiss-pill:hover {
    background: #f0f0f4;
  }
  .ff-qr-close-x {
    position: absolute;
    top: 12px;
    right: 14px;
    background: transparent;
    border: none;
    color: #5b5b66;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }
  .ff-qr-close-x:hover {
    color: #15141a;
    background: rgba(0, 0, 0, 0.04);
  }

  /* Popular Today Section */
  .ff-news-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    width: 100%;
  }
  @media (max-width: 800px) {
    .ff-news-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .ff-news-card {
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    display: flex;
    flex-direction: column;
  }
  .ff-news-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
  }
  .ff-news-img-box {
    height: 110px;
    width: 100%;
    background-size: cover;
    background-position: center;
  }
  .img-1 { background: linear-gradient(135deg, #1e293b, #334155); }
  .img-2 { background: linear-gradient(135deg, #0284c7, #06b6d4); }
  .img-3 { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
  .img-4 { background: linear-gradient(135deg, #b45309, #d97706); }
  .ff-news-caption {
    padding: 10px 12px;
  }
  .ff-news-headline {
    font-size: 12px;
    font-weight: 600;
    color: #15141a;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Floating Edit Button (Bottom Right Purple Circle with Pencil) */
  .ff-floating-edit {
    position: fixed;
    bottom: 24px;
    right: 28px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #9059ff;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(144, 89, 255, 0.45);
    border: none;
    cursor: pointer;
    z-index: 50;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .ff-floating-edit:hover {
    transform: scale(1.08);
    background: #7b3fe4;
  }

  /* ========================================================================= */
  /* 3. APPLE SAFARI AUTHENTIC START PAGE                                      */
  /* ========================================================================= */
  .start-page.style-safari {
    background: radial-gradient(circle at 50% 30%, #28282e 0%, #1a1a1d 100%);
    color: #ffffff;
    padding: 0;
    align-items: flex-start;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Icons', Helvetica, Arial, sans-serif;
  }
  .safari-ntp-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    box-sizing: border-box;
    overflow-y: auto;
    padding: 40px 24px 60px 24px;
  }
  .safari-stage {
    width: 100%;
    max-width: 660px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .safari-section-head h2 {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    letter-spacing: -0.3px;
  }
  .safari-favorites-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    width: 100%;
  }
  .safari-squircle-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  .safari-squircle-card:hover {
    transform: scale(1.05);
  }
  .safari-squircle-icon {
    width: 68px;
    height: 68px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  }
  .apple-bg   { background: #000000; }
  .icloud-bg  { background: linear-gradient(135deg, #007aff, #5856d6); }
  .google-bg  { background: #ffffff; }
  .yt-bg      { background: #ff0000; }
  .wiki-bg    { background: #ffffff; color: #000000; font-family: serif; font-size: 32px; font-weight: 700; }
  .safari-w   { font-family: serif; font-size: 32px; font-weight: 700; color: #000; }
  .discord-bg { background: #5865f2; }
  .github-bg  { background: #24292e; }
  .add-bg     { background: rgba(255, 255, 255, 0.08); border: 1px dashed rgba(255, 255, 255, 0.2); }
  .safari-squircle-label {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
  }
  .safari-privacy-wrapper {
    margin-top: 10px;
    width: 100%;
  }
  .safari-privacy-card {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(25px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 16px 20px;
    box-sizing: border-box;
  }
  .safari-shield-icon {
    flex-shrink: 0;
  }
  .safari-privacy-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .safari-card-title {
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
  }
  .safari-card-desc {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }
  .safari-sliders-btn {
    position: absolute;
    bottom: 20px;
    right: 24px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .safari-sliders-btn:hover {
    background: rgba(255, 255, 255, 0.16);
    color: #ffffff;
  }

  /* ========================================================================= */
  /* 4. WOS LANDING CUSTOMIZE BUTTON                                           */
  /* ========================================================================= */
  .wos-customize-pill {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 6px 14px;
    color: #a1a1aa;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .wos-customize-pill:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f4f4f5;
  }
</style>

