<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { ripple } from '../../actions/ripple'
  import { windows } from '../../stores/windows'
  import { settings } from '../../stores/settings'
  import AppIcon from '../ui/AppIcon.svelte'
  import type { WindowState } from '../../types'

  export let win: WindowState

  let el: HTMLElement
  let dragging = false
  let resizing = false
  let dragOffX = 0, dragOffY = 0
  let resizeStartX = 0, resizeStartY = 0
  let resizeStartW = 0, resizeStartH = 0

  function onTitlebarMousedown(e: MouseEvent) {
    if (win.maximized) return
    if ((e.target as HTMLElement).closest('button')) return
    dragging = true
    dragOffX = e.clientX - win.x
    dragOffY = e.clientY - win.y
    e.preventDefault()
  }

  function onTitlebarDblclick() { windows.toggleMaximize(win.id) }

  function onResizeMousedown(e: MouseEvent) {
    if (win.maximized) return
    resizing = true
    resizeStartX = e.clientX; resizeStartY = e.clientY
    resizeStartW = win.width; resizeStartH = win.height
    e.preventDefault(); e.stopPropagation()
  }

  function onMousemove(e: MouseEvent) {
    if (dragging) {
      const x = Math.max(0, Math.min(window.innerWidth  - win.width,  e.clientX - dragOffX))
      const y = Math.max(0, Math.min(window.innerHeight - 48 - win.height, e.clientY - dragOffY))
      windows.move(win.id, x, y)
    }
    if (resizing) {
      const w = Math.max(320, resizeStartW + (e.clientX - resizeStartX))
      const h = Math.max(200, resizeStartH + (e.clientY - resizeStartY))
      windows.resize(win.id, w, h)
    }
  }

  function onMouseup() { dragging = false; resizing = false }

  onMount(() => {
    window.addEventListener('mousemove', onMousemove)
    window.addEventListener('mouseup', onMouseup)
  })
  onDestroy(() => {
    window.removeEventListener('mousemove', onMousemove)
    window.removeEventListener('mouseup', onMouseup)
  })

  $: theme = $settings.themeId

  // Use --tb-* CSS vars so maximized windows respect taskbar position
  $: posStyle = win.maximized
    ? `top:var(--tb-top);left:var(--tb-left);width:calc(100vw - var(--tb-left) - var(--tb-right));height:calc(100vh - var(--tb-top) - var(--tb-bottom));z-index:${win.zIndex}`
    : `top:${win.y}px;left:${win.x}px;width:${win.width}px;height:${win.height}px;z-index:${win.zIndex}`
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="floatTab window-enter"
  data-size={win.maximized ? 'full' : 'cstm'}
  data-hide={win.minimized}
  data-focused={win.focused}
  style={posStyle}
  bind:this={el}
  on:mousedown={() => windows.focus(win.id)}
