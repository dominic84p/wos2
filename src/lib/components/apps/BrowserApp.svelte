<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Home,
    ShieldCheck,
  } from 'lucide-svelte'

  export let windowId: string = ''

  const PROXY_HOST = 'https://proxy.dogegage.xyz'

  let iframeSrc = `${PROXY_HOST}/`
  let loading = false
  let iframeEl: HTMLIFrameElement

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
      <span class="app-title">shit proxy</span>
    </div>

    <div class="status-chip" title="Connected to Scramjet Wisp & Cloudflare WARP">
      <ShieldCheck size={13} />
      <span>WARP Active</span>
      <span class="dot"></span>
    </div>
  </div>

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
  }

  .nav-group {
    display: flex;
    align-items: center;
    gap: 3px;
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
