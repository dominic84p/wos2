<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { FilePlus, FolderPlus, Trash2, Edit3, X, File, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-svelte'
  import { vfs, extToLang } from '../../stores/filesystem'
  import { ripple } from '../../actions/ripple'
  import { windows } from '../../stores/windows'

  // Static worker imports so Vite bundles them separately
  import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
  import JsonWorker   from 'monaco-editor/esm/vs/language/json/json.worker?worker'
  import CssWorker    from 'monaco-editor/esm/vs/language/css/css.worker?worker'
  import HtmlWorker   from 'monaco-editor/esm/vs/language/html/html.worker?worker'
  import TsWorker     from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

  export let windowId: string = ''

  // ── Tabs ──────────────────────────────────────────────────
  interface Tab { path: string; dirty: boolean }
  let tabs: Tab[] = []
  let activeTab = ''

  // ── Tree state ────────────────────────────────────────────
  let expandedDirs = new Set(['/'])
  let renamingPath = ''
  let renameVal    = ''
  let newItemIn: string | null = null   // parent dir for new item
  let newItemType: 'file' | 'dir' | null = null
  let newItemName  = ''
  let hoveredPath  = ''

  // ── Open folder state ─────────────────────────────────────
  let rootDir: string | null = null
  let pickerOpen = false

  // Only expose user-facing folders; system dirs (/boot, /etc, /usr, etc.) stay hidden
  const VS_USER_ROOTS = new Set(['/Desktop', '/Code', '/Documents', '/Games'])

  $: vfsDirs = (() => {
    void $vfs
    return [...$vfs.dirs]
      .filter(d => d === '/' || [...VS_USER_ROOTS].some(r => d === r || d.startsWith(r + '/')))
      .sort()
  })()

  // ── Status bar ────────────────────────────────────────────
  let curLine  = 1
  let curCol   = 1
  let langLabel = 'Plain Text'

  // ── Monaco ────────────────────────────────────────────────
  let editorEl: HTMLElement
  let monaco:   any
  let editor:   any

  onMount(async () => {
    ;(self as any).MonacoEnvironment = {
      getWorker(_: unknown, label: string) {
        if (label === 'json')                                  return new JsonWorker()
        if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker()
        if (label === 'html' || label === 'handlebars')        return new HtmlWorker()
        if (label === 'typescript' || label === 'javascript')  return new TsWorker()
        return new EditorWorker()
      },
    }

    monaco = await import('monaco-editor')

    editor = monaco.editor.create(editorEl, {
      value: '',
      language: 'plaintext',
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'off',
      bracketPairColorization: { enabled: true },
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
    })

    editor.onDidChangeCursorPosition((e: any) => {
      curLine = e.position.lineNumber
      curCol  = e.position.column
    })

    editor.onDidChangeModelContent(() => {
      if (!activeTab) return
      tabs = tabs.map(t => t.path === activeTab ? { ...t, dirty: true } : t)
    })

    // Open filePath hint from window state, or show "Open Folder" prompt
    const winState = get(windows).find(w => w.id === windowId)
    if (winState?.filePath) {
      const fp = winState.filePath
      const snap = get(vfs)
      if (snap.dirs.includes(fp)) {
        // It's a directory — open it as the workspace root
        rootDir = fp
        expandedDirs = new Set([fp])
      } else if (vfs.exists(fp)) {
        // It's a file — open it and set rootDir to its parent
        const slash = fp.lastIndexOf('/')
        rootDir = slash > 0 ? fp.slice(0, slash) : '/'
        expandedDirs = new Set([rootDir])
        openFile(fp)
      } else {
        rootDir = null
      }
    } else {
      rootDir = null
    }
  })

  onDestroy(() => editor?.dispose())

  // ── Tree builder ──────────────────────────────────────────
  interface FlatNode {
    path: string; name: string; type: 'file' | 'dir'; depth: number
  }

  function buildTree(dir = rootDir ?? '/', depth = 0): FlatNode[] {
    const out: FlatNode[] = []
    let entries = vfs.listDir(dir)
    // At the VFS root, hide system dirs — only show user folders and root-level files
    if (dir === '/') entries = entries.filter(e => e.type === 'file' || VS_USER_ROOTS.has(e.path))
    for (const e of entries) {
      out.push({ ...e, depth })
      if (e.type === 'dir' && expandedDirs.has(e.path))
        out.push(...buildTree(e.path, depth + 1))
    }
    return out
  }

  // Reactive tree — rebuilds whenever vfs, rootDir, or expand state changes
  $: flatTree = (() => { void $vfs; void rootDir; return buildTree() })()

  // ── File actions ──────────────────────────────────────────
  function openFile(path: string) {
    if (!tabs.find(t => t.path === path)) tabs = [...tabs, { path, dirty: false }]
    activeTab = path
    loadIntoEditor(path)
  }

  function loadIntoEditor(path: string) {
    if (!editor || !monaco) return
    const content = vfs.readFile(path)
    const lang = extToLang(path)
    const model = monaco.editor.createModel(content, lang)
    const old = editor.getModel()
    editor.setModel(model)
    old?.dispose()
    langLabel = lang.charAt(0).toUpperCase() + lang.slice(1)
  }

  function saveActive() {
    if (!editor || !activeTab) return
    vfs.writeFile(activeTab, editor.getValue())
    tabs = tabs.map(t => t.path === activeTab ? { ...t, dirty: false } : t)
  }

  function closeTab(path: string) {
    const idx = tabs.findIndex(t => t.path === path)
    tabs = tabs.filter(t => t.path !== path)
    if (activeTab === path) {
      const next = tabs[Math.min(idx, tabs.length - 1)]
      if (next) { activeTab = next.path; loadIntoEditor(next.path) }
      else { activeTab = ''; editor?.setModel(null); langLabel = 'Plain Text' }
    }
  }

  function deleteNode(path: string, type: 'file' | 'dir') {
    if (!confirm(`Delete "${path.split('/').pop()}"?`)) return
    if (type === 'file') { vfs.deleteFile(path); closeTab(path) }
    else {
      tabs.filter(t => t.path.startsWith(path + '/')).forEach(t => closeTab(t.path))
      vfs.rmdir(path)
    }
    expandedDirs = new Set(expandedDirs)
  }

  function commitRename(path: string, newName: string) {
    if (!newName.trim()) { renamingPath = ''; return }
    const parent = path.slice(0, path.lastIndexOf('/')) || '/'
    const newPath = (parent === '/' ? '' : parent) + '/' + newName
    vfs.rename(path, newPath)
    tabs = tabs.map(t => t.path === path ? { ...t, path: newPath } : t)
    if (activeTab === path) { activeTab = newPath; loadIntoEditor(newPath) }
    renamingPath = ''
  }

  function commitNewItem() {
    if (!newItemName.trim() || !newItemIn || !newItemType) return
    const p = (newItemIn === '/' ? '' : newItemIn) + '/' + newItemName
    if (newItemType === 'file') { vfs.writeFile(p, ''); openFile(p) }
    else vfs.mkdir(p)
    newItemIn = null; newItemType = null; newItemName = ''
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveActive() }
    if (e.key === 'Escape') { renamingPath = ''; newItemIn = null; newItemType = null }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="vscode" on:keydown={onKeydown}>

  <!-- Activity bar -->
  <div class="activity-bar">
    <button class="act-btn active" title="Explorer">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
        <path d="M3 3h8l2 2h8v16H3V3z" stroke-linejoin="round"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
      </svg>
    </button>
  </div>

  <!-- File explorer -->
  <div class="sidebar">
    {#if rootDir === null}
      <div class="sidebar-head"><span>EXPLORER</span></div>
      <div class="no-folder">
        <p>No folder opened</p>
        <button class="open-folder-btn" use:ripple on:click={() => pickerOpen = true}>Open Folder</button>
      </div>
    {:else}
    <div class="sidebar-head">
      <span>{rootDir === '/' ? 'ROOT' : rootDir.split('/').pop()!.toUpperCase()}</span>
      <div class="head-btns">
        <button title="New File"    use:ripple on:click={() => { newItemIn=rootDir??'/'; newItemType='file'; newItemName=''; expandedDirs.add(rootDir??'/'); expandedDirs=new Set(expandedDirs) }}><FilePlus size={13}/></button>
        <button title="New Folder"  use:ripple on:click={() => { newItemIn=rootDir??'/'; newItemType='dir';  newItemName=''; expandedDirs.add(rootDir??'/'); expandedDirs=new Set(expandedDirs) }}><FolderPlus size={13}/></button>
        <button title="Open Folder" use:ripple on:click={() => pickerOpen = true}><FolderOpen size={13}/></button>
      </div>
    </div>

    <div class="tree">
      <!-- New item at root of open folder -->
      {#if newItemIn === (rootDir ?? '/') && newItemType}
        <div class="tree-row" style="padding-left:12px">
          {#if newItemType==='dir'}<Folder size={14} class="node-icon dir-icon"/>{:else}<File size={14} class="node-icon"/>{/if}
          <!-- svelte-ignore a11y-autofocus -->
          <input class="inline-input" bind:value={newItemName} autofocus placeholder={newItemType==='file'?'name.ext':'folder'}
            on:keydown={(e)=>{ if(e.key==='Enter') commitNewItem(); if(e.key==='Escape'){newItemIn=null;newItemType=null} }}
            on:blur={commitNewItem}
          />
        </div>
      {/if}

      {#each flatTree as node (node.path)}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <div
          class="tree-row"
          class:active-file={node.path === activeTab}
          style="padding-left:{12 + node.depth * 14}px"
          on:click={() => node.type==='file' ? openFile(node.path) : (expandedDirs.has(node.path) ? expandedDirs.delete(node.path) : expandedDirs.add(node.path), expandedDirs=new Set(expandedDirs))}
          on:mouseover={() => hoveredPath = node.path}
          on:mouseleave={() => hoveredPath = ''}
        >
          {#if node.type === 'dir'}
            {#if expandedDirs.has(node.path)}<ChevronDown size={12} class="chevron"/>{:else}<ChevronRight size={12} class="chevron"/>{/if}
            {#if expandedDirs.has(node.path)}<FolderOpen size={14} class="node-icon dir-icon"/>{:else}<Folder size={14} class="node-icon dir-icon"/>{/if}
          {:else}
            <span class="file-spacer"></span>
            <File size={14} class="node-icon"/>
          {/if}

          {#if renamingPath === node.path}
            <!-- svelte-ignore a11y-autofocus -->
            <input class="inline-input" bind:value={renameVal} autofocus
              on:keydown={(e)=>{ if(e.key==='Enter') commitRename(node.path,renameVal); if(e.key==='Escape') renamingPath='' }}
              on:blur={() => commitRename(node.path, renameVal)}
              on:click|stopPropagation
            />
          {:else}
            <span class="node-name">{node.name}</span>
          {/if}

          <!-- hover actions -->
          {#if hoveredPath === node.path && renamingPath !== node.path}
            <div class="row-actions" on:click|stopPropagation>
              {#if node.type === 'dir'}
                <button title="New File in folder" on:click={() => { newItemIn=node.path; newItemType='file'; newItemName=''; expandedDirs.add(node.path); expandedDirs=new Set(expandedDirs) }}><FilePlus size={11}/></button>
              {/if}
              <button title="Rename" on:click={() => { renamingPath=node.path; renameVal=node.name }}><Edit3 size={11}/></button>
              <button title="Delete" class="del-btn" on:click={() => deleteNode(node.path, node.type)}><Trash2 size={11}/></button>
            </div>
          {/if}

          <!-- new item inside this dir -->
          {#if newItemIn === node.path && newItemType && node.type === 'dir'}
            <!-- rendered as next row via flatTree update -->
          {/if}
        </div>

        <!-- new item inside expanded dir -->
        {#if newItemIn === node.path && newItemType && node.type === 'dir'}
          <div class="tree-row" style="padding-left:{12 + (node.depth+1) * 14}px">
            {#if newItemType==='dir'}<Folder size={14} class="node-icon dir-icon"/>{:else}<File size={14} class="node-icon"/>{/if}
            <!-- svelte-ignore a11y-autofocus -->
            <input class="inline-input" bind:value={newItemName} autofocus placeholder={newItemType==='file'?'name.ext':'folder'}
              on:keydown={(e)=>{ if(e.key==='Enter') commitNewItem(); if(e.key==='Escape'){newItemIn=null;newItemType=null} }}
              on:blur={commitNewItem}
            />
          </div>
        {/if}
      {/each}
    </div>
    {/if}
  </div>

  <!-- Folder picker overlay -->
  {#if pickerOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="picker-backdrop" on:click={() => pickerOpen = false}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="picker-dialog" on:click|stopPropagation>
        <div class="picker-title">Open Folder</div>
        {#each vfsDirs as dir (dir)}
          <button class="picker-item" use:ripple
            on:click={() => { rootDir = dir; pickerOpen = false; expandedDirs = new Set([dir]); tabs = []; activeTab = ''; editor?.setModel(null); langLabel = 'Plain Text' }}>
            <Folder size={14} color="#dcb67a" />
            <span>{dir === '/' ? '/ (Root)' : dir}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Editor -->
  <div class="editor-area">
    <!-- Tabs -->
    <div class="tab-bar">
      {#each tabs as tab (tab.path)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="etab" class:active={tab.path===activeTab}
          on:click={() => { activeTab=tab.path; loadIntoEditor(tab.path) }}
        >
          <File size={12}/>
          <span>{tab.path.split('/').pop()}</span>
          {#if tab.dirty}<span class="dirty"></span>{/if}
          <button class="etab-close" on:click|stopPropagation={() => { if(tab.dirty) saveActive(); closeTab(tab.path) }}><X size={10}/></button>
        </div>
      {/each}
    </div>

    <!-- Monaco + welcome overlay -->
    <div class="editor-container">
      <div class="editor-mount" bind:this={editorEl}></div>
      {#if !activeTab}
        <div class="welcome">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          <h2>WOS Code</h2>
          {#if rootDir === null}
            <button class="welcome-btn" use:ripple on:click={() => pickerOpen = true}>Open Folder</button>
          {:else}
            <p class="welcome-hint">Select a file from the explorer</p>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Status bar -->
    <div class="status-bar">
      <span class="sb-item">WOS Code</span>
      {#if activeTab}<span class="sb-item">{activeTab}</span>{/if}
      <span class="sb-right">
        <span class="sb-item">{langLabel}</span>
        <span class="sb-item">Ln {curLine} Col {curCol}</span>
      </span>
    </div>
  </div>
</div>

<style>
  .vscode {
    display: flex;
    height: 100%;
    background: #1e1e1e;
    overflow: hidden;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
  }

  /* Activity bar */
  .activity-bar {
    width: 46px;
    background: #333;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 6px;
    flex-shrink: 0;
  }

  .act-btn {
    width: 34px; height: 34px;
    border: none; background: transparent;
    color: rgba(255,255,255,0.4); border-radius: 6px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    border-left: 2px solid transparent;
    transition: color 0.1s;
  }

  .act-btn.active { color: #fff; border-left-color: #fff; }
  .act-btn:hover  { color: rgba(255,255,255,0.8); }

  /* Sidebar */
  .sidebar {
    width: 220px;
    background: #252526;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #1e1e1e;
    overflow: hidden;
    flex-shrink: 0;
  }

  .sidebar-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 8px 4px 12px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    color: rgba(255,255,255,0.45);
    flex-shrink: 0;
  }

  .head-btns { display: flex; gap: 1px; }
  .head-btns button {
    width: 22px; height: 20px; border: none; background: transparent;
    color: rgba(255,255,255,0.4); border-radius: 3px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: color 0.1s, background 0.1s;
  }
  .head-btns button:hover { color: #fff; background: rgba(255,255,255,0.1); }

  .tree { flex: 1; overflow-y: auto; }

  .tree-row {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    cursor: pointer;
    color: rgba(255,255,255,0.7);
    border-radius: 2px;
    position: relative;
    transition: background 0.08s;
  }

  .tree-row:hover { background: rgba(255,255,255,0.06); }
  .tree-row.active-file { background: rgba(255,255,255,0.1); color: #fff; }

  :global(.chevron) { flex-shrink: 0; color: rgba(255,255,255,0.4); }
  :global(.node-icon) { flex-shrink: 0; color: rgba(255,255,255,0.6); }
  :global(.dir-icon)  { color: #dcb67a; }

  .file-spacer { width: 12px; flex-shrink: 0; }

  .node-name {
    flex: 1; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; font-size: 13px;
  }

  .row-actions {
    display: flex; gap: 1px; margin-left: auto; padding-right: 4px;
  }

  .row-actions button {
    width: 20px; height: 18px; border: none; background: transparent;
    color: rgba(255,255,255,0.45); border-radius: 3px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: color 0.1s, background 0.1s;
  }

  .row-actions button:hover { color: #fff; background: rgba(255,255,255,0.1); }
  .row-actions .del-btn:hover { color: #f48771; background: rgba(244,135,113,0.1); }

  .inline-input {
    flex: 1; background: #3c3c3c; border: 1px solid #007acc;
    color: #fff; font-size: 13px; font-family: inherit;
    padding: 1px 4px; outline: none; border-radius: 2px;
    min-width: 0;
  }

  /* Tabs */
  .editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  .tab-bar {
    display: flex; background: #2d2d2d;
    border-bottom: 1px solid #252526;
    overflow-x: auto; flex-shrink: 0;
  }

  .tab-bar::-webkit-scrollbar { height: 2px; }
  .tab-bar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }

  .etab {
    display: flex; align-items: center; gap: 5px;
    padding: 6px 10px; background: #2d2d2d;
    color: rgba(255,255,255,0.5); font-size: 13px;
    cursor: pointer; border-right: 1px solid #252526;
    white-space: nowrap; flex-shrink: 0;
    transition: background 0.1s, color 0.1s;
  }

  .etab:hover { color: rgba(255,255,255,0.8); background: #333; }
  .etab.active { background: #1e1e1e; color: #fff; border-top: 1px solid #007acc; }

  .dirty { width: 6px; height: 6px; border-radius: 50%; background: #e8e8e8; flex-shrink: 0; }

  .etab-close {
    width: 16px; height: 16px; border: none; background: transparent;
    color: rgba(255,255,255,0.4); border-radius: 3px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.1s, background 0.1s, color 0.1s;
  }

  .etab:hover .etab-close,
  .etab.active .etab-close { opacity: 1; }
  .etab-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

  /* Monaco */
  .editor-container { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
  .editor-mount { flex: 1; overflow: hidden; }

  .welcome {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px;
    background: #1e1e1e; z-index: 1;
  }
  .welcome h2 { font-size: 22px; font-weight: 300; color: rgba(255,255,255,0.35); margin: 0; }
  .welcome-btn {
    border: none; background: #0e639c; color: #fff;
    padding: 8px 20px; border-radius: 4px; font-size: 13px;
    font-family: inherit; cursor: pointer;
    position: relative; overflow: hidden; transition: background 0.1s;
  }
  .welcome-btn:hover { background: #1177bb; }
  .welcome-hint { font-size: 12px; color: rgba(255,255,255,0.25); margin: 0; }

  .no-folder {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    padding: 24px; color: rgba(255,255,255,0.35);
    font-size: 12px; text-align: center;
  }
  .no-folder p { margin: 0; }
  .open-folder-btn {
    border: none; background: #0e639c; color: #fff;
    padding: 6px 14px; border-radius: 4px; font-size: 12px;
    font-family: inherit; cursor: pointer;
    position: relative; overflow: hidden; transition: background 0.1s;
  }
  .open-folder-btn:hover { background: #1177bb; }

  .picker-backdrop {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 200;
  }
  .picker-dialog {
    background: #252526; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px; min-width: 220px; overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
  }
  .picker-title {
    padding: 10px 14px; font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; color: rgba(255,255,255,0.4);
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .picker-item {
    display: flex; align-items: center; gap: 8px;
    width: 100%; padding: 8px 14px; border: none;
    background: transparent; color: rgba(255,255,255,0.75);
    font-size: 13px; font-family: inherit;
    cursor: pointer; text-align: left;
    position: relative; overflow: hidden;
    transition: background 0.08s, color 0.08s;
  }
  .picker-item:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* Status bar */
  .status-bar {
    height: 22px; background: #007acc;
    display: flex; align-items: center;
    padding: 0 8px; gap: 4px; flex-shrink: 0;
  }

  .sb-item {
    font-size: 11px; color: rgba(255,255,255,0.9);
    padding: 0 6px; height: 100%;
    display: flex; align-items: center;
    border-radius: 2px; cursor: default;
    transition: background 0.1s;
  }

  .sb-item:hover { background: rgba(255,255,255,0.15); }

  .sb-right { margin-left: auto; display: flex; gap: 2px; }
</style>
