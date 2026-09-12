<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { windows } from '../../stores/windows'
  import { getGameFromIDB } from '../../stores/installedGames'
  import { localfs } from '../../stores/localfs'
  import { get } from 'svelte/store'

  export let windowId: string = ''
  $: gameUrl = $windows.find(w => w.id === windowId)?.gameUrl ?? ''

  let iframeEl: HTMLIFrameElement
  let gameHtml: string | null = null
  let loading = false

  async function resolveGameContent(url: string) {
    if (!url) { gameHtml = null; return }

    if (url.startsWith('/wos-game-blob/')) {
      loading = true
      const filename = decodeURIComponent(url.replace('/wos-game-blob/', ''))

      // 1. Check mounted localfs
      const state = get(localfs)
      if (state.isMounted && state.rootHandle) {
        try {
          const text = await localfs.readFile(`/wos-games/${filename}`)
          if (text) {
            gameHtml = injectBase(text)
            loading = false
            return
          }
        } catch {}
      }

      // 2. Check IndexedDB
      try {
        const blob = await getGameFromIDB(filename)
        if (blob) {
          const text = await blob.text()
          gameHtml = injectBase(text)
          loading = false
          return
        }
      } catch {}

      loading = false
    } else {
      gameHtml = null
    }
  }

  function injectBase(html: string): string {
    const baseTag = `<base href="${window.location.origin}/games/">`
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head[^>]*>/i, `$&${baseTag}`)
    }
    return baseTag + html
  }

  $: resolveGameContent(gameUrl)

  function onFullscreenChange() {
    const fs = document.fullscreenElement
    if (fs && iframeEl && (fs === iframeEl || iframeEl.contains(fs))) {
      iframeEl.focus()
    }
  }

  onMount(() => document.addEventListener('fullscreenchange', onFullscreenChange))
  onDestroy(() => document.removeEventListener('fullscreenchange', onFullscreenChange))
</script>

{#if loading}
  <div class="err">Loading game...</div>
{:else if gameHtml}
  <iframe
    bind:this={iframeEl}
    srcdoc={gameHtml}
    title="Game"
    allow="autoplay; fullscreen; gamepad"
    allowfullscreen
  ></iframe>
{:else if gameUrl}
  <iframe
    bind:this={iframeEl}
    src={gameUrl}
    title="Game"
    allow="autoplay; fullscreen; gamepad"
    allowfullscreen
  ></iframe>
{:else}
  <div class="err">No game URL</div>
{/if}

<style>
  iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: #000;
    display: block;
  }
  .err {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: rgba(255,255,255,0.3);
    font-size: 13px;
  }
</style>
