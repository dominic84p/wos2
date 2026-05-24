<script lang="ts">
  import type { AppId } from '../../types'

  export let appId: AppId
  export let size: number = 48

  const ICONS: Partial<Record<AppId, string>> = {
    browser:     '/icons/edge.png',
    eaglercraft: '/icons/minecraft.png',
    music:       '/icons/groove.png',
    vscode:      '/icons/code.png',
    ide:         '/icons/terminal.png',
    discover:    '/icons/store.png',
    settings:    '/icons/settings.png',
    files:       '/icons/explorer.png',
    gamesfolder: '/icons/folder3d.png',
    codefolder:  '/icons/folder3d.png',
    notepad:     '/icons/notepad.png',
    paint:       '/icons/paint.png',
  }

  $: src = ICONS[appId]
</script>

{#if src}
  <img {src} alt={appId} width={size} height={size} draggable="false" class="app-icon" />
{:else}
  <span style="font-size:{Math.round(size*0.6)}px;line-height:1">📁</span>
{/if}

<style>
  .app-icon {
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }
</style>
