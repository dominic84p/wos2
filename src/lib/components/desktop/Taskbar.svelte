<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import { windows } from '../../stores/windows'
  import { settings } from '../../stores/settings'
  import { music, currentTrack } from '../../stores/music'
  import { Wifi, WifiOff, SkipBack, SkipForward, Play, Pause } from 'lucide-svelte'
  import { ripple } from '../../actions/ripple'
  import AppIcon from '../ui/AppIcon.svelte'
  import StartMenu from './StartMenu.svelte'
  import type { AppMeta } from '../../types'

  export let apps: AppMeta[]

  const dispatch = createEventDispatcher()

  let startMenuOpen = false
  let online = navigator.onLine
  let timeStr = ''
  let dateStr = ''

  let ctxWinId: string | null = null
  let ctxWinX = 0, ctxWinY = 0

  $: edge = $settings.taskbarEdge ?? 'bottom'
  $: isVert = edge === 'left' || edge === 'right'

  function updateClock() {
    const now = new Date()
    timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    dateStr = now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })
  }
  updateClock()
  setInterval(updateClock, 1000)

  const setOnline  = () => { online = true }
  const setOffline = () => { online = false }

  onMount(() => {
    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)
  })
  onDestroy(() => {
    window.removeEventListener('online', setOnline)
    window.removeEventListener('offline', setOffline)
  })

  function handleWinClick(winId: string, minimized: boolean, focused: boolean) {
    if (!minimized && focused) windows.minimize(winId)
    else windows.focus(winId)
  }

  function showDesktop() {
    $windows.forEach(w => { if (!w.minimized) windows.minimize(w.id) })
  }

  function onWinRightClick(e: MouseEvent, winId: string) {
    e.preventDefault()
    ctxWinId = winId
    ctxWinX = e.clientX
    ctxWinY = e.clientY
  }

  function closeWinCtx() { ctxWinId = null }

  $: ctxMenuStyle = (() => {
    const safeX = Math.min(ctxWinX, window.innerWidth - 164)
    const safeY = Math.min(ctxWinY, window.innerHeight - 130)
    switch (edge) {
      case 'top':   return `top:calc(var(--taskbar-height) + 4px);left:${safeX}px`
      case 'left':  return `top:${safeY}px;left:calc(var(--taskbar-height) + 4px)`
      case 'right': return `top:${safeY}px;right:calc(var(--taskbar-height) + 4px)`
      default:      return `bottom:calc(var(--taskbar-height) + 4px);left:${safeX}px`
    }
  })()
</script>

