<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { settings } from '../../stores/settings'
  import { windows } from '../../stores/windows'
  import { customNames, vfs } from '../../stores/filesystem'
  import { localfs } from '../../stores/localfs'
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
  import DogegageChatApp from '../apps/DogegageChatApp.svelte'
  import MediaPlayerApp from '../apps/MediaPlayerApp.svelte'
  import type { AppId, AppMeta } from '../../types'


  function getBrowserLabel(): string {
    if (typeof localStorage !== 'undefined') {
      const mode = localStorage.getItem('wos_browser_impersonation')
      if (mode === 'chrome') return 'Google Chrome'
      if (mode === 'safari') return 'Safari'
      if (mode === 'firefox') return 'Mozilla Firefox'
    }
    return 'Browser'
  }

  let browserLabel = getBrowserLabel()

  function refreshBrowserLabel() {
    browserLabel = getBrowserLabel()
  }

  onMount(() => {
    window.addEventListener('wos_browser_theme_change', refreshBrowserLabel)
    window.addEventListener('storage', refreshBrowserLabel)

    function isDesktopDrop(event: DragEvent) {
      return event.composedPath().some(node =>
        node instanceof HTMLElement && node.classList.contains('desktop')
      )
    }

    function onGlobalDragEnter(e: DragEvent) {
      if (!isDesktopDrop(e)) return
      e.preventDefault()
      dropDepth += 1
      isDropTarget = true
    }

    function onGlobalDragOver(e: DragEvent) {
      // The browser chooses the red “not allowed” cursor unless the host
      // document cancels dragover. Do this before inspecting the exact child
      // under the pointer; iframe drags can cross the desktop through a child.
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    function onGlobalDragLeave(e: DragEvent) {
      if (!isDesktopDrop(e)) return
      dropDepth = Math.max(0, dropDepth - 1)
      if (dropDepth === 0) isDropTarget = false
    }

    function onGlobalDrop(e: DragEvent) {
      // A drag originating in a cross-origin iframe may be retargeted to the
      // outer document rather than to the visible desktop child. Once it has
      // reached this host document, treat it as a desktop drop.
      void handleDesktopDrop(e)
    }

    // Capture at the WOS host document. The browser iframe remains untouched;
    // once a drag leaves it, this is the first document that can own the drop.
    document.addEventListener('dragenter', onGlobalDragEnter, true)
    document.addEventListener('dragover', onGlobalDragOver, true)
    document.addEventListener('dragleave', onGlobalDragLeave, true)
    document.addEventListener('drop', onGlobalDrop, true)

    return () => {
      document.removeEventListener('dragenter', onGlobalDragEnter, true)
      document.removeEventListener('dragover', onGlobalDragOver, true)
      document.removeEventListener('dragleave', onGlobalDragLeave, true)
      document.removeEventListener('drop', onGlobalDrop, true)
    }
  })

  onDestroy(() => {
    window.removeEventListener('wos_browser_theme_change', refreshBrowserLabel)
    window.removeEventListener('storage', refreshBrowserLabel)
  })

  const baseApps: AppMeta[] = [
    { id: 'browser',      label: 'Browser'       },
    { id: 'dogegagechat', label: 'DogeGage Chat' },
    { id: 'gamesfolder',  label: 'Homework'      },
    { id: 'music',        label: 'Music'         },
    { id: 'codefolder',   label: 'Code'          },
    { id: 'files',        label: 'Files'         },
    { id: 'notepad',      label: 'Notepad'       },
    { id: 'paint',        label: 'Paint'         },
    { id: 'discover',     label: 'App Store'     },
    { id: 'settings',     label: 'Settings'      },
  ]

  type DynamicAppMeta = AppMeta & { isCustomFile?: boolean; isFolder?: boolean; filePath?: string }

  let desktopFiles: DynamicAppMeta[] = []

  async function refreshDesktopFiles() {
    let list: DynamicAppMeta[] = []
    if ($localfs.isMounted && $localfs.isRootMounted) {
      const entries = await localfs.listDir('/Desktop')
      list = entries.map(e => ({
        id: 'dsk_file_' + e.name,
        label: e.name,
        isCustomFile: true,
        isFolder: e.kind === 'directory',
        filePath: e.path.startsWith('/Desktop') ? e.path : '/Desktop/' + e.name
      }))
    } else {
      const entries = vfs.listDir('/Desktop')
      list = entries.map(e => ({
        id: 'dsk_file_' + e.name,
        label: e.name,
        isCustomFile: true,
        isFolder: e.type === 'dir',
        filePath: e.path
      }))
    }
    desktopFiles = list
    ensureIconPositions([...baseApps, ...desktopFiles])
  }

  $: if ($vfs || $localfs.isMounted || $localfs.isRootMounted || $localfs.entries) {
    refreshDesktopFiles()
  }

  $: apps = [...baseApps.map(a => {
    void $customNames
    const custom = customNames.getName(a.id, a.label)
    if (a.id === 'browser') {
      return { ...a, label: custom !== 'Browser' ? custom : browserLabel }
    }
    return { ...a, label: custom }
  }), ...desktopFiles]

  function launch(app: DynamicAppMeta) {
    if (app.isCustomFile && app.filePath) {
      if (app.isFolder) {
        windows.open('files', app.label, { initialPath: app.filePath })
        return
      }
      const isMedia = app.label.match(/\.(mp4|webm|mov|m4v|mkv|mp3|wav|ogg|flac|aac|m4a|avi|wmv)$/i)
      if (isMedia) {
        windows.open('mediaplayer', app.label, { filePath: app.filePath, width: 850, height: 550 })
        return
      }
      if (app.label.match(/\.html?$/i)) {
        windows.open('htmlpreview', app.label, { filePath: app.filePath, width: 900, height: 640 })
        return
      }
      windows.open('notepad', app.label, { filePath: app.filePath })
      return
    }

    if (app.id === 'browser') {
      const existing = $windows.find(w => w.appId === 'browser')
      if (existing) { windows.focus(existing.id); return }
      windows.open('browser', browserLabel, { width: 1100, height: 700 })
      return
    }
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
    if (app.id === 'dogegagechat') {
      const existing = $windows.find(w => w.appId === 'dogegagechat')
      if (existing) { windows.focus(existing.id); return }
      windows.open('dogegagechat', 'DogeGage Chat', { width: 960, height: 620 })
      return
    }
    const existing = $windows.find(w => w.appId === app.id)
    if (existing) { windows.focus(existing.id); return }
    windows.open(app.id, app.label)
  }

  function appComponent(id: AppId) {
    switch (id) {
      case 'browser':      return BrowserApp
      case 'dogegagechat': return DogegageChatApp
      case 'music':        return MusicApp
      case 'settings':     return SettingsApp
      case 'discover':     return DiscoverApp
      case 'ide':          return IDEApp
      case 'vscode':       return VSCodeApp
      case 'eaglercraft':  return EaglerApp
      case 'gamesfolder':  return GamesFolderApp
      case 'game':         return GameApp
      case 'codefolder':   return CodeFolderApp
      case 'files':        return FilesApp
      case 'notepad':      return NotepadApp
      case 'paint':        return PaintApp
      case 'htmlpreview':  return HTMLPreviewApp
      case 'terminal':     return TerminalApp
      case 'mediaplayer':  return MediaPlayerApp
      default:             return null

    }
  }

  // ── Icon positions ────────────────────────────────────────────────
  const ICON_W = 82, ICON_H = 92, PAD = 10
  const GRID_W = 90, GRID_H = 96

  function ensureIconPositions(all: DynamicAppMeta[]) {
    const saved: Record<string, { x: number; y: number }> =
      JSON.parse(localStorage.getItem('wos-icon-pos') ?? 'null') ?? {}
    const maxH = window.innerHeight - 48 - PAD * 2
    let col = 0, row = 0

    for (const app of all) {
      if (!saved[app.id]) {
        while (Object.values(saved).some(p => Math.abs(p.x - (PAD + col * ICON_W)) < 5 && Math.abs(p.y - (PAD + row * ICON_H)) < 5)) {
          row++
          if ((row + 1) * ICON_H > maxH) { row = 0; col++ }
        }
        saved[app.id] = { x: PAD + col * ICON_W, y: PAD + row * ICON_H }
        row++
        if ((row + 1) * ICON_H > maxH) { row = 0; col++ }
      }
    }
    localStorage.setItem('wos-icon-pos', JSON.stringify(saved))
    iconPositions = saved
  }

  let iconPositions: Record<string, { x: number; y: number }> = {}

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
  let ctxTargetId: string | null = null

  function onIconContextMenu(e: CustomEvent<{ x: number; y: number }>, app: AppMeta) {
    selectedIds = new Set([app.id])
    ctxTargetId = app.id
    ctxX = e.detail.x
    ctxY = e.detail.y
    ctxOpen = true
  }

  function onContextMenu(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.floatTab') || (e.target as HTMLElement).closest('.dskApp')) return
    e.preventDefault()
    clearSelection()
    ctxTargetId = null
    ctxX = e.clientX
    ctxY = e.clientY
    ctxOpen = true
  }

  function onCtxAction(e: CustomEvent<string>) {
    const action = e.detail
    if (action === 'open' && ctxTargetId) {
      const app = apps.find(a => a.id === ctxTargetId)
      if (app) launch(app)
    }
    if (action === 'settings')  launch({ id: 'settings', label: 'Settings'  })
    if (action === 'discover')  launch({ id: 'discover', label: 'App Store' })
    if (action === 'wallpaper') launch({ id: 'settings', label: 'Settings'  })
    if (action === 'files')     launch({ id: 'files',    label: 'Files'     })
    if (action === 'rename' && ctxTargetId) {
      const appMeta = apps.find(a => a.id === ctxTargetId)
      const current = appMeta?.label ?? 'Item'
      const n = prompt('Rename item:', current)
      if (n && n.trim()) customNames.rename(ctxTargetId, n.trim())
    }
  }

  let isDropTarget = false
  let dropDepth = 0
  let dropMessage = ''

  function safeFilename(name: string) {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || `dropped-file-${Date.now()}`
  }

  function filenameFromResponse(response: Response, fallback: string) {
    const disposition = response.headers.get('content-disposition') || ''
    const match = disposition.match(/filename\*?=(?:UTF-8''|["'])?([^;"']+)/i)
    return safeFilename(match ? decodeURIComponent(match[1]) : fallback)
  }

  function filenameFromUrl(url: string) {
    try {
      const name = new URL(url).pathname.split('/').pop()
      return safeFilename(name || `dropped-image-${Date.now()}`)
    } catch {
      return `dropped-image-${Date.now()}`
    }
  }

  async function saveDrop(path: string, blob: Blob) {
    if ($localfs.isMounted && $localfs.isRootMounted) {
      const written = await localfs.writeBlob(path, blob)
      if (!written) throw new Error('The mounted folder could not be written to.')
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(blob)
    })
    vfs.writeFile(path, dataUrl)
  }

  function dropUrl(data: DataTransfer) {
    const uriList = data.getData('text/uri-list')
      .split(/\r?\n/)
      .find(value => value && !value.startsWith('#'))
    if (uriList) return uriList.trim()

    const html = data.getData('text/html')
    const source = html.match(/<(?:img|video|audio|source)\b[^>]*\bsrc=["']([^"']+)/i)
    if (source?.[1]) return source[1]

    const text = data.getData('text/plain').trim()
    return /^https?:\/\//i.test(text) ? text : ''
  }

  async function handleDesktopDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dropDepth = 0
    isDropTarget = false
    dropMessage = 'Saving…'

    const files = Array.from(e.dataTransfer?.files ?? [])
    if (files.length > 0) {
      try {
        for (const file of files) {
          await saveDrop(`/Desktop/${safeFilename(file.name)}`, file)
        }
        dropMessage = `${files.length} file${files.length === 1 ? '' : 's'} saved to Desktop`
      } catch (error) {
        dropMessage = error instanceof Error ? error.message : 'Could not save the dropped files.'
      }
      await refreshDesktopFiles()
      return
    }

    const url = e.dataTransfer ? dropUrl(e.dataTransfer) : ''
    if (url) {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Download failed (${response.status}).`)
        const blob = await response.blob()
        const filename = filenameFromResponse(response, filenameFromUrl(url))
        await saveDrop(`/Desktop/${filename}`, blob)
        dropMessage = `${filename} saved to Desktop`
      } catch {
        dropMessage = 'This site did not allow its file to be downloaded.'
      }
      await refreshDesktopFiles()
      return
    }

    dropMessage = 'No file or downloadable image was found in that drop.'
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
  class:drop-target={isDropTarget}
  style={bgStyle}
  role="main"
  on:contextmenu={onContextMenu}
  on:mousedown={onDesktopMousedown}
>
  {#if isDropTarget}
    <div class="drop-overlay">Drop to save on Desktop</div>
  {/if}

  {#if dropMessage}
    <div class="drop-status" on:animationend={() => (dropMessage = '')}>{dropMessage}</div>
  {/if}
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
          on:contextmenu={(e) => onIconContextMenu(e, app)}
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
    <ContextMenu x={ctxX} y={ctxY} targetId={ctxTargetId} on:action={onCtxAction} on:close={() => ctxOpen = false} />
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

  .desktop.drop-target {
    outline: 2px solid rgba(109, 190, 255, 0.9);
    outline-offset: -2px;
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 5000;
    display: grid;
    place-items: center;
    pointer-events: none;
    background: rgba(30, 100, 180, 0.18);
    color: white;
    font-size: 18px;
    font-weight: 600;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  }

  .drop-status {
    position: absolute;
    z-index: 5001;
    right: 16px;
    bottom: 64px;
    max-width: 360px;
    padding: 9px 12px;
    border-radius: 7px;
    background: rgba(25, 25, 28, 0.92);
    color: #f5f5f5;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    animation: drop-status 4s ease forwards;
  }

  @keyframes drop-status {
    0%, 80% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(8px); }
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
