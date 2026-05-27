<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-svelte'

  export let windowId: string = ''

  const PROXY = 'https://wos-proxy.therealdominic84plays.workers.dev'
  const proxyUrl = (url: string) => `${PROXY}/?u=${encodeURIComponent(url)}`

  const SHORTCUTS = [
    { label: 'TikTok',    url: 'https://www.tiktok.com',        color: '#010101', emoji: '🎵' },
    { label: 'YouTube',   url: 'https://www.youtube.com',       color: '#ff0000', emoji: '▶' },
    { label: 'Twitch',    url: 'https://www.twitch.tv',         color: '#9146ff', emoji: '📺' },
    { label: 'Reddit',    url: 'https://www.reddit.com',        color: '#ff4500', emoji: '👾' },
    { label: 'Twitter',   url: 'https://twitter.com',           color: '#1da1f2', emoji: '🐦' },
    { label: 'Spotify',   url: 'https://open.spotify.com',      color: '#1db954', emoji: '🎧' },
    { label: 'GitHub',    url: 'https://github.com',            color: '#24292e', emoji: '🐙' },
    { label: 'Wikipedia', url: 'https://en.wikipedia.org',      color: '#3366cc', emoji: '📖' },
  ]

  let navHistory: string[] = []
  let historyIdx = -1

  // iframeSrc is the only thing that drives the iframe — only set on explicit user actions
  let iframeSrc = ''
  // displayUrl tracks the real in-page URL for the address bar (updated by postMessage)
  let displayUrl = ''

  let iframeEl: HTMLIFrameElement
  let iframeKey = 0
  let loading = false
  let addrVal = ''
  let addrFocused = false

  $: canBack    = historyIdx > 0
  $: canForward = historyIdx < navHistory.length - 1
  $: if (!addrFocused) addrVal = displayUrl

  function normUrl(raw: string): string {
    let t = raw.trim()
    if (!t) return ''
    if (!t.startsWith('http://') && !t.startsWith('https://')) {
      t = t.includes(' ') || !t.includes('.')
        ? `https://duckduckgo.com/?q=${encodeURIComponent(t)}`
        : 'https://' + t
    }
    return t
  }

  function navigate(raw: string, push = true) {
    const t = normUrl(raw)
    if (!t) return
    if (push) {
      navHistory = [...navHistory.slice(0, historyIdx + 1), t]
      historyIdx = navHistory.length - 1
    }
    displayUrl = t
    iframeSrc = proxyUrl(t)
    loading = true
  }

  function goBack() {
    if (!canBack) return
    historyIdx--
    displayUrl = navHistory[historyIdx]
    iframeSrc = proxyUrl(navHistory[historyIdx])
    loading = true
  }

  function goForward() {
    if (!canForward) return
    historyIdx++
    displayUrl = navHistory[historyIdx]
    iframeSrc = proxyUrl(navHistory[historyIdx])
    loading = true
  }

  function refresh() {
    if (!iframeSrc) return
    loading = true
    iframeKey++
  }

  function onAddrFocus(e: FocusEvent) {
    addrFocused = true
    addrVal = displayUrl
    setTimeout(() => (e.target as HTMLInputElement)?.select(), 0)
  }

  function onAddrBlur() { addrFocused = false }

  function onAddrKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      navigate(addrVal)
      ;(e.target as HTMLInputElement).blur()
    }
    if (e.key === 'Escape') {
      addrVal = displayUrl
      ;(e.target as HTMLInputElement).blur()
    }
  }

  function onMessage(e: MessageEvent) {
    if (e.data?.__wos === 'nav' && typeof e.data.url === 'string') {
      displayUrl = e.data.url
    }
  }

  function onFullscreenChange() {
    const fs = document.fullscreenElement
    if (fs && iframeEl && (fs === iframeEl || iframeEl.contains(fs))) iframeEl.focus()
  }

  onMount(() => {
    window.addEventListener('message', onMessage)
    document.addEventListener('fullscreenchange', onFullscreenChange)
  })
  onDestroy(() => {
    window.removeEventListener('message', onMessage)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
  })
</script>

<div class="browser">
  <div class="toolbar">
    <button class="nav-btn" class:disabled={!canBack}    on:click={goBack}    title="Back"><ArrowLeft  size={15} /></button>
    <button class="nav-btn" class:disabled={!canForward} on:click={goForward} title="Forward"><ArrowRight size={15} /></button>
    <button class="nav-btn" class:spin={loading}         on:click={refresh}   title="Refresh"><RefreshCw  size={13} /></button>

    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <input
      class="addr-bar"
      type="text"
      spellcheck="false"
      autocomplete="off"
      placeholder="Search or enter URL..."
      bind:value={addrVal}
      on:focus={onAddrFocus}
      on:blur={onAddrBlur}
      on:keydown={onAddrKeydown}
    />
  </div>

  {#if iframeSrc}
    {#key iframeKey}
      <iframe
        bind:this={iframeEl}
        src={iframeSrc}
        title="Browser"
        allow="autoplay; fullscreen"
        on:load={() => (loading = false)}
      ></iframe>
    {/key}
  {:else}
    <div class="newtab">
      <div class="nt-search-wrap">
        <input
          class="nt-search"
          placeholder="Search or enter URL..."
          spellcheck="false"
          autocomplete="off"
          on:keydown={(e) => { if (e.key === 'Enter') navigate((e.target as HTMLInputElement).value) }}
        />
      </div>
      <div class="tiles">
        {#each SHORTCUTS as s}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="tile" on:click={() => navigate(s.url)}>
            <div class="tile-icon" style="background:{s.color}">{s.emoji}</div>
            <span class="tile-label">{s.label}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .browser {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1a1a1a;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 8px;
    background: #2a2a2a;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }

  .nav-btn {
    width: 30px;
    height: 28px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.55);
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, color 0.1s;
    flex-shrink: 0;
  }
  .nav-btn:hover:not(.disabled) { background: rgba(255,255,255,0.1); color: #fff; }
  .nav-btn.disabled { opacity: 0.28; cursor: default; pointer-events: none; }

  .addr-bar {
    flex: 1;
    height: 28px;
    padding: 0 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 6px;
    color: rgba(255,255,255,0.85);
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: background 0.1s, border-color 0.1s;
    min-width: 0;
  }
  .addr-bar:focus {
    background: rgba(255,255,255,0.09);
    border-color: rgba(0,120,212,0.6);
  }
  .addr-bar::placeholder { color: rgba(255,255,255,0.25); }

  /* ── Iframe ── */
  iframe {
    flex: 1;
    border: none;
    width: 100%;
    background: #fff;
  }

  /* ── New tab page ── */
  .newtab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40px;
    background: #141414;
    padding: 24px;
    overflow-y: auto;
  }

  .nt-search-wrap { width: 100%; max-width: 520px; }

  .nt-search {
    width: 100%;
    padding: 12px 18px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px;
    color: #fff;
    font-size: 15px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s, background 0.15s;
    box-sizing: border-box;
  }
  .nt-search:focus {
    border-color: rgba(0,120,212,0.6);
    background: rgba(255,255,255,0.09);
  }
  .nt-search::placeholder { color: rgba(255,255,255,0.3); }

  .tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    width: 100%;
    max-width: 440px;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 10px 6px;
    border-radius: 10px;
    transition: background 0.12s;
  }
  .tile:hover { background: rgba(255,255,255,0.07); }

  .tile-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    flex-shrink: 0;
  }

  .tile-label {
    font-size: 12px;
    color: rgba(255,255,255,0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 64px;
  }

  :global(.spin) { animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
