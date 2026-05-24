<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { ArrowLeft, ArrowRight, RefreshCw, Home, Lock, Globe } from 'lucide-svelte'

  export let windowId: string = ''

  const PROXY = 'https://wos-proxy.therealdominic84plays.workers.dev'

  function proxyUrl(url: string): string {
    return `${PROXY}/?u=${encodeURIComponent(url)}`
  }

  let history: string[] = []
  let historyIdx = -1

  let iframeEl: HTMLIFrameElement
  let loading = false

  let navOpen = false
  let navInput = ''

  $: currentUrl = history[historyIdx] ?? ''
  $: canBack    = historyIdx > 0
  $: canForward = historyIdx < history.length - 1
  $: isSecure   = currentUrl.startsWith('https://')
  $: domain     = (() => { try { return new URL(currentUrl).hostname } catch { return '' } })()

  function navigate(raw: string, pushHistory = true) {
    let target = raw.trim()
    if (!target) return
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = target.includes(' ') || !target.includes('.')
        ? `https://duckduckgo.com/?q=${encodeURIComponent(target)}`
        : 'https://' + target
    }
    if (pushHistory) {
      history = [...history.slice(0, historyIdx + 1), target]
      historyIdx = history.length - 1
    }
    loading = true
    navOpen = false
  }

  function goBack()    { if (canBack)    { historyIdx--; loading = true } }
  function goForward() { if (canForward) { historyIdx++; loading = true } }

  function refresh() {
    if (!currentUrl) return
    loading = true
    const u = currentUrl
    history[historyIdx] = ''
    history = [...history]
    setTimeout(() => { history[historyIdx] = u; history = [...history] }, 30)
  }

  function openNav() {
    navInput = currentUrl
    navOpen = true
  }

  function onLoad() { loading = false }

  function onMessage(e: MessageEvent) {
    if (e.data?.__wos === 'nav' && typeof e.data.url === 'string') {
      if (historyIdx >= 0) history[historyIdx] = e.data.url
      history = [...history]
    }
  }

  onMount(() => window.addEventListener('message', onMessage))
  onDestroy(() => window.removeEventListener('message', onMessage))

  navigate('https://duckduckgo.com')
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="browser" on:click={() => { if (navOpen) navOpen = false }} on:keydown={() => {}}>
  <div class="toolbar" on:click|stopPropagation>
    <button title="Back"    class:disabled={!canBack}    on:click={goBack}><ArrowLeft  size={15} /></button>
    <button title="Forward" class:disabled={!canForward} on:click={goForward}><ArrowRight size={15} /></button>
    <button title="Refresh" on:click={refresh}><RefreshCw size={13} class={loading ? 'spin' : ''} /></button>
    <button title="Home"    on:click={() => navigate('https://duckduckgo.com')}><Home size={13} /></button>

    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="domain-pill" on:click={openNav} title="Click to navigate">
      <span class="lock-icon">
        {#if isSecure}<Lock size={10} color="#4caf50" />{:else}<Globe size={10} color="#888" />{/if}
      </span>
      <span class="domain-text">{domain || 'New Tab'}</span>
    </div>

    {#if navOpen}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="nav-popup" on:click|stopPropagation>
        <!-- svelte-ignore a11y-autofocus -->
        <input
          class="nav-input"
          bind:value={navInput}
          autofocus
          placeholder="Search or enter URL..."
          spellcheck="false"
          autocomplete="off"
          on:keydown={(e) => {
            if (e.key === 'Enter') navigate(navInput)
            if (e.key === 'Escape') navOpen = false
          }}
          on:focus={(e) => (e.target as HTMLInputElement).select()}
        />
      </div>
    {/if}
  </div>

  {#if currentUrl}
    <iframe
      bind:this={iframeEl}
      src={proxyUrl(currentUrl)}
      title="Browser"
      allow="autoplay; fullscreen"
      on:load={onLoad}
    ></iframe>
  {:else}
    <div class="blank"></div>
  {/if}
</div>

<style>
  .browser {
    display: flex; flex-direction: column;
    height: 100%; background: #202020; position: relative;
  }

  .toolbar {
    display: flex; align-items: center; gap: 4px;
    padding: 5px 8px;
    background: #2a2a2a;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0; position: relative;
  }

  .toolbar button {
    width: 30px; height: 28px;
    border: none; background: transparent;
    color: rgba(255,255,255,0.6);
    border-radius: 5px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s, color 0.1s; flex-shrink: 0;
  }
  .toolbar button:hover:not(.disabled) { background: rgba(255,255,255,0.1); color: #fff; }
  .toolbar button.disabled { opacity: 0.3; cursor: default; }

  .domain-pill {
    flex: 1; display: flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px; padding: 0 12px; height: 28px;
    cursor: pointer; transition: background 0.1s, border-color 0.1s;
    min-width: 0;
  }
  .domain-pill:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.18);
  }
  .lock-icon { display: flex; align-items: center; flex-shrink: 0; }
  .domain-text {
    font-size: 13px; color: rgba(255,255,255,0.7);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .nav-popup {
    position: absolute; top: calc(100% + 6px); left: 80px; right: 8px;
    background: #2d2d2d;
    border: 1px solid rgba(0,120,212,0.6);
    border-radius: 8px; padding: 6px 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    z-index: 9999;
  }
  .nav-input {
    width: 100%; border: none; background: transparent; outline: none;
    color: #fff; font-size: 13px; font-family: inherit;
  }
  .nav-input::placeholder { color: rgba(255,255,255,0.3); }

  iframe { flex: 1; border: none; width: 100%; background: #fff; }
  .blank { flex: 1; background: #1a1a1a; }

  :global(.spin) { animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
