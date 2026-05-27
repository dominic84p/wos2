<script lang="ts">
  import { settings } from '../../stores/settings'
  import { windows } from '../../stores/windows'
  import Window from '../windows/Window.svelte'
  import Taskbar from './Taskbar.svelte'
  import DesktopIcon from './DesktopIcon.svelte'
  import ContextMenu from './ContextMenu.svelte'
  import BrowserApp from '../apps/BrowserApp.svelte'
  import MusicApp from '../apps/MusicApp.svelte'
  import SettingsApp from '../apps/SettingsApp.svelte'
  import DiscoverApp from '../apps/DiscoverApp.svelte'
  import IDEApp from '../apps/IDEApp.svelte'
  import VSCodeApp from '../apps/VSCodeApp.svelte'
  import EaglerApp from '../apps/EaglerApp.svelte'
  import GamesFolderApp from '../apps/GamesFolderApp.svelte'
  import GameApp from '../apps/GameApp.svelte'
  import CodeFolderApp from '../apps/CodeFolderApp.svelte'
  import FilesApp from '../apps/FilesApp.svelte'
  import NotepadApp from '../apps/NotepadApp.svelte'
  import PaintApp from '../apps/PaintApp.svelte'
  import HTMLPreviewApp from '../apps/HTMLPreviewApp.svelte'
  import TerminalApp from '../apps/TerminalApp.svelte'
  import type { AppId, AppMeta } from '../../types'

  const apps: AppMeta[] = [
    { id: 'browser',     label: 'Browser'   },
    { id: 'gamesfolder', label: 'Homework'  },
    { id: 'music',       label: 'Music'     },
    { id: 'codefolder',  label: 'Code'      },
    { id: 'files',       label: 'Files'     },
    { id: 'notepad',     label: 'Notepad'   },
    { id: 'paint',       label: 'Paint'     },
    { id: 'discover',    label: 'App Store' },
    { id: 'settings',    label: 'Settings'  },
  ]

  function launch(app: AppMeta) {
    if (app.id === 'gamesfolder') {
      const existing = $windows.find(w => w.appId === 'files' && w.initialPath === 'games')
      if (existing) { windows.focus(existing.id); return }
      windows.open('files', 'Homework', { initialPath: 'games' })
      return
    }
    if (app.id === 'codefolder') {
      const existing = $windows.find(w => w.appId === 'files' && w.initialPath === '/Code')
      if (existing) { windows.focus(existing.id); return }
      windows.open('files', 'Code', { initialPath: '/Code' })
      return
    }
    if (app.id === 'terminal') {
      windows.open('terminal', 'Terminal', { width: 750, height: 480 })
      return
    }
    const existing = $windows.find(w => w.appId === app.id)
    if (existing) { windows.focus(existing.id); return }
    windows.open(app.id, app.label)
  }

  function appComponent(id: AppId) {
    switch (id) {
      case 'browser':     return BrowserApp
      case 'music':       return MusicApp
      case 'settings':    return SettingsApp
      case 'discover':    return DiscoverApp
      case 'ide':         return IDEApp
      case 'vscode':      return VSCodeApp
      case 'eaglercraft': return EaglerApp
      case 'gamesfolder': return GamesFolderApp
      case 'game':        return GameApp
      case 'codefolder':  return CodeFolderApp
      case 'files':       return FilesApp
      case 'notepad':     return NotepadApp
      case 'paint':       return PaintApp
      case 'htmlpreview': return HTMLPreviewApp
      case 'terminal':    return TerminalApp
      default:            return null
    }
  }

  // ── Icon positions ────────────────────────────────────────────────
  const ICON_W = 82, ICON_H = 92, PAD = 10
  const GRID_W = 90, GRID_H = 96

  function initIconPositions(): Record<string, { x: number; y: number }> {
    const saved: Record<string, { x: number; y: number }> =
      JSON.parse(localStorage.getItem('wos-icon-pos') ?? 'null') ?? {}
    const maxH = window.innerHeight - 48 - PAD * 2
    let col = 0, row = 0
    for (const app of apps) {
      if (!saved[app.id]) {
        saved[app.id] = { x: PAD + col * ICON_W, y: PAD + row * ICON_H }
        row++
        if ((row + 1) * ICON_H > maxH) { row = 0; col++ }
      }
    }
    localStorage.setItem('wos-icon-pos', JSON.stringify(saved))
    return saved
  }

  let iconPositions = initIconPositions()

  function onIconMove(appId: string, pos: { x: number; y: number }) {
    const maxX = window.innerWidth - 74
    const maxY = window.innerHeight - 84 - 48
    iconPositions[appId] = {
      x: Math.max(0, Math.min(maxX, pos.x)),
      y: Math.max(0, Math.min(maxY, pos.y)),
    }
    iconPositions = { ...iconPositions }
  }

  function onIconMoveEnd(appId: string) {
    const pos = iconPositions[appId]
    if (pos) {
      iconPositions[appId] = {
        x: Math.round(pos.x / GRID_W) * GRID_W + PAD % GRID_W,
        y: Math.round(pos.y / GRID_H) * GRID_H + PAD % GRID_H,
      }
      iconPositions = { ...iconPositions }
    }
    localStorage.setItem('wos-icon-pos', JSON.stringify(iconPositions))
  }

  // ── Rubber-band selection ─────────────────────────────────────────
  let selStart: { x: number; y: number } | null = null
  let selEnd:   { x: number; y: number } | null = null
  let selectedIds = new Set<string>()

  $: selRect = selStart && selEnd ? {
    x: Math.min(selStart.x, selEnd.x),
    y: Math.min(selStart.y, selEnd.y),
    w: Math.abs(selEnd.x - selStart.x),
    h: Math.abs(selEnd.y - selStart.y),
  } : null

  $: if (selRect) {
    selectedIds = new Set(
      apps.filter(app => {
        const p = iconPositions[app.id]
        if (!p) return false
        return p.x < selRect!.x + selRect!.w &&
               p.x + 74 > selRect!.x &&
               p.y < selRect!.y + selRect!.h &&
               p.y + 84 > selRect!.y
      }).map(a => a.id)
    )
  }

  function onDesktopMousedown(e: MouseEvent) {
    const t = e.target as HTMLElement
    if (t.closest('.dskApp') || t.closest('.floatTab') || t.closest('.taskbar') || t.closest('.actmenu')) return
    if (e.button !== 0) return
    selStart = { x: e.clientX, y: e.clientY }
    selEnd   = { x: e.clientX, y: e.clientY }
    function onMove(ev: MouseEvent) { selEnd = { x: ev.clientX, y: ev.clientY } }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      selStart = null; selEnd = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function clearSelection() { selectedIds = new Set() }

  // ── Context menu ──────────────────────────────────────────────────
  let ctxX = 0, ctxY = 0, ctxOpen = false

  function onContextMenu(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.floatTab')) return
    e.preventDefault()
    ctxX = e.clientX; ctxY = e.clientY
    ctxOpen = true
  }

  function onCtxAction(e: CustomEvent<string>) {
    const id = e.detail
    if (id === 'settings')  launch({ id: 'settings', label: 'Settings'  })
    if (id === 'discover')  launch({ id: 'discover', label: 'App Store' })
    if (id === 'wallpaper') launch({ id: 'settings', label: 'Settings'  })
    if (id === 'files')     launch({ id: 'files',    label: 'Files'     })
  }

  $: isHacker  = $settings.themeId === 'hacker'
  $: isAislop  = $settings.themeId === 'aislop'

  // ── Background style ──────────────────────────────────────────────
  $: bgStyle = isHacker
    ? 'background: #020402'
    : isAislop
    ? 'background: linear-gradient(135deg, #0d0520 0%, #060d25 40%, #130528 70%, #060d25 100%)'
    : `background-image:url('${$settings.wallpaper}')`
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
  class="desktop"
  style={bgStyle}
  role="main"
  on:contextmenu={onContextMenu}
  on:mousedown={onDesktopMousedown}
>
  {#if isHacker}
    <!-- Hacker theme: the desktop IS the terminal -->
    <div
      class="hacker-desktop"
      style="top:var(--tb-top);bottom:var(--tb-bottom);left:var(--tb-left);right:var(--tb-right)"
    >
      <TerminalApp windowId="desktop" />
    </div>
  {:else}
    <div
      class="desktopCont"
      style="top:var(--tb-top);bottom:var(--tb-bottom);left:var(--tb-left);right:var(--tb-right)"
    >
      {#each apps as app (app.id)}
        <DesktopIcon
          {app}
          x={iconPositions[app.id]?.x ?? 10}
          y={iconPositions[app.id]?.y ?? 10}
          selected={selectedIds.has(app.id)}
          on:open={() => launch(app)}
          on:move={(e) => { clearSelection(); onIconMove(app.id, e.detail) }}
          on:moveend={() => onIconMoveEnd(app.id)}
          on:focus={clearSelection}
        />
      {/each}

      {#if selRect && selRect.w > 4 && selRect.h > 4}
        <div
          class="sel-rect"
          style="left:{selRect.x}px;top:{selRect.y}px;width:{selRect.w}px;height:{selRect.h}px"
        ></div>
      {/if}
    </div>
  {/if}

  {#each $windows as win (win.id)}
    <Window {win}>
      {#if appComponent(win.appId)}
        <svelte:component this={appComponent(win.appId)} windowId={win.id} />
      {/if}
    </Window>
  {/each}

  <Taskbar {apps} on:launch={(e) => launch(e.detail)} />

  {#if ctxOpen}
    <ContextMenu x={ctxX} y={ctxY} on:action={onCtxAction} on:close={() => ctxOpen = false} />
  {/if}
</div>

<style>
  .desktop {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    position: relative;
    overflow: hidden;
  }

  .desktopCont {
    position: absolute;
    pointer-events: none;
  }

  .hacker-desktop {
    position: absolute;
    pointer-events: all;
  }

  .sel-rect {
    position: absolute;
    pointer-events: none;
    background: rgba(0, 120, 212, 0.15);
    border: 1px solid rgba(0, 120, 212, 0.7);
    z-index: 150;
  }
</style>
