<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import AppIcon from '../ui/AppIcon.svelte'
  import { Folder, File, Film, Music, Image } from 'lucide-svelte'
  import RenameInput from '../ui/RenameInput.svelte'
  import type { AppMeta } from '../../types'

  export let app: AppMeta & { isCustomFile?: boolean; isFolder?: boolean; filePath?: string }
  export let x = 0
  export let y = 0
  export let selected = false
  export let renaming = false

  const dispatch = createEventDispatcher()

  let focused = false
  let clicks = 0
  let clickTimer: ReturnType<typeof setTimeout>

  let dragging = false
  let startX = 0, startY = 0
  let moved = false
  let activePointerId: number | null = null

  function onPointerdown(e: PointerEvent) {
    if (e.button !== 0) return
    const wasSelected = selected || focused
    focused = true
    dispatch('focus')
    startX = e.clientX
    startY = e.clientY
    moved = false
    dragging = true
    activePointerId = e.pointerId
    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId)
    } catch {}
    window.addEventListener('pointermove', onWindowPointermove)
    window.addEventListener('pointerup', onWindowPointerup, { once: true })
    window.addEventListener('pointercancel', onWindowPointerup, { once: true })
    e.preventDefault()
  }

  function onWindowPointermove(e: PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) moved = true
    if (moved) {
      dispatch('move', { x: x + dx, y: y + dy })
      startX = e.clientX
      startY = e.clientY
    }
  }

  function onWindowPointerup() {
    window.removeEventListener('pointermove', onWindowPointermove)
    if (!moved) {
      clicks++
      if (clicks === 1) {
        clickTimer = setTimeout(() => { clicks = 0 }, 380)
      } else if (clicks >= 2) {
        clearTimeout(clickTimer)
        clicks = 0
        dispatch('open')
      }
    } else {
      dispatch('moveend')
    }
    dragging = false
    moved = false
    activePointerId = null
  }

  function globalClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest(`[data-appid="${app.id}"]`)) {
      focused = false
    }
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    dispatch('contextmenu', { x: e.clientX, y: e.clientY })
  }

  onMount(() => window.addEventListener('click', globalClick))
  onDestroy(() => window.removeEventListener('click', globalClick))
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="dskApp"
  class:focused
  class:selected
  class:dragging={dragging && moved}
  data-appid={app.id}
  style="left:{x}px;top:{y}px"
  on:pointerdown={onPointerdown}
  on:mousedown={onPointerdown}
  on:contextmenu={onContextMenu}
  tabindex="0"
>
  {#if app.isCustomFile}
    {#if app.isFolder}
      <Folder size={40} color="#dcb67a" />
    {:else if app.label.match(/\.(mp4|webm|mov|m4v|mkv)$/i)}
      <Film size={40} color="#0078d4" />
    {:else if app.label.match(/\.(mp3|wav|ogg|flac|aac)$/i)}
      <Music size={40} color="#0078d4" />
    {:else if app.label.match(/\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/i)}
      <Image size={40} color="#58a6ff" />
    {:else if app.label.match(/\.wosa$/i)}
      <AppIcon appId={app.label.toLowerCase().includes('browser') ? 'browser' : (app.label.toLowerCase().includes('terminal') ? 'terminal' : (app.label.toLowerCase().includes('paint') ? 'paint' : (app.label.toLowerCase().includes('settings') ? 'settings' : (app.label.toLowerCase().includes('files') ? 'files' : 'notepad'))))} size={44} />
    {:else}
      <File size={40} color="#3584e4" />
    {/if}
  {:else}
    <AppIcon appId={app.id} size={44} />
  {/if}
  {#if renaming}
    <RenameInput name={app.label} isFile={app.isCustomFile && !app.isFolder}
      on:save={(e) => dispatch('rename', e.detail)} on:cancel={() => dispatch('renamecancel')} />
  {:else}
    <div class="appName">{app.label.replace(/\.wosa$/i, '')}</div>
  {/if}
</div>

<style>
  .dskApp {
    position: absolute;
    height: 84px;
    width: 74px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.8em;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    pointer-events: all;
    transition: background 150ms ease-in-out;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }

  .dskApp.dragging {
    opacity: 0.75;
    cursor: grabbing;
    z-index: 200;
    transition: none;
  }

  .dskApp:hover  { background: rgba(255,255,255,0.1); }
  .dskApp.focused,
  .dskApp.selected,
  .dskApp:focus  {
    background: rgba(0,120,212,0.28);
    border: 1px solid rgba(0,120,212,0.55);
    outline: none;
  }

  .appName {
    text-align: center;
    color: #fff;
    font-size: 11.5px;
    font-weight: 400;
    text-shadow: 0 1px 3px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.7);
    line-height: 1.3;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }
</style>
