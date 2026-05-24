<script lang="ts">
  import { get } from 'svelte/store'
  import { onMount } from 'svelte'
  import { vfs } from '../../stores/filesystem'
  import { windows } from '../../stores/windows'

  export let windowId: string = ''

  let content = ''
  let filePath: string | null = null
  let dirty = false
  let showPreview = false
  let wordWrap = true
  let openMenu: string | null = null

  let dialog: 'open' | 'saveas' | null = null
  let dialogInput = ''
  let allFiles: string[] = []

  let textarea: HTMLTextAreaElement
  let curLine = 1, curCol = 1

  onMount(() => {
    const win = get(windows).find(w => w.id === windowId)
    if (win?.filePath) {
      filePath = win.filePath
      content = vfs.readFile(filePath)
    }
  })

  function onInput() { dirty = true; updateCaret() }

  function updateCaret() {
    if (!textarea) return
    const before = textarea.value.slice(0, textarea.selectionStart ?? 0)
    curLine = (before.match(/\n/g) ?? []).length + 1
    curCol = before.length - before.lastIndexOf('\n')
  }

  function newDoc() {
    if (dirty && !confirm('Discard unsaved changes?')) return
    content = ''; filePath = null; dirty = false; openMenu = null
  }

  function save() {
    if (!filePath) { showSaveAs(); return }
    vfs.writeFile(filePath, content); dirty = false; openMenu = null
  }

  function showSaveAs() {
    dialogInput = filePath ?? '/Documents/untitled.md'
    dialog = 'saveas'; openMenu = null
  }

  function commitSaveAs() {
    const p = dialogInput.trim()
    if (!p) return
    filePath = p.startsWith('/') ? p : '/Documents/' + p
    vfs.writeFile(filePath, content); dirty = false; dialog = null
  }

  function showOpen() {
    if (dirty && !confirm('Discard unsaved changes?')) return
    allFiles = Object.keys(get(vfs).files).sort()
    dialog = 'open'; openMenu = null
  }

  function openPath(p: string) {
    filePath = p; content = vfs.readFile(p); dirty = false; dialog = null
  }

  $: fileName = (filePath?.split('/').pop() ?? 'Untitled') + (dirty ? ' •' : '')
  $: lineCount = (content.match(/\n/g) ?? []).length + 1
  $: mdHtml = showPreview ? renderMd(content) : ''

  function renderMd(src: string): string {
    const lines = src.split('\n')
    const out: string[] = []
    let inCode = false, codeAcc: string[] = [], inUL = false, inOL = false

    const flush = () => {
      if (inUL) { out.push('</ul>'); inUL = false }
      if (inOL) { out.push('</ol>'); inOL = false }
    }
    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const inline = (s: string) => esc(s)
      .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`(.+?)`/g,'<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank">$1</a>')

    for (const ln of lines) {
      if (ln.startsWith('```')) {
        if (inCode) { out.push(`<pre><code>${esc(codeAcc.join('\n'))}</code></pre>`); codeAcc=[]; inCode=false }
        else { flush(); inCode=true }
        continue
      }
      if (inCode) { codeAcc.push(ln); continue }

      const hm = ln.match(/^(#{1,6}) (.*)/)
      if (hm) { flush(); out.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`); continue }

      if (/^[-*] /.test(ln)) {
        if (!inUL) { if (inOL) { out.push('</ol>'); inOL=false } out.push('<ul>'); inUL=true }
        out.push(`<li>${inline(ln.slice(2))}</li>`); continue
      }
      if (/^\d+\. /.test(ln)) {
        if (!inOL) { if (inUL) { out.push('</ul>'); inUL=false } out.push('<ol>'); inOL=true }
        out.push(`<li>${inline(ln.replace(/^\d+\. /,''))}</li>`); continue
      }
      if (/^---+$/.test(ln)) { flush(); out.push('<hr>'); continue }
      flush()
      if (!ln.trim()) { out.push('<br>'); continue }
      out.push(`<p>${inline(ln)}</p>`)
    }
    if (inCode) out.push(`<pre><code>${esc(codeAcc.join('\n'))}</code></pre>`)
    flush()
    return out.join('')
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="notepad" on:click={() => openMenu = null} on:keydown={() => {}}>

  <div class="menubar" on:click|stopPropagation>
    <div class="mw">
      <button class="mb" class:active={openMenu==='file'} on:click={() => openMenu = openMenu==='file' ? null : 'file'}>File</button>
      {#if openMenu === 'file'}
        <div class="drop">
          <button class="di" on:click={newDoc}>New<span class="sc">Ctrl+N</span></button>
          <button class="di" on:click={showOpen}>Open...<span class="sc">Ctrl+O</span></button>
          <div class="ds"></div>
          <button class="di" on:click={save}>Save<span class="sc">Ctrl+S</span></button>
          <button class="di" on:click={showSaveAs}>Save As...</button>
        </div>
      {/if}
    </div>
    <div class="mw">
      <button class="mb" class:active={openMenu==='view'} on:click={() => openMenu = openMenu==='view' ? null : 'view'}>View</button>
      {#if openMenu === 'view'}
        <div class="drop">
          <button class="di chk" on:click={() => { wordWrap=!wordWrap; openMenu=null }}>
            {#if wordWrap}<span class="ck">✓</span>{/if}Word Wrap
          </button>
          <button class="di chk" on:click={() => { showPreview=!showPreview; openMenu=null }}>
            {#if showPreview}<span class="ck">✓</span>{/if}Markdown Preview
          </button>
        </div>
      {/if}
    </div>
    <span class="fname">{fileName}</span>
  </div>

  {#if showPreview}
    <div class="preview">{@html mdHtml}</div>
  {:else}
    <textarea
      class="editor"
      class:nowrap={!wordWrap}
      bind:value={content}
      bind:this={textarea}
      on:input={onInput}
      on:keyup={updateCaret}
      on:click={updateCaret}
      on:keydown={(e) => {
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); save() }
        if (e.ctrlKey && e.key === 'n') { e.preventDefault(); newDoc() }
        if (e.ctrlKey && e.key === 'o') { e.preventDefault(); showOpen() }
      }}
      spellcheck="false"
      placeholder="Start typing..."
    ></textarea>
  {/if}

  <div class="statusbar">
    <span>Ln {curLine}, Col {curCol}</span>
    <span>{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
    <span class="sb-path">{filePath ?? 'Unsaved'}</span>
  </div>
</div>

{#if dialog === 'open'}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="dlg-back" on:click={() => dialog=null}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="dlg" on:click|stopPropagation>
      <div class="dlg-title">Open File</div>
      <div class="dlg-list">
        {#each allFiles as p}
          <button class="dlg-item" on:click={() => openPath(p)}>{p}</button>
        {:else}
          <div class="dlg-empty">No files in filesystem</div>
        {/each}
      </div>
      <div class="dlg-footer">
        <button class="dlg-btn" on:click={() => dialog=null}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

{#if dialog === 'saveas'}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="dlg-back" on:click={() => dialog=null}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="dlg" on:click|stopPropagation>
      <div class="dlg-title">Save As</div>
      <div class="dlg-body">
        <label class="dlg-label">Path (e.g. /Documents/notes.md)</label>
        <!-- svelte-ignore a11y-autofocus -->
        <input class="dlg-input" bind:value={dialogInput} autofocus
          on:keydown={(e) => { if (e.key==='Enter') commitSaveAs(); if (e.key==='Escape') dialog=null }} />
      </div>
      <div class="dlg-footer">
        <button class="dlg-btn" on:click={() => dialog=null}>Cancel</button>
        <button class="dlg-btn primary" on:click={commitSaveAs}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .notepad {
    display: flex; flex-direction: column;
    height: 100%; background: #1e1e1e; color: #d4d4d4;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 13px; position: relative;
  }

  .menubar {
    display: flex; align-items: center;
    padding: 0 4px; background: #2a2a2a;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0; height: 30px; user-select: none;
  }
  .mw { position: relative; }
  .mb {
    padding: 4px 10px; border: none; background: transparent;
    color: rgba(255,255,255,0.8); font-size: 13px; font-family: inherit;
    cursor: pointer; border-radius: 3px; transition: background 0.08s;
  }
  .mb:hover, .mb.active { background: rgba(255,255,255,0.1); }
  .fname {
    margin-left: 8px; font-size: 12px; color: rgba(255,255,255,0.35);
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .drop {
    position: absolute; top: 100%; left: 0;
    background: #2d2d2d; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 4px; padding: 3px 0; min-width: 210px;
    z-index: 9999; box-shadow: 0 6px 20px rgba(0,0,0,0.6);
  }
  .di {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 5px 14px 5px 30px;
    border: none; background: transparent;
    color: rgba(255,255,255,0.8); font-size: 13px; font-family: inherit;
    cursor: pointer; text-align: left; transition: background 0.07s;
  }
  .di:hover { background: rgba(0,120,212,0.35); color: #fff; }
  .di.chk { padding-left: 30px; position: relative; }
  .ck { position: absolute; left: 12px; }
  .ds { height: 1px; background: rgba(255,255,255,0.1); margin: 3px 0; }
  .sc { font-size: 11px; color: rgba(255,255,255,0.35); }

  .editor {
    flex: 1; resize: none; border: none; outline: none;
    background: #1e1e1e; color: #d4d4d4;
    font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
    font-size: 14px; line-height: 1.6;
    padding: 12px 16px; white-space: pre-wrap; word-wrap: break-word;
    caret-color: #ffffff;
  }
  .editor.nowrap { white-space: pre; word-wrap: normal; overflow-x: auto; }
  .editor::placeholder { color: rgba(255,255,255,0.2); }

  .preview {
    flex: 1; overflow-y: auto; padding: 24px 36px;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 15px; line-height: 1.75; color: #d4d4d4;
  }
  .preview :global(h1) { font-size: 2em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; margin: 0 0 0.6em; }
  .preview :global(h2) { font-size: 1.5em; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 0.2em; margin: 1.2em 0 0.5em; }
  .preview :global(h3) { font-size: 1.2em; margin: 1em 0 0.4em; }
  .preview :global(h4),.preview :global(h5),.preview :global(h6) { margin: 0.8em 0 0.3em; }
  .preview :global(p) { margin: 0 0 0.8em; }
  .preview :global(code) { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 3px; font-family: 'Cascadia Code','Consolas',monospace; font-size: 0.88em; }
  .preview :global(pre) { background: #111; border-radius: 6px; padding: 14px 16px; overflow-x: auto; margin: 0.8em 0; }
  .preview :global(pre code) { background: none; padding: 0; }
  .preview :global(ul),.preview :global(ol) { padding-left: 1.8em; margin: 0.5em 0; }
  .preview :global(li) { margin: 0.2em 0; }
  .preview :global(hr) { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.5em 0; }
  .preview :global(a) { color: #4fc1ff; }
  .preview :global(strong) { color: #fff; font-weight: 600; }
  .preview :global(em) { color: #ce9178; }
  .preview :global(br) { display: block; content: ''; margin: 0.4em 0; }

  .statusbar {
    display: flex; align-items: center; gap: 16px;
    padding: 0 14px; height: 22px;
    border-top: 1px solid rgba(255,255,255,0.06);
    background: #1a1a1a; font-size: 11.5px;
    color: rgba(255,255,255,0.35); flex-shrink: 0;
  }
  .sb-path { flex: 1; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .dlg-back {
    position: absolute; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
  }
  .dlg {
    background: #2d2d2d; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px; width: 400px; max-width: 90%;
    box-shadow: 0 16px 48px rgba(0,0,0,0.7);
    display: flex; flex-direction: column; max-height: 65%;
  }
  .dlg-title {
    padding: 14px 18px 10px; font-size: 14px; font-weight: 600;
    border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
  }
  .dlg-list { overflow-y: auto; flex: 1; padding: 4px 0; }
  .dlg-item {
    display: block; width: 100%; padding: 7px 18px;
    border: none; background: transparent;
    color: rgba(255,255,255,0.8); font-size: 12.5px; font-family: 'Cascadia Code','Consolas',monospace;
    cursor: pointer; text-align: left; transition: background 0.07s;
  }
  .dlg-item:hover { background: rgba(0,120,212,0.3); color: #fff; }
  .dlg-empty { padding: 16px 18px; color: rgba(255,255,255,0.3); font-size: 12px; }
  .dlg-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; }
  .dlg-label { font-size: 12px; color: rgba(255,255,255,0.5); }
  .dlg-input {
    width: 100%; padding: 6px 10px;
    border: 1px solid rgba(255,255,255,0.15); border-radius: 4px;
    background: rgba(255,255,255,0.07); color: #fff;
    font-size: 13px; font-family: 'Cascadia Code','Consolas',monospace;
    outline: none; box-sizing: border-box;
  }
  .dlg-input:focus { border-color: #0078d4; }
  .dlg-footer {
    padding: 10px 18px; display: flex; justify-content: flex-end; gap: 8px;
    border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
  }
  .dlg-btn {
    padding: 5px 16px; border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.8);
    font-size: 13px; font-family: inherit; cursor: pointer;
    transition: background 0.08s;
  }
  .dlg-btn:hover { background: rgba(255,255,255,0.13); }
  .dlg-btn.primary { background: #0078d4; border-color: transparent; color: #fff; }
  .dlg-btn.primary:hover { background: #1084d8; }
</style>
