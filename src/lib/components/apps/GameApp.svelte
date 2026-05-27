<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { windows } from '../../stores/windows'
  export let windowId: string = ''
  $: gameUrl = $windows.find(w => w.id === windowId)?.gameUrl ?? ''

  let iframeEl: HTMLIFrameElement

  function onFullscreenChange() {
    const fs = document.fullscreenElement
    if (fs && iframeEl && (fs === iframeEl || iframeEl.contains(fs))) {
      iframeEl.focus()
    }
  }

  onMount(() => document.addEventListener('fullscreenchange', onFullscreenChange))
  onDestroy(() => document.removeEventListener('fullscreenchange', onFullscreenChange))
</script>

{#if gameUrl}
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
