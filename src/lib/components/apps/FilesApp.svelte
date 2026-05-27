<script lang="ts">
  import { get } from 'svelte/store'
  import { windows } from '../../stores/windows'
  import { vfs } from '../../stores/filesystem'
  import { brickSystem } from '../../stores/system'
  import { ripple } from '../../actions/ripple'
  import AppIcon from '../ui/AppIcon.svelte'
  import {
    Folder, File, Gamepad2, Monitor, ArrowLeft, ArrowRight, ArrowUp,
    Search, FolderPlus, FilePlus, Trash2, ChevronRight, Code2
  } from 'lucide-svelte'
  import type { AppId } from '../../types'

  export let windowId: string = ''

  // ── Location model ──────────────────────────────────────
  type LocType = 'root' | 'desktop' | 'vfs' | 'games' | 'code'
  interface Loc { type: LocType; path?: string; label: string }

  interface GridItem {
    id: string
    name: string
    isFolder: boolean
    iconType: 'folder-gold' | 'folder-blue' | 'folder-green' | 'file' | 'gamepad' | 'app' | 'eagler'
    iconAppId?: AppId
    navLoc?: Loc
    vfsPath?: string
    deletePath?: string   // VFS path to rmdir when this virtual item is deleted
    gameFilename?: string
    appId?: AppId
  }

  // ── Init from window state ──────────────────────────────
  function initLoc(): Loc {
    const win = get(windows).find(w => w.id === windowId)
    const p = win?.initialPath
    if (!p || p === '/') return { type: 'root', label: 'This PC' }
    if (p === 'games')   return { type: 'games', label: 'Homework' }
    if (p === 'desktop') return { type: 'desktop', label: 'Desktop' }
    if (p === '/Code' || p === 'code') return { type: 'code', label: 'Code' }
    return { type: 'vfs', path: p, label: p.split('/').filter(Boolean).pop() ?? 'Files' }
  }

  let hist: Loc[] = [initLoc()]
  let histIdx = 0
  $: loc = hist[histIdx]
  $: canBack    = histIdx > 0
  $: canForward = histIdx < hist.length - 1

  function go(next: Loc) {
    hist = [...hist.slice(0, histIdx + 1), next]
    histIdx++
    selected = ''
    search = ''
    newMode = null
  }

  function back()    { if (canBack)    { histIdx--; selected = ''; search = '' } }
  function forward() { if (canForward) { histIdx++; selected = ''; search = '' } }
  function up() {
    if (loc.type === 'vfs' && loc.path && loc.path !== '/') {
      const parent = loc.path.split('/').slice(0, -1).join('/') || '/'
      go(parent === '/' ? { type: 'root', label: 'This PC' }
                        : { type: 'vfs', path: parent, label: parent.split('/').pop() ?? 'Files' })
    } else if (loc.type !== 'root') {
      go({ type: 'root', label: 'This PC' })
    }
  }

  // ── Games data ──────────────────────────────────────────
  let games: { filename: string; name: string }[] = []
  let gamesLoading = false

  async function loadGames() {
    if (games.length || gamesLoading) return
    gamesLoading = true
    try {
      const res = await fetch('/games/manifest.json')
      if (res.ok) {
        const files: string[] = await res.json()
        games = files.filter(f => /\.html?$/i.test(f))
          .map(f => ({ filename: f, name: f.replace(/\.html?$/i, '') }))
      }
    } catch {}
    gamesLoading = false
  }

  // ── Reactive grid items ──────────────────────────────────
  let selected = ''
  let search   = ''

  $: {
    if (loc.type === 'games') loadGames()
  }

  $: gridItems = buildGrid(loc, $vfs, games, search)

  function buildGrid(l: Loc, _vfsSnap: unknown, _games: typeof games, q: string): GridItem[] {
    const filt = (items: GridItem[]) =>
      q ? items.filter(i => i.name.toLowerCase().includes(q.toLowerCase())) : items

    if (l.type === 'root') {
      const SYSTEM = new Set([
        '/Code', '/Documents', '/Desktop', '/Games',
        '/boot', '/etc', '/home', '/tmp', '/var',
        '/usr', '/proc', '/dev', '/opt', '/root', '/run', '/srv',
      ])
      const snap = _vfsSnap as { dirs: string[] }
      const has = (p: string) => snap.dirs.includes(p)

      const shortcuts: GridItem[] = [
        has('/Desktop') && { id: 'desktop', name: 'Desktop', isFolder: true, iconType: 'folder-blue' as const,
          navLoc: { type: 'desktop' as const, label: 'Desktop' }, deletePath: '/Desktop' },
        has('/Code') && { id: 'code', name: 'Code', isFolder: true, iconType: 'folder-gold' as const,
          navLoc: { type: 'code' as const, label: 'Code' }, deletePath: '/Code' },
        has('/Documents') && { id: 'documents', name: 'Documents', isFolder: true, iconType: 'folder-gold' as const,
          navLoc: { type: 'vfs' as const, path: '/Documents', label: 'Documents' }, deletePath: '/Documents' },
        has('/Games') && { id: 'games', name: 'Homework', isFolder: true, iconType: 'folder-green' as const,
          navLoc: { type: 'games' as const, label: 'Homework' }, deletePath: '/Games' },
      ].filter(Boolean) as GridItem[]

      const rootEntries = vfs.listDir('/').filter(e => !SYSTEM.has(e.path)).map(e =>
        e.type === 'dir'
          ? { id: e.path, name: e.name, isFolder: true,  iconType: 'folder-gold' as const, navLoc: { type: 'vfs' as const, path: e.path, label: e.name }, deletePath: e.path }
          : { id: e.path, name: e.name, isFolder: false, iconType: 'file' as const, vfsPath: e.path }
      )
      return filt([...shortcuts, ...rootEntries])
    }

    if (l.type === 'code') return filt([
      { id: 'vscode', name: 'VS Code',   isFolder: false, iconType: 'app', iconAppId: 'vscode', appId: 'vscode' },
      { id: 'ide',    name: 'Compiler',  isFolder: false, iconType: 'app', iconAppId: 'ide',    appId: 'ide'   },
    ])

    if (l.type === 'desktop') return filt([
      { id: 'code-f',    name: 'Code',      isFolder: true, iconType: 'folder-gold',
        navLoc: { type: 'code', label: 'Code' } },
      { id: 'games-f',   name: 'Homework',     isFolder: true, iconType: 'folder-green',
        navLoc: { type: 'games', label: 'Homework' } },
      { id: 'browser',   name: 'Browser',   isFolder: false, iconType: 'app', iconAppId: 'browser',   appId: 'browser'   },
      { id: 'music',     name: 'Music',     isFolder: false, iconType: 'app', iconAppId: 'music',     appId: 'music'     },
      { id: 'notepad',   name: 'Notepad',   isFolder: false, iconType: 'app', iconAppId: 'notepad',   appId: 'notepad'   },
      { id: 'paint',     name: 'Paint',     isFolder: false, iconType: 'app', iconAppId: 'paint',     appId: 'paint'     },
      { id: 'discover',  name: 'App Store', isFolder: false, iconType: 'app', iconAppId: 'discover',  appId: 'discover'  },
      { id: 'settings',  name: 'Settings',  isFolder: false, iconType: 'app', iconAppId: 'settings',  appId: 'settings'  },
      { id: 'files',     name: 'Files',     isFolder: false, iconType: 'app', iconAppId: 'files',     appId: 'files'     },
    ])

    if (l.type === 'vfs' && l.path) {
      const entries = vfs.listDir(l.path)
      return filt(entries.map(e => e.type === 'dir'
        ? { id: e.path, name: e.name, isFolder: true, iconType: 'folder-gold' as const,
            navLoc: { type: 'vfs', path: e.path, label: e.name } }
        : { id: e.path, name: e.name, isFolder: false, iconType: 'file' as const, vfsPath: e.path }
      ))
    }

    if (l.type === 'games') {
      const eager: GridItem = { id: 'eaglercraft', name: 'EaglerCraft', isFolder: false, iconType: 'eagler' }
      const rest: GridItem[] = _games.map(g => ({
        id: g.filename, name: g.name, isFolder: false, iconType: 'gamepad' as const,
        gameFilename: g.filename,
      }))
      return filt([eager, ...rest])
    }

    return []
  }

  // ── Actions ──────────────────────────────────────────────
  function activate(item: GridItem) {
    if (item.navLoc)        { go(item.navLoc); return }
    if (item.vfsPath) {
      if (item.vfsPath.match(/\.html?$/i)) {
        const name = item.name
        windows.open('htmlpreview', name, { filePath: item.vfsPath, width: 900, height: 640 })
      } else {
        openInVSCode(item.vfsPath)
      }
      return
    }
    if (item.id === 'eaglercraft') { launchApp('eaglercraft'); return }
    if (item.gameFilename)  { launchGame(item.gameFilename); return }
    if (item.appId)         { launchApp(item.appId); return }
  }

  function openInVSCode(path: string) {
    windows.open('vscode', 'VS Code', { maximized: true, filePath: path })
  }

  // Returns the VFS path for any item — file path or folder path
  function itemVFSPath(item: GridItem): string | null {
    if (item.vfsPath) return item.vfsPath
    if (item.navLoc?.type === 'vfs' && item.navLoc.path) return item.navLoc.path
    if (item.deletePath) return item.deletePath
    return null
  }

  // ── Context menu ─────────────────────────────────────────
  let ctxMenu: { x: number; y: number; item: GridItem } | null = null
  let bgCtxMenu: { x: number; y: number } | null = null

  function onCtxMenu(e: MouseEvent, item: GridItem) {
    e.preventDefault()
    e.stopPropagation()
    bgCtxMenu = null
    selected = item.id
    ctxMenu = { x: e.clientX, y: e.clientY, item }
  }

  function onBgCtxMenu(e: MouseEvent) {
    if (loc.type !== 'vfs') return
    e.preventDefault()
    ctxMenu = null
    bgCtxMenu = { x: e.clientX, y: e.clientY }
  }

  function openWithIDE(path: string) {
    const ex = get(windows).find(w => w.appId === 'ide')
    if (ex) { windows.focus(ex.id) }
    else    { windows.open('ide', 'Compiler', { filePath: path }) }
  }

  function openWithNotepad(path: string) {
    windows.open('notepad', 'Notepad', { filePath: path })
  }

  function deleteTile(item: GridItem) {
    if (!confirm(`Delete "${item.name}"?`)) return
    if (item.vfsPath) {
      vfs.deleteFile(item.vfsPath)
    } else {
      const dir = item.deletePath ?? (item.navLoc?.type === 'vfs' ? item.navLoc.path : null)
      if (dir) {
        vfs.rmdir(dir)
        if (dir === '/usr/wos' || dir.startsWith('/usr/wos/')) brickSystem()
      }
    }
    if (selected === item.id) selected = ''
  }

  function deleteVFSItem(item: GridItem) { deleteTile(item) }

  const APP_LABELS: Partial<Record<AppId, string>> = {
    browser: 'Browser', music: 'Music', settings: 'Settings',
    discover: 'App Store', files: 'Files', eaglercraft: 'EaglerCraft',
  }

  function launchApp(appId: AppId) {
    const ex = get(windows).find(w => w.appId === appId)
    if (ex) { windows.focus(ex.id); return }
    windows.open(appId, APP_LABELS[appId] ?? appId)
  }

  function launchGame(filename: string) {
    const url = `/games/${filename}`
    const ex = get(windows).find(w => w.appId === 'game' && w.gameUrl === url)
    if (ex) { windows.focus(ex.id); return }
    windows.open('game', filename.replace(/\.html?$/i,''), { gameUrl: url, width: 1024, height: 700 })
  }

  // ── VFS mutations (only in vfs mode) ─────────────────────
  let newMode: 'file' | 'dir' | null = null
  let newName = ''

  function commitNew() {
    const n = newName.trim()
    if (!n || !newMode || loc.type !== 'vfs' || !loc.path) { newMode = null; newName = ''; return }
    const p = (loc.path === '/' ? '' : loc.path) + '/' + n
    if (newMode === 'file') { vfs.writeFile(p, ''); openInVSCode(p) }
    else                    { vfs.mkdir(p) }
    newMode = null; newName = ''
  }

  function deleteSelected() {
    if (!selected || loc.type !== 'vfs') return
    const entry = vfs.listDir(loc.path!).find(e => e.path === selected)
    if (!entry) return
    if (!confirm(`Delete "${entry.name}"?`)) return
    entry.type === 'file' ? vfs.deleteFile(selected) : vfs.rmdir(selected)
    selected = ''
  }

  // ── Breadcrumbs ──────────────────────────────────────────
  interface Crumb { label: string; loc: Loc }
  $: crumbs = (() => {
    const c: Crumb[] = [{ label: 'This PC', loc: { type: 'root', label: 'This PC' } }]
    if (loc.type === 'root') return c
    if (loc.type === 'desktop') { c.push({ label: 'Desktop', loc }); return c }
    if (loc.type === 'games')   { c.push({ label: 'Homework',   loc }); return c }
    if (loc.type === 'code')    { c.push({ label: 'Code',    loc }); return c }
    if (loc.type === 'vfs' && loc.path) {
      let built = ''
      for (const part of loc.path.split('/').filter(Boolean)) {
        built += '/' + part
        const p = built
        c.push({ label: part, loc: { type: 'vfs', path: p, label: part } })
      }
    }
    return c
  })()

  // ── Sidebar active key ───────────────────────────────────
  $: activeNav = loc.type === 'root'             ? 'root'
    : loc.type === 'desktop'                     ? 'desktop'
    : loc.type === 'games'                       ? 'games'
    : loc.type === 'code'                        ? 'code'
    : loc.path?.startsWith('/Documents')         ? 'documents'
    : loc.type === 'vfs' && loc.path === '/'     ? 'disk'
    : ''

  // ── Selected item type ───────────────────────────────────
  $: selectedItem = gridItems.find(i => i.id === selected)
  $: canVSCode  = !!selectedItem && !selectedItem.isFolder && !!selectedItem.vfsPath
  $: canDelete  = !!selectedItem && loc.type === 'vfs'
  $: canCreate  = loc.type === 'vfs'

  // ── Total count ──────────────────────────────────────────
  $: totalCount = loc.type === 'games' ? (games.length + 1) : gridItems.length

  // ── Storage usage ─────────────────────────────────────────
  $: storageBytes = (() => { void $vfs; return (localStorage.getItem('wos_vfs') ?? '').length })()
  $: storagePct   = Math.min(100, storageBytes / 52428.8)
  $: storageLabel = storageBytes < 1024 ? `${storageBytes} B`
    : storageBytes < 1048576 ? `${(storageBytes / 1024).toFixed(1)} KB`
    : `${(storageBytes / 1048576).toFixed(2)} MB`
