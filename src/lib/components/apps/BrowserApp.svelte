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
    Zap,
    Lock,
    X,
  } from 'lucide-svelte'

  export let windowId: string = ''

  const PROXY_HOST = 'https://learning.dogegage.xyz'

  let iframeSrc = `${PROXY_HOST}/`
  let loading = false
  let iframeEl: HTMLIFrameElement

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
      iframeEl.src = `${PROXY_HOST}/?t=${Date.now()}`
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
      iframeEl.src = `${PROXY_HOST}/?t=${Date.now()}`
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

      <div class="status-chip" title="Connected to Scramjet Wisp & Cloudflare WARP">
        <ShieldCheck size={13} />
        <span>WARP Active</span>
        <span class="dot"></span>
      </div>
    </div>
  </div>

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

  <!-- Browser Frame -->
  <div class="browser-body">
    <iframe
      bind:this={iframeEl}
      src={iframeSrc}
      class="browser-frame"
      title="shit proxy"
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

  .status-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: #242429;
    border: 1px solid #2e2e33;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    color: #a1a1aa;
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

