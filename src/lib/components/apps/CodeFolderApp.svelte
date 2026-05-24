<script lang="ts">
  import { get } from 'svelte/store'
  import { windows } from '../../stores/windows'
  import { vfs } from '../../stores/filesystem'
  import { ripple } from '../../actions/ripple'
  import AppIcon from '../ui/AppIcon.svelte'
  import { File, Folder } from 'lucide-svelte'
  import type { AppId } from '../../types'

  export const windowId: string = ''

  interface Entry { appId: AppId; label: string; desc: string; maximized?: boolean }

  const APPS: Entry[] = [
    { appId: 'vscode', label: 'VS Code',   desc: 'Full editor with virtual filesystem', maximized: true },
    { appId: 'ide',    label: 'Compiler',  desc: 'Run code in 16+ languages' },
  ]

  function launch(e: Entry) {
    const existing = get(windows).find(w => w.appId === e.appId)
    if (existing) { windows.focus(existing.id); return }
    windows.open(e.appId, e.label, e.maximized ? { maximized: true } : {})
  }

  $: codeFiles = (() => { void $vfs; return vfs.listDir('/Code') })()

  function openInIDE(path: string) {
    const existing = get(windows).find(w => w.appId === 'ide')
    if (existing) { windows.focus(existing.id); return }
    windows.open('ide', 'Compiler', { filePath: path })
  }

  function openInVSCode(path: string) {
    const existing = get(windows).find(w => w.appId === 'vscode')
    if (existing) { windows.focus(existing.id); return }
    windows.open('vscode', 'VS Code', { maximized: true, filePath: path })
  }
</script>

<div class="folder-app">
  <div class="folder-header">
    <span class="folder-title">Code</span>
    <span class="folder-count">{APPS.length} apps</span>
  </div>

  <div class="app-grid">
    {#each APPS as entry (entry.appId)}
      <button class="app-tile" use:ripple on:click={() => launch(entry)}>
        <AppIcon appId={entry.appId} size={64} />
        <span class="tile-label">{entry.label}</span>
        <span class="tile-desc">{entry.desc}</span>
      </button>
    {/each}
  </div>

  <div class="section-divider">
    <span class="section-label">Files — /Code</span>
  </div>

  <div class="code-files">
    {#each codeFiles as entry (entry.path)}
      <div class="code-file-row">
        <span class="cf-icon">
          {#if entry.type === 'dir'}
            <Folder size={14} color="#ffd740" />
          {:else}
            <File size={14} color="rgba(255,255,255,0.5)" />
          {/if}
        </span>
        <span class="cf-name">{entry.name}</span>
        {#if entry.type === 'file'}
          <div class="cf-actions">
            <button class="cf-btn" use:ripple on:click={() => openInIDE(entry.path)} title="Open in Compiler">IDE</button>
            <button class="cf-btn" use:ripple on:click={() => openInVSCode(entry.path)} title="Open in VS Code">Code</button>
          </div>
        {/if}
      </div>
    {:else}
      <div class="cf-empty">No files in /Code yet</div>
    {/each}
  </div>
</div>

<style>
  .folder-app {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #131318;
    overflow: hidden;
  }

  .folder-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 18px 20px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }

  .folder-title {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }

  .folder-count {
    font-size: 12px;
    color: rgba(255,255,255,0.35);
  }

  .app-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 16px;
    align-content: flex-start;
    flex-shrink: 0;
  }

  .app-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 12px 14px;
    width: 140px;
    border: none;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.12s, transform 0.1s;
    position: relative;
    overflow: hidden;
  }

  .app-tile:hover {
    background: rgba(255,255,255,0.08);
    transform: translateY(-1px);
  }

  .tile-label {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
  }

  .tile-desc {
    font-size: 11px;
    color: rgba(255,255,255,0.4);
    text-align: center;
    line-height: 1.3;
  }

  .section-divider {
    display: flex;
    align-items: center;
    padding: 8px 20px 4px;
    border-top: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }

  .section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
  }

  .code-files {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .code-file-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 20px;
    transition: background 0.08s;
  }

  .code-file-row:hover { background: rgba(255,255,255,0.04); }

  .cf-icon { flex-shrink: 0; display: flex; }

  .cf-name {
    flex: 1;
    font-size: 13px;
    color: rgba(255,255,255,0.75);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cf-actions { display: flex; gap: 4px; flex-shrink: 0; }

  .cf-btn {
    padding: 2px 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    border-radius: 4px;
    color: rgba(255,255,255,0.55);
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    position: relative;
    overflow: hidden;
  }

  .cf-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

  .cf-empty {
    padding: 16px 20px;
    font-size: 12px;
    color: rgba(255,255,255,0.2);
  }
</style>
