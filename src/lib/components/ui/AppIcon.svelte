<script lang="ts">
  import { settings } from '../../stores/settings'
  import type { AppId } from '../../types'

  export let appId: AppId
  export let size: number = 48

  const ICONS: Partial<Record<AppId, string>> = {
    browser:     '/icons/edge.png',
    eaglercraft: '/icons/minecraft.png',
    music:       '/icons/groove.png',
    vscode:      '/icons/code.png',
    ide:         '/icons/terminal.png',
    terminal:    '/icons/terminal.png',
    discover:    '/icons/store.png',
    settings:    '/icons/settings.png',
    files:       '/icons/explorer.png',
    gamesfolder: '/icons/folder3d.png',
    codefolder:  '/icons/folder3d.png',
    notepad:     '/icons/notepad.png',
    paint:       '/icons/paint.png',
  }

  const GNOME_ICONS: Partial<Record<AppId, string>> = {
    browser:     '/icons/gnome/browser.svg',
    music:       '/icons/gnome/folder-music.svg',
    settings:    '/icons/gnome/settings.svg',
    files:       '/icons/gnome/files.svg',
    notepad:     '/icons/gnome/notepad.svg',
    vscode:      '/icons/gnome/terminal.svg',
    terminal:    '/icons/gnome/terminal.svg',
    discover:    '/icons/gnome/discover.svg',
    gamesfolder: '/icons/gnome/folder.svg',
    codefolder:  '/icons/gnome/folder-projects.svg',
    paint:       '/icons/gnome/paint.svg',
    eaglercraft: '/icons/minecraft.png',
  }

  const EMOJI_ICONS: Partial<Record<AppId, string>> = {
    browser:     '🌐',
    music:       '🎵',
    settings:    '✨',
    files:       '📁',
    notepad:     '📝',
    vscode:      '💻',
    terminal:    '🖥️',
    discover:    '🚀',
    gamesfolder: '🎮',
    codefolder:  '👨‍💻',
    paint:       '🎨',
    eaglercraft: '⛏️',
    ide:         '🤖',
    game:        '🕹️',
  }

  // Symbolic SVGs are black paths — invert to white for dark linux theme bg
  const GNOME_SYMBOLIC = new Set([
    'browser', 'settings', 'notepad', 'vscode', 'terminal',
    'discover', 'paint', 'files', 'music',
  ])

  $: emoji    = $settings.themeId === 'aislop' ? EMOJI_ICONS[appId] : undefined
  $: src      = ($settings.themeId === 'linux' ? GNOME_ICONS[appId] : undefined) ?? ICONS[appId]
  $: symbolic = $settings.themeId === 'linux' && GNOME_SYMBOLIC.has(appId)
</script>

{#if emoji}
  <span class="emoji-icon" style="font-size:{Math.round(size * 0.72)}px;line-height:1;filter:drop-shadow(0 0 6px rgba(168,85,247,0.7))">{emoji}</span>
{:else if src}
  <img
    {src}
    alt={appId}
    width={size}
    height={size}
    draggable="false"
    class="app-icon"
    class:symbolic
  />
{:else}
  <span style="font-size:{Math.round(size*0.6)}px;line-height:1">📁</span>
{/if}

<style>
  .app-icon {
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }

  /* Adwaita symbolic icons are black paths — make them white on the dark linux theme */
  .symbolic {
    filter: invert(1) brightness(0.88);
  }

  .emoji-icon {
    display: block;
    flex-shrink: 0;
    text-align: center;
    user-select: none;
    -webkit-user-select: none;
  }
</style>
