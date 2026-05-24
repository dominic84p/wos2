<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import AppIcon from '../ui/AppIcon.svelte'
  import type { AppMeta } from '../../types'

  export let app: AppMeta
  export let x = 0
  export let y = 0
  export let selected = false

  const dispatch = createEventDispatcher()

  let focused = false
  let clicks = 0
  let clickTimer: ReturnType<typeof setTimeout>

  let dragging = false
  let startX = 0, startY = 0
  let moved = false

  function onMousedown(e: MouseEvent) {
    if (e.button !== 0) return
    focused = true
    dispatch('focus')
    startX = e.clientX
    startY = e.clientY
    moved = false
    dragging = true
    window.addEventListener('mousemove', onWindowMousemove)
    window.addEventListener('mouseup', onWindowMouseup, { once: true })
    e.preventDefault()
  }

  function onWindowMousemove(e: MouseEvent) {
    if (!dragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (!moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) moved = true
    if (moved) {
      dispatch('move', { x: x + dx, y: y + dy })
      startX = e.clientX
      startY = e.clientY
    }
  }

  function onWindowMouseup() {
    window.removeEventListener('mousemove', onWindowMousemove)
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
  }

  function globalClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest(`[data-appid="${app.id}"]`)) {
      focused = false
    }
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
  on:mousedown={onMousedown}
  tabindex="0"
>
  <AppIcon appId={app.id} size={44} />
  <div class="appName">{app.label}</div>
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
