<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { ripple } from '../../actions/ripple'
  import { windows } from '../../stores/windows'
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

  $: posStyle = win.maximized
    ? `top:0;left:0;width:100vw;height:calc(100vh - var(--taskbar-height));z-index:${win.zIndex}`
    : `top:${win.y}px;left:${win.x}px;width:${win.width}px;height:${win.height}px;z-index:${win.zIndex}`
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="floatTab window-enter"
  data-size={win.maximized ? 'full' : 'cstm'}
  data-hide={win.minimized}
  data-max={!win.minimized}
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
  </div>

  <div class="windowScreen">
    <slot />
    {#if dragging || resizing || !win.focused}
      <div
        class="iframe-shield"
        on:mousedown={() => windows.focus(win.id)}
      ></div>
    {/if}
  </div>

  {#if !win.maximized}
    <div class="resize-handle" on:mousedown={onResizeMousedown}></div>
  {/if}
</div>

<style>
  /* floatTab — ported from Win11React tabs.scss */
  .floatTab {
    position: absolute;
    display: flex;
    flex-direction: column;
    border-radius: var(--window-radius);
    border: 1px solid rgba(255,255,255,0.08);
    background: var(--window-bg);
    overflow: hidden;
    transition: box-shadow 0.2s ease, opacity 0.15s ease, transform 0.15s cubic-bezier(0.85,0.14,0.14,0.85);
    transform-origin: center;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }

  /* data-hide="true" — minimized state, from Win11React */
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

  /* Toolbar — title bar */
  .toolbar {
    height: var(--window-titlebar-height);
    background: #1f1f1f;
    display: flex;
    align-items: center;
    padding: 0 0 0 12px;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    cursor: default;
    user-select: none;
    -webkit-user-select: none;
  }

  .floatTab[data-focused="false"] .toolbar { background: #2a2a2a; }
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

  /* Window controls — Win11 style */
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

  .ctrl-btn img {
    filter: invert(1);
    opacity: 0.65;
    transition: opacity 0.1s;
  }

  .ctrl-btn:hover img { opacity: 1; }
  .close:hover img { filter: invert(1); opacity: 1; }

  .ctrl-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .close:hover    { background: #c42b1c !important;   color: #fff !important; }

  .floatTab[data-focused="false"] .ctrl-btn { color: rgba(255,255,255,0.3); }

  /* Window content */
  .windowScreen {
    flex: 1;
    overflow: hidden;
    position: relative;
    border-radius: 0 0 var(--window-radius) var(--window-radius);
  }

  .floatTab[data-size="full"] .windowScreen { border-radius: 0; }

  /* Iframe shield — blocks iframe events during drag/resize and when unfocused */
  .iframe-shield {
    position: absolute;
    inset: 0;
    z-index: 10;
    cursor: default;
  }

  /* Title icon */
  .title-icon {
    width: 16px; height: 16px;
    flex-shrink: 0;
    margin-right: 6px;
    display: flex; align-items: center; justify-content: center;
    opacity: 0.9;
  }

  .floatTab[data-focused="false"] .title-icon { opacity: 0.4; }

  /* Resize handle */
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
</style>