{#if startMenuOpen}
  <StartMenu
    {apps}
    taskbarEdge={edge}
    on:launch={(e) => { dispatch('launch', e.detail); startMenuOpen = false }}
    on:close={() => startMenuOpen = false}
  />
{/if}

<div class="taskbar" data-edge={edge}>
  <div class="taskcont">
    <div class="tsbar">

      <!-- Start button -->
      <button
        class="tsIcon start-btn"
        class:active={startMenuOpen}
        on:click={() => startMenuOpen = !startMenuOpen}
        use:ripple
        title="Start"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="0"  y="0"  width="7" height="7" rx="0.5" fill="currentColor"/>
          <rect x="9"  y="0"  width="7" height="7" rx="0.5" fill="currentColor"/>
          <rect x="0"  y="9"  width="7" height="7" rx="0.5" fill="currentColor"/>
          <rect x="9"  y="9"  width="7" height="7" rx="0.5" fill="currentColor"/>
        </svg>
      </button>

      <div class="ts-divider"></div>

      <!-- Open windows -->
      {#each $windows as win (win.id)}
        {@const isActive = win.focused && !win.minimized}
        {@const isOpen   = !win.minimized}
        <div class="tsIcon-wrap" title={win.title}>
          <button
            class="tsIcon"
            data-open={isOpen}
            data-active={isActive}
            on:click={() => handleWinClick(win.id, win.minimized, win.focused)}
            on:contextmenu={(e) => onWinRightClick(e, win.id)}
            use:ripple
          >
            <AppIcon appId={win.appId} size={24} />
          </button>
        </div>
      {/each}
    </div>

    <!-- Tray / right side -->
    <div class="taskright">
      {#if !isVert && $currentTrack && $windows.some(w => w.appId === 'music')}
        <div class="mini-player">
          <img src={$currentTrack.thumbnail} alt="" class="thumb" />
          <div class="track-info">
            <span class="track-title">{$currentTrack.title}</span>
            <span class="track-artist">{$currentTrack.artist}</span>
          </div>
          <div class="player-controls">
            <button use:ripple on:click={() => music.prev()}><SkipBack size={11}/></button>
            <button use:ripple on:click={() => $music.playing ? music.pause() : music.play()}>
              {#if $music.playing}<Pause size={11}/>{:else}<Play size={11}/>{/if}
            </button>
            <button use:ripple on:click={() => music.next()}><SkipForward size={11}/></button>
          </div>
        </div>
      {/if}

      <div class="tray-group">
        <div class="tray-icon" title={online ? 'Connected' : 'No connection'}>
          {#if online}<Wifi size={14}/>{:else}<WifiOff size={14} color="#e74c3c"/>{/if}
        </div>

        <div class="taskDate">
          <div>{timeStr}</div>
          {#if !isVert}<div>{dateStr}</div>{/if}
        </div>
      </div>

      {#if !isVert}
        <button class="graybd" title="Show desktop" on:click={showDesktop}></button>
      {/if}
    </div>
  </div>
</div>

<!-- Window context menu -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if ctxWinId}
  <div class="win-ctx-bd" on:click={closeWinCtx} on:contextmenu|preventDefault={closeWinCtx}></div>
  <menu class="win-ctx" style={ctxMenuStyle}>
    {#each $windows.filter(w => w.id === ctxWinId) as win}
      {#if win.minimized}
        <button class="win-ctx-opt" on:click={() => { windows.focus(win.id); closeWinCtx() }}>Restore</button>
      {:else}
        <button class="win-ctx-opt" on:click={() => { windows.minimize(win.id); closeWinCtx() }}>Minimize</button>
        <button class="win-ctx-opt" on:click={() => { windows.toggleMaximize(win.id); closeWinCtx() }}>
          {win.maximized ? 'Restore' : 'Maximize'}
        </button>
      {/if}
      <div class="win-ctx-hr"></div>
      <button class="win-ctx-opt danger" on:click={() => { windows.close(win.id); closeWinCtx() }}>Close</button>
    {/each}
  </menu>
{/if}

<style>
  /* ── Base taskbar ── */
  .taskbar {
    position: fixed;
    background: var(--taskbar-bg);
    -webkit-backdrop-filter: saturate(3) blur(20px);
    backdrop-filter: saturate(3) blur(20px);
    z-index: 10000;
  }

  /* ── Edge positions ── */
  .taskbar[data-edge="bottom"] {
    bottom: 0; left: 0; right: 0;
    height: var(--taskbar-height);
    border-top: 1px solid rgba(255,255,255,0.07);
  }
  .taskbar[data-edge="top"] {
    top: 0; left: 0; right: 0;
    height: var(--taskbar-height);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .taskbar[data-edge="left"] {
    top: 0; left: 0; bottom: 0;
    width: var(--taskbar-height);
    border-right: 1px solid rgba(255,255,255,0.07);
  }
  .taskbar[data-edge="right"] {
    top: 0; right: 0; bottom: 0;
    width: var(--taskbar-height);
    border-left: 1px solid rgba(255,255,255,0.07);
  }

  /* ── Container ── */
  .taskcont {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
  }

  .taskbar[data-edge="left"] .taskcont,
  .taskbar[data-edge="right"] .taskcont {
    flex-direction: column;
    align-items: center;
    padding: 4px 0;
  }

  /* ── App bar (left side / top in vertical) ── */
  .tsbar {
    height: 100%;
    display: flex;
    align-items: center;
    padding: 0 4px;
    gap: 2px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .taskbar[data-edge="left"] .tsbar,
  .taskbar[data-edge="right"] .tsbar {
    flex-direction: column;
    height: auto;
    width: 100%;
    flex: 1;
    padding: 2px 0;
    align-items: center;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* ── Divider ── */
  .ts-divider {
    width: 1px;
    height: 18px;
    background: rgba(255,255,255,0.1);
    margin: 0 4px;
    flex-shrink: 0;
  }

  .taskbar[data-edge="left"] .ts-divider,
  .taskbar[data-edge="right"] .ts-divider {
    width: 18px;
    height: 1px;
    margin: 2px 0;
  }

  /* ── tsIcon ── */
  .tsIcon-wrap { position: relative; }

  .tsIcon {
    position: relative;
    width: 40px;
    height: 40px;
    border: none;
    background: rgba(254,254,254,0);
    color: rgba(255,255,255,0.85);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s ease;
    overflow: hidden;
  }

  .tsIcon::after {
    content: '';
    position: absolute;
    display: block;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 3px;
    border-radius: 3px;
    background: #858585;
    transition: width 0.2s ease-in-out, background 0.2s ease-in-out;
  }

  .taskbar[data-edge="left"] .tsIcon::after,
  .taskbar[data-edge="right"] .tsIcon::after {
    bottom: auto;
    left: auto;
    transform: none;
    right: 2px;
    top: 50%;
    margin-top: -3px;
    width: 3px;
    height: 0;
  }

  .tsIcon[data-open="true"]::after   { width: 6px; }
  .tsIcon[data-active="true"]::after { width: 14px; background: var(--accent); }

  .taskbar[data-edge="left"] .tsIcon[data-open="true"]::after,
  .taskbar[data-edge="right"] .tsIcon[data-open="true"]::after   { height: 6px; width: 3px; }
  .taskbar[data-edge="left"] .tsIcon[data-active="true"]::after,
  .taskbar[data-edge="right"] .tsIcon[data-active="true"]::after { height: 14px; width: 3px; background: var(--accent); }

  .tsIcon:hover,
  .tsIcon[data-active="true"] { background: rgba(255,255,255,0.1); }

  .start-btn { color: rgba(255,255,255,0.85); }
  .start-btn:hover { background: rgba(255,255,255,0.1); }
  .start-btn.active { background: rgba(255,255,255,0.14); }
  .start-btn::after { display: none !important; }

  /* ── Right / tray ── */
  .taskright {
    position: absolute;
    top: 0; right: 0;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .taskbar[data-edge="left"] .taskright,
  .taskbar[data-edge="right"] .taskright {
    position: static;
    flex-direction: column;
    height: auto;
    align-items: center;
    padding-bottom: 4px;
    gap: 0;
  }

  /* Mini player */
  .mini-player {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 10px;
    background: rgba(255,255,255,0.06);
    border-radius: 6px;
    max-width: 190px;
  }
  .thumb { width: 22px; height: 22px; border-radius: 3px; object-fit: cover; flex-shrink: 0; }
  .track-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .track-title { font-size: 11px; font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .track-artist { font-size: 10px; color: rgba(255,255,255,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .player-controls { display: flex; gap: 1px; }
  .player-controls button {
    width: 20px; height: 20px; border: none; background: transparent;
    color: rgba(255,255,255,0.5); border-radius: 3px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .player-controls button:hover { color: #fff; background: rgba(255,255,255,0.1); }

  /* Tray group */
  .tray-group {
    display: flex;
    align-items: center;
    height: 100%;
    border-radius: 4px;
    cursor: default;
    transition: background 0.1s;
  }
  .tray-group:hover { background: rgba(255,255,255,0.08); }

  .taskbar[data-edge="left"] .tray-group,
  .taskbar[data-edge="right"] .tray-group {
    flex-direction: column;
    height: auto;
    padding: 4px 2px;
  }

  .tray-icon {
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.75);
  }

  .taskDate {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0 8px;
    height: 100%;
    font-size: 11px;
    color: var(--dark-txt);
  }

  .taskbar[data-edge="left"] .taskDate,
  .taskbar[data-edge="right"] .taskDate {
    padding: 2px 0;
    height: auto;
    font-size: 10px;
  }

  .taskDate div {
    width: 100%;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .graybd {
    border: solid 1px transparent;
    height: 1rem;
    width: 6px;
    background: transparent;
    cursor: pointer;
    margin: auto 0;
    border-radius: 0;
    transition: border-color 0.1s;
  }
  .graybd:hover {
    border: solid 1px transparent;
    border-width: 0 0 0 2px;
    border-color: #a1a1a1;
  }

  /* Window context menu */
  .win-ctx-bd {
    position: fixed;
    inset: 0;
    z-index: 10001;
  }

  .win-ctx {
    position: fixed;
    z-index: 10002;
    background: rgba(34,36,47,0.92);
    -webkit-backdrop-filter: saturate(2) blur(20px);
    backdrop-filter: saturate(2) blur(20px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 4px 0;
    min-width: 150px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    list-style: none;
    animation: ctx-in 0.08s ease-out;
  }

  @keyframes ctx-in {
    from { opacity: 0; transform: scale(0.96) translateY(4px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }

  .win-ctx-opt {
    height: 32px;
    box-sizing: border-box;
    padding: 4px 14px;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: default;
    margin: 2px 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    color: var(--txt-col);
    background: transparent;
    border: none;
    width: calc(100% - 12px);
    text-align: left;
    transition: background 0.08s;
  }

  .win-ctx-opt:hover { background: rgba(255,255,255,0.08); }
  .win-ctx-opt.danger { color: #ff6b6b; }
  .win-ctx-opt.danger:hover { background: rgba(196,43,28,0.25); }

  .win-ctx-hr {
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 4px 0;
  }
</style>
