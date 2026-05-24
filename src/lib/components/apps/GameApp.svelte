<script lang="ts">
  import { windows } from '../../stores/windows'
  export let windowId: string = ''
  $: gameUrl = $windows.find(w => w.id === windowId)?.gameUrl ?? ''
</script>

{#if gameUrl}
  <iframe
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
