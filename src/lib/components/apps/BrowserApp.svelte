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
  } from 'lucide-svelte'

  export let windowId: string = ''

  const PROXY_HOST = 'https://learning.dogegage.xyz'

  let selectedTransport: string = (typeof localStorage !== 'undefined' && localStorage.getItem('wos_proxy_transport')) || 'libcurl'
  let iframeSrc = `${PROXY_HOST}/?transport=${selectedTransport}`
  let loading = false
  let iframeEl: HTMLIFrameElement

  // Cookie Importer State
  let showCookieModal = false
  let cookieInput = ''
  let cookieStatusMsg = ''
  let cookieStatusType: 'success' | 'error' | '' = ''

  function parseCookies(input: string): Array<{ name: string; value: string; domain?: string; path?: string }> {
    const trimmed = input.trim().replace(/^["']|["']$/g, '')
    if (!trimmed) return []

    // 0. Discord Token Detection (standard 3-part base64 token or mfa token)
    if (/^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{20,}$/.test(trimmed) || (trimmed.startsWith('mfa.') && trimmed.length > 40)) {
      return [{ name: '__discord_token__', value: trimmed, path: '/' }]
    }

    // 1. Try JSON Array (e.g. Cookie-Editor / EditThisCookie export)
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            name: item.name || item.key || '',
            value: item.value || '',
            domain: item.domain || '',
            path: item.path || '/',
          })).filter(c => c.name && c.value)
        }
      } catch {}
    }

    // 2. Try JSON Object (e.g. { "cookie_name": "cookie_value" } or { "token": "..." })
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        return Object.entries(parsed).map(([name, value]) => ({
          name,
          value: String(value),
          path: '/',
        })).filter(c => c.name && c.value)
      } catch {}
    }

    // 3. Header / Semi-colon separated format (e.g. "name=value; name2=val2")
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
      cookieStatusMsg = 'Could not parse any cookies or token. Please check your format.'
      cookieStatusType = 'error'
      return
    }

    try {
      const isToken = parsed.length === 1 && parsed[0].name === '__discord_token__'
      if (iframeEl && iframeEl.contentWindow) {
        iframeEl.contentWindow.postMessage(
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
        ? 'Discord Token detected! Logging into account...' 
        : `Successfully injected ${parsed.length} cookie(s)! Reloading...`
      cookieStatusType = 'success'
      setTimeout(() => {
        showCookieModal = false
        cookieInput = ''
        cookieStatusMsg = ''
        if (isToken) {
          if (iframeEl) {
            iframeEl.src = `${PROXY_HOST}/scramjet/${encodeURIComponent('https://discord.com/app')}`
          }
        } else {
          try {
            if (iframeEl && iframeEl.contentWindow) {
              iframeEl.contentWindow.location.reload()
            } else {
              refresh()
            }
          } catch (e) {
            if (iframeEl && iframeEl.src && !iframeEl.src.endsWith('/')) {
              iframeEl.src = iframeEl.src
            } else {
              refresh()
            }
          }
        }
      }, 750)
    } catch (err: any) {
      cookieStatusMsg = `Import error: ${err?.message || 'Failed to inject'}`
      cookieStatusType = 'error'
    }
  }

  function handleTransportChange() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wos_proxy_transport', selectedTransport)
    }
    loading = true
    if (iframeEl) {
      iframeEl.src = `${PROXY_HOST}/?transport=${selectedTransport}&t=${Date.now()}`
    }
  }

  // Render scale / zoom controls
  let renderScale: number = 1.0
  const SCALE_STEPS = [0.5, 0.67, 0.75, 0.85, 0.9, 1.0, 1.1, 1.25, 1.5]
  let showZoomMenu = false

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
    showZoomMenu = false
  }

  function setScale(val: number) {
    renderScale = val
    showZoomMenu = false
  }

  interface CloakPreset {
    id: string
    name: string
    title: string
    icon: string
  }

  const CLOAKS: CloakPreset[] = [
    { id: 'none', name: 'Default (WOS)', title: 'WOS', icon: '/favicon.png' },
    { id: 'classroom', name: 'Google Classroom', title: 'Home', icon: 'https://ssl.gstatic.com/classroom/favicon.png' },
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

  function goHome() {
    loading = true
    if (iframeEl) {
      iframeEl.src = `${PROXY_HOST}/?transport=${selectedTransport}&t=${Date.now()}`
    }
  }

  function goBack() {
    try {
      iframeEl?.contentWindow?.history.back()
    } catch {}
  }

  function goForward() {
    try {
      iframeEl?.contentWindow?.history.forward()
    } catch {}
  }

  function refresh() {
    if (iframeEl) {
      loading = true
      iframeEl.src = `${PROXY_HOST}/?transport=${selectedTransport}&t=${Date.now()}`
    }
  }

  function onIframeLoad() {
    loading = false
  }

  function openAboutBlank() {
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

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === panicKey) {
      e.preventDefault()
      window.location.href = panicUrl
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '-' || e.key === '_') {
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

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    if (window.onbeforeunload) window.onbeforeunload = null
  })