</script>

<div class="explorer" on:click={() => { selected = '' }} on:keydown={() => {}}>

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="nav-btns">
      <button class="nav-btn" class:disabled={!canBack}    disabled={!canBack}    use:ripple on:click|stopPropagation={back}    title="Back"><ArrowLeft size={14} /></button>
      <button class="nav-btn" class:disabled={!canForward} disabled={!canForward} use:ripple on:click|stopPropagation={forward} title="Forward"><ArrowRight size={14} /></button>
      <button class="nav-btn" class:disabled={loc.type==='root'} disabled={loc.type==='root'} use:ripple on:click|stopPropagation={up} title="Up"><ArrowUp size={14} /></button>
    </div>

    <div class="address-bar" on:click|stopPropagation>
      <Monitor size={13} color="rgba(255,255,255,0.4)" />
      {#each crumbs as crumb, i}
        {#if i > 0}<ChevronRight size={10} color="rgba(255,255,255,0.2)" />{/if}
        <button class="addr-seg" class:addr-active={i === crumbs.length - 1}
          use:ripple on:click={() => go(crumb.loc)}>{crumb.label}</button>
      {/each}
    </div>

    <div class="toolbar-actions" on:click|stopPropagation>
      {#if canVSCode}
        <button class="act-btn" use:ripple title="Open in VS Code" on:click={() => openInVSCode(selectedItem!.vfsPath!)}>
          <Code2 size={13} />
        </button>
      {/if}
      {#if canCreate}
        <button class="act-btn" use:ripple title="New File"
          on:click={() => { newMode = 'file'; newName = '' }}>
          <FilePlus size={13} />
        </button>
        <button class="act-btn" use:ripple title="New Folder"
          on:click={() => { newMode = 'dir'; newName = '' }}>
          <FolderPlus size={13} />
        </button>
      {/if}
      {#if canDelete}
        <button class="act-btn danger" use:ripple title="Delete" on:click={deleteSelected}>
          <Trash2 size={13} />
        </button>
      {/if}
    </div>

    <div class="search-wrap" on:click|stopPropagation>
      <Search size={12} color="rgba(255,255,255,0.35)" />
      <input class="search-input" bind:value={search} placeholder="Search" autocomplete="off" spellcheck="false" />
    </div>
  </div>

  <div class="body">
    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="sidebar-section">Quick access</div>
      <button class="sidebar-item" class:active={activeNav==='desktop'} use:ripple
        on:click={() => go({ type: 'desktop', label: 'Desktop' })}>
        <Monitor size={15} color={activeNav==='desktop' ? '#fff' : 'rgba(255,255,255,0.5)'} />
        <span>Desktop</span>
      </button>
      <button class="sidebar-item" class:active={activeNav==='code'} use:ripple
        on:click={() => go({ type: 'code', label: 'Code' })}>
        <Folder size={15} color={activeNav==='code' ? '#ffd740' : 'rgba(255,255,255,0.5)'} />
        <span>Code</span>
      </button>
      <button class="sidebar-item" class:active={activeNav==='documents'} use:ripple
        on:click={() => go({ type: 'vfs', path: '/Documents', label: 'Documents' })}>
        <Folder size={15} color={activeNav==='documents' ? '#ffd740' : 'rgba(255,255,255,0.5)'} />
        <span>Documents</span>
      </button>
      <button class="sidebar-item" class:active={activeNav==='games'} use:ripple
        on:click={() => go({ type: 'games', label: 'Homework' })}>
        <Gamepad2 size={15} color={activeNav==='games' ? '#4cc2ff' : 'rgba(255,255,255,0.5)'} />
        <span>Homework</span>
      </button>

      <div class="sidebar-section">This PC</div>
      <button class="sidebar-item" class:active={activeNav==='root'} use:ripple
        on:click={() => go({ type: 'root', label: 'This PC' })}>
        <Monitor size={15} color="rgba(255,255,255,0.5)" />
        <span>This PC</span>
      </button>
      <button class="sidebar-item disk-item" class:active={loc.type==='vfs' && loc.path==='/'} use:ripple
        on:click={() => go({ type: 'vfs', path: '/', label: 'Virtual Disk' })}>
        <div class="disk-icon">💾</div>
        <div class="disk-item-inner">
          <span class="disk-name">Virtual Disk (WOS)</span>
          <div class="disk-bar-wrap">
            <div class="disk-bar">
              <div class="disk-fill" style="width:{storagePct}%" class:warn={storagePct > 70} class:crit={storagePct > 90}></div>
            </div>
            <span class="disk-sz">{storageLabel} / 5 MB</span>
          </div>
        </div>
      </button>
    </nav>

    <!-- Content -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="content" on:click={() => { selected = ''; newMode = null; bgCtxMenu = null }} on:contextmenu={onBgCtxMenu}>
      {#if loc.type === 'games' && gamesLoading}
        <div class="state-msg">Loading games...</div>
      {:else}
        <div class="icon-grid" on:click|stopPropagation={() => {}}>
          {#each gridItems as item (item.id)}
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <div
              role="button"
              tabindex="0"
              class="tile"
              class:sel={selected === item.id}
              use:ripple
              on:click|stopPropagation={() => selected = item.id}
              on:dblclick|stopPropagation={() => activate(item)}
              on:contextmenu={(e) => onCtxMenu(e, item)}
              on:keydown={(e) => e.key === 'Enter' && activate(item)}
              title={item.name}
            >
              <div class="tile-icon"
                class:gold={item.iconType === 'folder-gold'}
                class:blue={item.iconType === 'folder-blue' || item.iconType === 'gamepad'}
                class:green={item.iconType === 'folder-green' || item.iconType === 'eagler'}
                class:plain={item.iconType === 'file'}
              >
                {#if item.iconType === 'folder-gold'}
                  <Folder size={36} color="#ffd740" />
                {:else if item.iconType === 'folder-blue'}
                  <Folder size={36} color="#4cc2ff" />
                {:else if item.iconType === 'folder-green'}
                  <Folder size={36} color="#81c784" />
                {:else if item.iconType === 'gamepad'}
                  <Gamepad2 size={36} color="#4cc2ff" />
                {:else if item.iconType === 'eagler' || item.iconType === 'app'}
                  <AppIcon appId={item.iconAppId ?? 'eaglercraft'} size={36} />
                {:else}
                  <File size={36} color="rgba(255,255,255,0.55)" />
                {/if}
              </div>
              <span class="tile-name">{item.name}</span>
            </div>
          {:else}
            {#if !search}
              <div class="state-msg">Empty</div>
            {:else}
              <div class="state-msg">No results for "{search}"</div>
            {/if}
          {/each}

          <!-- Inline new item input -->
          {#if newMode && loc.type === 'vfs'}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="tile new-tile" on:click|stopPropagation>
              <div class="tile-icon gold">
                {#if newMode === 'dir'}<Folder size={36} color="#ffd740" />{:else}<File size={36} color="rgba(255,255,255,0.55)" />{/if}
              </div>
              <!-- svelte-ignore a11y-autofocus -->
              <input
                class="new-input"
                bind:value={newName}
                placeholder={newMode === 'file' ? 'filename.ext' : 'folder name'}
                autofocus
                on:keydown={(e) => { if (e.key === 'Enter') commitNew(); if (e.key === 'Escape') { newMode = null; newName = '' } }}
                on:blur={commitNew}
              />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Context menu -->
  {#if ctxMenu}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="ctx-backdrop" on:click={() => ctxMenu = null} on:contextmenu|preventDefault={() => ctxMenu = null}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="ctx-menu" style="left:{ctxMenu.x}px;top:{ctxMenu.y}px" on:click|stopPropagation>
        <button class="ctx-item" on:click={() => { const it = ctxMenu!.item; ctxMenu = null; activate(it) }}>Open</button>
        {#if itemVFSPath(ctxMenu.item)}
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="ctx-sub">
            <div class="ctx-item ctx-has-sub">Open with<span class="ctx-arrow">▶</span></div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="ctx-submenu">
              <button class="ctx-item" on:click={() => { openInVSCode(itemVFSPath(ctxMenu!.item)!); ctxMenu = null }}>VS Code</button>
              {#if !ctxMenu.item.isFolder}
                <button class="ctx-item" on:click={() => { openWithIDE(ctxMenu!.item.vfsPath!); ctxMenu = null }}>Compiler</button>
                <button class="ctx-item" on:click={() => { openWithNotepad(ctxMenu!.item.vfsPath!); ctxMenu = null }}>Notepad</button>
              {/if}
            </div>
          </div>
        {/if}
        <div class="ctx-sep"></div>
        <button class="ctx-item ctx-danger" on:click={() => { const it = ctxMenu!.item; ctxMenu = null; deleteTile(it) }}>Delete</button>
      </div>
    </div>
  {/if}

  <!-- Background context menu (right-click on empty space in VFS) -->
  {#if bgCtxMenu}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="ctx-backdrop" on:click={() => bgCtxMenu = null} on:contextmenu|preventDefault={() => bgCtxMenu = null}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="ctx-menu" style="left:{bgCtxMenu.x}px;top:{bgCtxMenu.y}px" on:click|stopPropagation>
        <button class="ctx-item" on:click={() => { newMode = 'file'; newName = ''; bgCtxMenu = null }}>New File</button>
        <button class="ctx-item" on:click={() => { newMode = 'dir'; newName = ''; bgCtxMenu = null }}>New Folder</button>
      </div>
    </div>
  {/if}

  <!-- Status bar -->
  <div class="statusbar">
    {#if selected}
      <span>1 item selected</span>
    {:else}
      <span>{totalCount} item{totalCount !== 1 ? 's' : ''}</span>
    {/if}
  </div>
</div>

<style>
  .explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #202020;
    color: #fff;
    font-size: 13px;
    position: relative;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    background: #2a2a2a;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }

  .nav-btns { display: flex; gap: 2px; flex-shrink: 0; }

  .nav-btn {
    width: 28px; height: 26px;
    border: none; background: transparent;
    color: rgba(255,255,255,0.55);
    border-radius: 5px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s, color 0.1s;
    position: relative; overflow: hidden;
  }
  .nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; }
  .nav-btn:disabled { opacity: 0.25; cursor: default; }

  .address-bar {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 6px;
    padding: 0 10px;
    height: 26px;
    min-width: 0;
    overflow: hidden;
  }

  .addr-seg {
    border: none; background: transparent;
    color: rgba(255,255,255,0.45);
    font-size: 12px; font-family: inherit;
    cursor: pointer; padding: 2px 4px; border-radius: 3px;
    white-space: nowrap;
    transition: color 0.1s, background 0.1s;
    position: relative; overflow: hidden;
  }
  .addr-seg:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .addr-seg.addr-active { color: rgba(255,255,255,0.9); }

  .toolbar-actions {
    display: flex; gap: 2px; flex-shrink: 0;
  }

  .act-btn {
    width: 26px; height: 26px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.5);
    border-radius: 5px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s, color 0.1s;
    position: relative; overflow: hidden;
  }
  .act-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .act-btn.danger:hover { background: rgba(196,43,28,0.2); color: #f14c4c; }

  .search-wrap {
    display: flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 6px; padding: 0 10px; height: 26px;
    flex-shrink: 0; width: 160px;
    transition: border-color 0.15s;
  }
  .search-wrap:focus-within { border-color: #0078d4; }

  .search-input {
    flex: 1; border: none; background: transparent; outline: none;
    color: #fff; font-size: 12px; font-family: inherit; min-width: 0;
  }
  .search-input::placeholder { color: rgba(255,255,255,0.3); }

  /* ── Body ── */
  .body { display: flex; flex: 1; min-height: 0; }

  /* ── Sidebar ── */
  .sidebar {
    width: 175px; flex-shrink: 0;
    border-right: 1px solid rgba(255,255,255,0.06);
    padding: 8px 0; overflow-y: auto;
    background: #1e1e1e;
  }

  .sidebar-section {
    font-size: 11px; color: rgba(255,255,255,0.35);
    font-weight: 600; padding: 10px 14px 4px;
  }

  .sidebar-item {
    display: flex; align-items: center; gap: 9px;
    width: 100%; padding: 6px 14px;
    border: none; background: transparent;
    color: rgba(255,255,255,0.65);
    font-size: 12.5px; font-family: inherit;
    cursor: pointer; text-align: left;
    transition: background 0.08s, color 0.08s;
    position: relative; overflow: hidden;
  }
  .sidebar-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
  .sidebar-item.active { background: rgba(0,120,212,0.18); color: #fff; }

  .disk-item { height: auto; align-items: flex-start; padding: 7px 14px; gap: 8px; }
  .disk-icon { font-size: 17px; flex-shrink: 0; margin-top: 1px; }
  .disk-item-inner { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
  .disk-name { font-size: 12px; color: rgba(255,255,255,0.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .disk-bar-wrap { display: flex; flex-direction: column; gap: 2px; }
  .disk-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
  .disk-fill { height: 100%; background: #0078d4; border-radius: 2px; transition: width 0.3s; }
  .disk-fill.warn { background: #f7a839; }
  .disk-fill.crit { background: #c42b1c; }
  .disk-sz { font-size: 10px; color: rgba(255,255,255,0.3); }

  /* ── Content ── */
  .content {
    flex: 1; overflow-y: auto; padding: 10px; min-width: 0;
  }

  .state-msg {
    padding: 40px 16px; color: rgba(255,255,255,0.3);
    text-align: center; font-size: 13px;
  }

  .icon-grid {
    display: flex; flex-wrap: wrap;
    gap: 4px; align-content: flex-start;
  }

  .tile {
    display: flex; flex-direction: column; align-items: center;
    gap: 6px; padding: 10px 8px 8px;
    width: 110px; border-radius: 6px; cursor: pointer;
    transition: background 0.08s;
    border: 1px solid transparent; background: transparent;
    outline: none; position: relative; overflow: hidden;
  }
  .tile:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.06); }
  .tile.sel {
    background: rgba(0,120,212,0.2);
    border-color: rgba(0,120,212,0.45);
  }

  .tile-icon {
    width: 52px; height: 52px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
  }
  .tile-icon.gold  { background: rgba(255,215,64,0.07); }
  .tile-icon.blue  { background: rgba(76,194,255,0.08); }
  .tile-icon.green { background: rgba(100,200,100,0.08); }
  .tile-icon.plain { background: rgba(255,255,255,0.03); }

  .tile-name {
    font-size: 11.5px; color: rgba(255,255,255,0.85);
    text-align: center; word-break: break-all;
    line-height: 1.3; max-width: 100%; overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }

  .new-tile { cursor: default; }

  .new-input {
    width: 90px; background: rgba(255,255,255,0.08);
    border: 1px solid rgba(0,120,212,0.6);
    border-radius: 3px; color: #fff;
    font-size: 11px; font-family: inherit;
    padding: 2px 5px; outline: none; text-align: center;
  }

  /* ── Context menu ── */
  .ctx-backdrop {
    position: absolute; inset: 0; z-index: 200;
  }

  @keyframes ctx-pop {
    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }

  .ctx-menu {
    position: fixed;
    background: rgba(36,36,36,0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px; padding: 3px 0;
    min-width: 180px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.7);
    z-index: 201;
    animation: ctx-pop 0.1s cubic-bezier(0.2,0,0,1);
  }
  .ctx-item {
    display: block; width: 100%;
    padding: 6px 14px; border: none; background: transparent;
    color: rgba(255,255,255,0.8); font-size: 12.5px; font-family: inherit;
    cursor: pointer; text-align: left;
    transition: background 0.07s, color 0.07s;
  }
  .ctx-item:hover { background: rgba(0,120,212,0.35); color: #fff; }
  .ctx-item.ctx-danger:hover { background: rgba(196,43,28,0.3); color: #f48771; }
  .ctx-sep { height: 1px; background: rgba(255,255,255,0.08); margin: 3px 0; }

  .ctx-sub { position: relative; }
  .ctx-has-sub {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 14px; color: rgba(255,255,255,0.8); font-size: 12.5px;
    font-family: inherit; cursor: default; user-select: none;
    transition: background 0.07s, color 0.07s;
  }
  .ctx-sub:hover > .ctx-has-sub { background: rgba(0,120,212,0.35); color: #fff; }
  .ctx-arrow { font-size: 9px; color: rgba(255,255,255,0.45); }
  .ctx-submenu {
    display: none;
    position: absolute; left: 100%; top: -3px;
    background: #2d2d2d;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px; padding: 3px 0;
    min-width: 150px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.65);
    z-index: 202;
  }
  .ctx-sub:hover .ctx-submenu { display: block; }

  /* ── Status bar ── */
  .statusbar {
    height: 24px; display: flex; align-items: center;
    padding: 0 14px;
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: 11.5px; color: rgba(255,255,255,0.35);
    flex-shrink: 0; background: #1e1e1e;
  }
</style>
