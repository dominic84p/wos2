<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  export let windowId: string = ''

  let iframeEl: HTMLIFrameElement

  const CHAT_URL = 'https://proxy.dogegage.xyz/?url=https://chat.dogegage.xyz'

  function onFullscreenChange() {
    const fs = document.fullscreenElement
    if (fs && iframeEl && (fs === iframeEl || iframeEl.contains(fs))) {
      iframeEl.focus()
    }
  }

  onMount(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
  })

  onDestroy(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
  })
</script>

<div class="chat-app">
  <iframe
    bind:this={iframeEl}
    src={CHAT_URL}
    title="DogeGage Chat"
    allow="camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay; fullscreen"
    allowfullscreen
  ></iframe>
</div>

<style>
  .chat-app {
    width: 100%;
    height: 100%;
    background: #18191c;
    overflow: hidden;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: #2f3136;
    display: block;
  }
</style>