</script>

<div class="browser-window">
  <!-- Minimal Top Toolbar with 5px corners -->
  <div class="top-toolbar">
    <div class="nav-group">
      <button class="tool-btn" on:click={goBack} title="Back">
        <ArrowLeft size={15} />
      </button>
      <button class="tool-btn" on:click={goForward} title="Forward">
        <ArrowRight size={15} />
      </button>
      <button class="tool-btn" class:spin={loading} on:click={refresh} title="Reload">
        <RotateCw size={13} />
      </button>
      <button class="tool-btn" on:click={goHome} title="Home">
        <Home size={14} />
      </button>

      <div class="divider"></div>

      <!-- Render Scale / Zoom Toggle -->
      <div class="zoom-controls">
        <button class="tool-btn-sm" on:click={zoomOut} title="Zoom Out (Ctrl -)">
          <Minus size={12} />
        </button>
        <button
          class="zoom-badge"
          class:scaled={renderScale !== 1}
          on:click={() => (showZoomMenu = !showZoomMenu)}
          title="Render Scale Presets"
        >
          {Math.round(renderScale * 100)}%
        </button>
        <button class="tool-btn-sm" on:click={zoomIn} title="Zoom In (Ctrl +)">
          <Plus size={12} />
        </button>
        {#if renderScale !== 1}
          <button class="tool-btn-sm reset-btn" on:click={resetZoom} title="Reset to 100% (Ctrl 0)">
            <RotateCcw size={11} />
          </button>
        {/if}
      </div>
    </div>

    <div class="app-title-badge">
      <span class="app-title">Learning Hub</span>
    </div>

    <div class="action-group">
      <!-- About:Blank Popout Button -->
      <button class="cloak-btn" on:click={openAboutBlank} title="Open in about:blank (GoGuardian Bypasser)">
        <ExternalLink size={13} />
        <span>about:blank</span>
      </button>

      <!-- Cloak & Stealth Settings Menu -->
      <button
        class="cloak-btn"
        class:active={showCloakMenu}
        on:click={() => (showCloakMenu = !showCloakMenu)}
        title="Tab Disguises & Panic Key"
      >
        <EyeOff size={13} />
        <span>Cloak</span>
      </button>

      <!-- Cookie Importer Button -->
      <button
        class="cloak-btn"
        class:active={showCookieModal}
        on:click={() => (showCookieModal = !showCookieModal)}
        title="Import Site Cookies"
      >
        <Cookie size={13} />
        <span>Cookies</span>
      </button>

      <div class="transport-control" title="Proxy Backend Transport">
        <ShieldCheck size={13} />
        <select
          class="transport-select"
          bind:value={selectedTransport}
          on:change={handleTransportChange}
        >
          <option value="bare">Bare</option>
          <option value="libcurl">Wisp (Libcurl)</option>
          <option value="epoxy">Wisp (Epoxy)</option>
        </select>
        <span class="dot"></span>
      </div>
    </div>
  </div>

  <!-- Zoom Presets Dropdown Panel -->
  {#if showZoomMenu}
    <div class="zoom-overlay" on:click={() => (showZoomMenu = false)}>
      <div class="zoom-menu" on:click|stopPropagation>
        <div class="zoom-header">
          <span>Render Scale / Zoom</span>
          <button class="close-btn" on:click={() => (showZoomMenu = false)}>
            <X size={13} />
          </button>
        </div>
        <div class="zoom-grid">
          {#each [0.5, 0.67, 0.75, 0.85, 1.0, 1.25, 1.5] as scale}
            <button
              class="zoom-item"
              class:selected={renderScale === scale}
              on:click={() => setScale(scale)}
            >
              <span class="zoom-pct">{Math.round(scale * 100)}%</span>
              <span class="zoom-hint">
                {scale === 0.5 ? 'Ultra Wide' : scale === 0.75 ? 'Dense UI' : scale === 1 ? 'Default' : scale === 1.25 ? 'Large' : ''}
              </span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Stealth Cloak Dropdown Panel -->
  {#if showCloakMenu}
    <div class="cloak-overlay" on:click={() => (showCloakMenu = false)}>
      <div class="cloak-menu" on:click|stopPropagation>
        <div class="menu-header">
          <div class="menu-title-group">
            <EyeOff size={15} class="header-icon" />
            <span class="menu-title">Stealth Cloaking & Anti-Filter</span>
          </div>
          <button class="close-btn" on:click={() => (showCloakMenu = false)}>
            <X size={14} />
          </button>
        </div>

        <div class="menu-section">
          <label class="section-label">Tab Disguise Presets</label>
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
          <label class="section-label">Panic Button (HotKey)</label>
          <div class="panic-row">
            <div class="panic-info">
              <Zap size={14} class="panic-icon" />
              <span>Press <kbd class="key-badge">{panicKey}</kbd> to instantly redirect to Classroom</span>
            </div>
          </div>
        </div>

        <div class="menu-section">
          <div class="toggle-row" on:click={toggleAntiClose}>
            <div class="toggle-info">
              <Lock size={14} />
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

  <!-- Browser Frame with High-DPI Virtual Viewport Scaling -->
  <div class="browser-body">
    <iframe
      bind:this={iframeEl}
      src={iframeSrc}
      class="browser-frame"
      style="width: {renderScale === 1 ? '100%' : `calc(100% / ${renderScale})`}; height: {renderScale === 1 ? '100%' : `calc(100% / ${renderScale})`}; transform: {renderScale === 1 ? 'none' : `scale(${renderScale})`}; transform-origin: 0 0;"
      title="Learning Hub"
      allow="autoplay; fullscreen; clipboard-read; clipboard-write; camera; microphone; geolocation"
      on:load={onIframeLoad}
    ></iframe>
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    user-select: none;
    overflow: hidden;
    position: relative;
  }

  /* Top Toolbar with 5px corners */
  .top-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: #202024;
    border-bottom: 1px solid #2e2e33;
    flex-shrink: 0;
    gap: 8px;
  }

  .nav-group {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .action-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 5px;
    border: none;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .tool-btn:hover {
    background: #2e2e33;
    color: #f4f4f5;
  }

  .divider {
    width: 1px;
    height: 18px;
    background: #2e2e33;
    margin: 0 4px;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 5px;
    padding: 1px 2px;
  }

  .tool-btn-sm {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .tool-btn-sm:hover {
    background: #2e2e33;
    color: #f4f4f5;
  }

  .reset-btn {
    color: #f59e0b;
  }

  .zoom-badge {
    background: transparent;
    border: none;
    font-size: 11px;
    font-weight: 700;
    color: #d4d4d8;
    padding: 0 4px;
    cursor: pointer;
    min-width: 34px;
    text-align: center;
    border-radius: 3px;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .zoom-badge:hover {
    background: #2e2e33;
    color: #f4f4f5;
  }
  .zoom-badge.scaled {
    color: #38bdf8;
  }

  /* Zoom Overlay & Menu */
  .zoom-overlay {
    position: absolute;
    top: 40px;
    left: 140px;
    z-index: 1000;
  }

  .zoom-menu {
    width: 200px;
    background: #202024;
    border: 1px solid #2e2e33;
    border-radius: 5px;
    padding: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .zoom-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 700;
    color: #f4f4f5;
    padding-bottom: 6px;
    border-bottom: 1px solid #2e2e33;
  }

  .zoom-grid {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .zoom-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 8px;
    background: #242429;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .zoom-item:hover {
    background: #2e2e33;
    border-color: #3f3f46;
  }
  .zoom-item.selected {
    background: rgba(56, 189, 248, 0.15);
    border-color: #38bdf8;
  }

  .zoom-pct {
    font-size: 11px;
    font-weight: 700;
    color: #f4f4f5;
  }

  .zoom-hint {
    font-size: 10px;
    color: #71717a;
    font-weight: 500;
  }

  .cloak-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    color: #d4d4d8;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }
  .cloak-btn:hover {
    background: #2e2e33;
    border-color: #3f3f46;
    color: #f4f4f5;
  }
  .cloak-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: #ffffff;
  }

  .spin {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    100% { transform: rotate(360deg); }
  }

  .app-title-badge {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: #f4f4f5;
    text-transform: lowercase;
  }

  .transport-control {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    color: #a1a1aa;
    transition: border-color 0.12s ease;
  }
  .transport-control:hover {
    border-color: #3f3f46;
  }
  .transport-select {
    background: transparent;
    border: none;
    color: #f4f4f5;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    padding: 0;
    font-family: inherit;
  }
  .transport-select option {
    background: #202024;
    color: #f4f4f5;
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 5px #4ade80;
  }

  /* Stealth Cloak Modal */
  .cloak-overlay {
    position: absolute;
    top: 40px;
    right: 10px;
    z-index: 1000;
  }

  .cloak-menu {
    width: 320px;
    background: #202024;
    border: 1px solid #2e2e33;
    border-radius: 5px;
    padding: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
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
    border-radius: 5px;
    padding: 2px;
  }
  .close-btn:hover {
    color: #f4f4f5;
    background: #2e2e33;
  }

  .menu-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    color: #a1a1aa;
    text-transform: uppercase;
    letter-spacing: 0.5px;
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
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .preset-card:hover {
    background: #2e2e33;
    border-color: #3f3f46;
  }
  .preset-card.selected {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.15);
  }

  .preset-icon {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    object-fit: contain;
  }

  .preset-name {
    font-size: 11px;
    font-weight: 500;
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
  .switch.on {
    background: #4ade80;
  }

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
  .switch.on .switch-handle {
    transform: translateX(12px);
  }

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
    animation: menuIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .cookie-desc {
    font-size: 11px;
    color: #a1a1aa;
    line-height: 1.4;
    margin: 0 0 8px 0;
  }
  .cookie-desc strong {
    color: #e4e4e7;
  }
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
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    padding: 8px;
    resize: vertical;
    box-sizing: border-box;
    line-height: 1.4;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .cookie-textarea:focus {
    border-color: #8b5cf6;
  }
  .cookie-textarea::placeholder {
    color: #52525b;
  }

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
    transition: all 0.15s ease;
    border: none;
  }
  .cookie-btn.primary {
    background: #8b5cf6;
    color: #ffffff;
    flex: 1;
  }
  .cookie-btn.primary:hover:not(:disabled) {
    background: #7c3aed;
  }
  .cookie-btn.secondary {
    background: #27272a;
    color: #d4d4d8;
    border: 1px solid #3f3f46;
  }
  .cookie-btn.secondary:hover:not(:disabled) {
    background: #3f3f46;
  }
  .cookie-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .browser-body {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #18181b;
  }

  .browser-frame {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
    background: #18181b;
  }
</style>