>
  <div
    class="toolbar"
    on:mousedown={onTitlebarMousedown}
    on:dblclick={onTitlebarDblclick}
  >
    {#if theme === 'linux'}
      <!-- GNOME: controls on left, no app icon, centered title -->
      <div class="win-controls gnome-controls" on:mousedown|stopPropagation>
        <button class="ctrl-btn gnome-close" use:ripple on:click={() => windows.close(win.id)} title="Close">
          <img src="/icons/ui/gnome-close.svg" alt="close" width="12" height="12" draggable="false" class="gnome-icon" />
        </button>
        <button class="ctrl-btn gnome-min" use:ripple on:click={() => windows.minimize(win.id)} title="Minimize">
          <img src="/icons/ui/gnome-minimize.svg" alt="minimize" width="12" height="12" draggable="false" class="gnome-icon" />
        </button>
        <button class="ctrl-btn gnome-max" use:ripple on:click={() => windows.toggleMaximize(win.id)} title={win.maximized ? 'Restore' : 'Maximize'}>
          <img src={win.maximized ? '/icons/ui/gnome-restore.svg' : '/icons/ui/gnome-maximize.svg'} alt="maximize" width="12" height="12" draggable="false" class="gnome-icon" />
        </button>
      </div>
      <span class="appFullName gnome-title">{win.title}</span>

    {:else if theme === 'hacker'}
      <!-- Hacker: text-only green brackets -->
      <div class="title-icon"><AppIcon appId={win.appId} size={16} /></div>
      <span class="appFullName">{win.title}</span>
      <div class="win-controls" on:mousedown|stopPropagation>
        <button class="ctrl-btn hk-btn hk-min" use:ripple on:click={() => windows.minimize(win.id)} title="Minimize">−</button>
        <button class="ctrl-btn hk-btn hk-max" use:ripple on:click={() => windows.toggleMaximize(win.id)} title={win.maximized ? 'Restore' : 'Maximize'}>□</button>
        <button class="ctrl-btn hk-btn hk-close" use:ripple on:click={() => windows.close(win.id)} title="Close">×</button>
      </div>

    {:else if theme === 'aislop'}
      <!-- AI Slop: macOS traffic-light gradient circles -->
      <div class="title-icon"><AppIcon appId={win.appId} size={16} /></div>
      <span class="appFullName">{win.title}</span>
      <div class="win-controls slop-controls" on:mousedown|stopPropagation>
        <button class="ctrl-btn slop-btn slop-min" use:ripple on:click={() => windows.minimize(win.id)} title="Minimize">
          <span class="slop-glyph">−</span>
        </button>
        <button class="ctrl-btn slop-btn slop-max" use:ripple on:click={() => windows.toggleMaximize(win.id)} title={win.maximized ? 'Restore' : 'Maximize'}>
          <span class="slop-glyph">{win.maximized ? '↙' : '↗'}</span>
        </button>
        <button class="ctrl-btn slop-btn slop-close" use:ripple on:click={() => windows.close(win.id)} title="Close">
          <span class="slop-glyph">✕</span>
        </button>
      </div>

    {:else}
      <!-- Default: Windows 11 png icons -->
      <div class="title-icon"><AppIcon appId={win.appId} size={16} /></div>
      <span class="appFullName">{win.title}</span>
      <div class="win-controls" on:mousedown|stopPropagation>
        <button class="ctrl-btn minimize" use:ripple on:click={() => windows.minimize(win.id)} title="Minimize">
          <img src="/icons/ui/minimize.png" alt="minimize" width="10" height="10" draggable="false" />
        </button>
        <button class="ctrl-btn maximize" use:ripple on:click={() => windows.toggleMaximize(win.id)} title={win.maximized ? 'Restore' : 'Maximize'}>
          <img src={win.maximized ? '/icons/ui/restore.png' : '/icons/ui/maximize.png'} alt={win.maximized ? 'restore' : 'maximize'} width="10" height="10" draggable="false" />
        </button>
        <button class="ctrl-btn close" use:ripple on:click={() => windows.close(win.id)} title="Close">
          <img src="/icons/ui/close.png" alt="close" width="10" height="10" draggable="false" />
        </button>
      </div>
    {/if}
  </div>

  <div class="windowScreen">
    <slot />
    {#if dragging || resizing || !win.focused}
      <div class="iframe-shield" on:mousedown={() => windows.focus(win.id)}></div>
    {/if}
  </div>

  {#if !win.maximized}
    <div class="resize-handle" on:mousedown={onResizeMousedown}></div>
  {/if}
</div>

<style>
  .floatTab {
    position: absolute;
    display: flex;
    flex-direction: column;
    border-radius: var(--window-radius);
    border: 1px solid var(--window-border);
    background: var(--window-bg);
    overflow: hidden;
    transition: box-shadow 0.2s ease, opacity 0.15s ease, transform 0.15s cubic-bezier(0.85,0.14,0.14,0.85);
    transform-origin: center;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }

  .floatTab[data-hide="true"] {
    transform: scale(0.85);
    opacity: 0;
    pointer-events: none;
  }

  .floatTab[data-size="full"] {
    border-radius: 0;
    border: none;
  }

  .floatTab[data-focused="true"] {
    box-shadow: 0 16px 56px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.07);
  }

  /* Toolbar */
  .toolbar {
    height: var(--window-titlebar-height);
    background: var(--window-titlebar-focus);
    display: flex;
    align-items: center;
    padding: 0 0 0 12px;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    cursor: default;
    user-select: none;
    -webkit-user-select: none;
  }

  .floatTab[data-focused="false"] .toolbar { background: var(--window-titlebar-bg); }
  .floatTab[data-size="full"] .toolbar { border-radius: 0; }

  .appFullName {
    flex: 1;
    font-size: 12px;
    font-weight: 400;
    color: rgba(255,255,255,0.85);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .floatTab[data-focused="false"] .appFullName { color: rgba(255,255,255,0.45); }

  .win-controls {
    display: flex;
    height: 100%;
    margin-left: auto;
  }

  .ctrl-btn {
    width: 46px;
    height: 100%;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.65);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s, color 0.1s;
    position: relative; overflow: hidden;
  }

  .ctrl-btn img { filter: invert(1); opacity: 0.65; transition: opacity 0.1s; }
  .ctrl-btn:hover img { opacity: 1; }
  .close:hover img { filter: invert(1); opacity: 1; }

  .ctrl-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .close:hover    { background: #c42b1c !important; color: #fff !important; }

  .floatTab[data-focused="false"] .ctrl-btn { color: rgba(255,255,255,0.3); }

  .windowScreen {
    flex: 1;
    overflow: hidden;
    position: relative;
    border-radius: 0 0 var(--window-radius) var(--window-radius);
  }

  .floatTab[data-size="full"] .windowScreen { border-radius: 0; }

  .iframe-shield {
    position: absolute;
    inset: 0;
    z-index: 10;
    cursor: default;
  }

  .title-icon {
    width: 16px; height: 16px;
    flex-shrink: 0;
    margin-right: 6px;
    display: flex; align-items: center; justify-content: center;
    opacity: 0.9;
  }

  .floatTab[data-focused="false"] .title-icon { opacity: 0.4; }

  .resize-handle {
    position: absolute;
    bottom: 0; right: 0;
    width: 18px; height: 18px;
    cursor: se-resize;
  }

  .resize-handle::after {
    content: '';
    position: absolute;
    bottom: 4px; right: 4px;
    width: 7px; height: 7px;
    border-right: 2px solid rgba(255,255,255,0.15);
    border-bottom: 2px solid rgba(255,255,255,0.15);
    border-radius: 1px;
    transition: border-color 0.15s;
  }

  .resize-handle:hover::after { border-color: rgba(255,255,255,0.4); }

  /* ── GNOME controls (Linux theme) ── */
  .gnome-controls {
    margin-left: 0;
    margin-right: 4px;
    gap: 2px;
  }

  .gnome-controls .ctrl-btn {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.15);
  }

  .gnome-controls .ctrl-btn:hover { background: rgba(255,255,255,0.22); }
  .gnome-controls .gnome-close:hover { background: #e01b24; border-color: #e01b24; }

  .gnome-icon { filter: invert(1); opacity: 0.8; }
  .gnome-controls .ctrl-btn:hover .gnome-icon { opacity: 1; }

  .gnome-title {
    text-align: center;
    flex: 1;
  }

  /* ── Hacker controls ── */
  .hk-btn {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: 700;
    width: 32px;
    color: #00ff41;
    background: transparent !important;
    border: none;
  }

  .hk-btn:hover { color: #fff !important; background: rgba(0,255,65,0.12) !important; }
  .hk-close:hover { color: #ff4040 !important; background: rgba(255,64,64,0.12) !important; }

  /* ── AI Slop controls ── */
  .slop-controls {
    gap: 6px;
    padding-right: 12px;
  }

  .slop-btn {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: visible;
    padding: 0;
    position: relative;
  }

  .slop-glyph {
    display: none;
    font-size: 8px;
    font-weight: 700;
    color: rgba(0,0,0,0.6);
    line-height: 1;
    position: absolute;
  }

  .slop-btn:hover .slop-glyph { display: block; }

  .slop-min   { background: linear-gradient(135deg, #f7971e, #ffd200); box-shadow: 0 0 6px rgba(247,151,30,0.6); }
  .slop-max   { background: linear-gradient(135deg, #56ab2f, #a8e063); box-shadow: 0 0 6px rgba(86,171,47,0.6); }
  .slop-close { background: linear-gradient(135deg, #ff416c, #ff4b2b); box-shadow: 0 0 6px rgba(255,65,108,0.6); }

  .slop-min:hover   { box-shadow: 0 0 10px rgba(247,151,30,0.9); }
  .slop-max:hover   { box-shadow: 0 0 10px rgba(86,171,47,0.9); }
  .slop-close:hover { box-shadow: 0 0 10px rgba(255,65,108,0.9); }

  /* ── AI Slop extra glow ── */
  :global([data-theme="aislop"]) .floatTab {
    box-shadow: 0 0 0 1px rgba(167,139,250,0.3),
                0 0 40px rgba(139,92,246,0.2),
                0 20px 60px rgba(0,0,0,0.65);
  }

  :global([data-theme="aislop"]) .floatTab[data-focused="true"] {
    box-shadow: 0 0 0 1px rgba(167,139,250,0.65),
                0 0 60px rgba(168,85,247,0.35),
                0 0 120px rgba(219,39,119,0.15),
                0 24px 64px rgba(0,0,0,0.75);
  }

  :global([data-theme="aislop"]) .toolbar {
    border-bottom: 1px solid rgba(167,139,250,0.25);
  }
</style>
