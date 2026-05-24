<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { windows } from '../../stores/windows'
  import { ripple } from '../../actions/ripple'
  import { Gamepad2, Search, ChevronRight, Monitor, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-svelte'
  import AppIcon from '../ui/AppIcon.svelte'

  export let windowId: string = ''

  interface GameEntry {
    filename: string
    name: string
    displayName: string
  }

  function launchEaglercraft() {
    const existing = get(windows).find(w => w.appId === 'eaglercraft')
    if (existing) { windows.focus(existing.id); return }
    windows.open('eaglercraft', 'EaglerCraft', { maximized: true })
  }

  let games: GameEntry[] = []
  let loading = true
  let error = false
  let search = ''
  let selected = ''

  onMount(async () => {
    try {
      const res = await fetch('/games/manifest.json')
      if (!res.ok) throw new Error('no manifest')
      const files: string[] = await res.json()
      games = files
        .filter(f => /\.html?$/i.test(f))
        .map(f => ({
          filename: f,
          name: f.replace(/\.html?$/i, ''),
          displayName: f.replace(/\.html?$/i, '') + '.app',
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      error = true
    } finally {
      loading = false
    }
  })

  $: filtered = search.trim()
    ? games.filter(g => g.name.toLowerCase().includes(search.toLowerCase().trim()))
    : games

  function openGame(g: GameEntry) {
    const url = `/games/${g.filename}`
    const existing = get(windows).find(w => w.appId === 'game' && w.gameUrl === url)
    if (existing) { windows.focus(existing.id); return }
    windows.open('game', g.displayName, { gameUrl: url, width: 1024, height: 700 })
  }

  function onKey(e: KeyboardEvent, g: GameEntry) {
    if (e.key === 'Enter') openGame(g)
  }
</script>

<div class="explorer">

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="nav-btns">
      <button class="nav-btn" disabled title="Back"><ArrowLeft size={14} /></button>
      <button class="nav-btn" disabled title="Forward"><ArrowRight size={14} /></button>
      <button class="nav-btn" disabled title="Up"><ArrowUp size={14} /></button>
    </div>
    <div class="address-bar">
      <Monitor size={13} color="rgba(255,255,255,0.45)" />
      <ChevronRight size={10} color="rgba(255,255,255,0.2)" />
      <span class="addr-seg">This PC</span>
      <ChevronRight size={10} color="rgba(255,255,255,0.2)" />
      <span class="addr-seg active">Games</span>
    </div>
    <div class="search-wrap">
      <Search size={12} color="rgba(255,255,255,0.35)" />
      <input
        class="search-input"
        bind:value={search}
        placeholder="Search Games"
        autocomplete="off"
        spellcheck="false"
      />
    </div>
  </div>

  <div class="body">
    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="sidebar-section">Quick access</div>
      <button class="sidebar-item active" use:ripple>
        <Gamepad2 size={15} color="#4cc2ff" />
        <span>Games</span>
      </button>

      <div class="sidebar-section">This PC</div>
      <button class="sidebar-item" use:ripple>
        <Monitor size={15} color="rgba(255,255,255,0.5)" />
        <span>Desktop</span>
      </button>
    </nav>

    <!-- Content -->
    <div class="content" on:click={() => selected = ''} on:keydown={() => {}}>
      {#if loading}
        <div class="state-msg">Loading games...</div>
      {:else}
        <div class="icon-grid">
          <!-- Pinned: EaglerCraft (always shown) -->
          {#if !search}
            <div
              role="button"
              tabindex="0"
              class="tile"
              use:ripple
              on:click|stopPropagation={launchEaglercraft}
              on:dblclick={launchEaglercraft}
              on:keydown={(e) => e.key === 'Enter' && launchEaglercraft()}
              title="EaglerCraft"
            >
              <div class="tile-icon eagler">
                <AppIcon appId="eaglercraft" size={36} />
              </div>
              <span class="tile-name">EaglerCraft.app</span>
            </div>
          {/if}

          {#each filtered as g (g.filename)}
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <div
              role="button"
              tabindex="0"
              class="tile"
              class:sel={selected === g.filename}
              use:ripple
              on:click|stopPropagation={() => selected = g.filename}
              on:dblclick={() => openGame(g)}
              on:keydown={(e) => onKey(e, g)}
              title={g.displayName}
            >
              <div class="tile-icon">
                <Gamepad2 size={36} color="#4cc2ff" />
              </div>
              <span class="tile-name">{g.displayName}</span>
            </div>
          {:else}
            {#if search}
              <div class="state-msg">No results for "{search}"</div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Status bar -->
  <div class="statusbar">
    {#if selected}
      <span>1 item selected</span>
    {:else}
      {@const total = filtered.length + (search ? 0 : 1)}
      <span>{total} item{total !== 1 ? 's' : ''}</span>
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
  }

  /* Toolbar */
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
    color: rgba(255,255,255,0.5);
    border-radius: 5px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s, color 0.1s;
  }
  .nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; }
  .nav-btn:disabled { opacity: 0.25; cursor: default; }

  .address-bar {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 6px;
    padding: 0 10px;
    height: 26px;
    min-width: 0;
  }

  .addr-seg {
    font-size: 12px;
    color: rgba(255,255,255,0.45);
    white-space: nowrap;
  }
  .addr-seg.active { color: rgba(255,255,255,0.85); }

  .search-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 6px;
    padding: 0 10px;
    height: 26px;
    flex-shrink: 0;
    width: 180px;
    transition: border-color 0.15s;
  }
  .search-wrap:focus-within { border-color: #0078d4; }

  .search-input {
    flex: 1; border: none; background: transparent; outline: none;
    color: #fff; font-size: 12px; font-family: inherit;
    min-width: 0;
  }
  .search-input::placeholder { color: rgba(255,255,255,0.3); }

  /* Body */
  .body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  /* Sidebar */
  .sidebar {
    width: 180px;
    flex-shrink: 0;
    border-right: 1px solid rgba(255,255,255,0.06);
    padding: 8px 0;
    overflow-y: auto;
    background: #1e1e1e;
  }

  .sidebar-section {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    font-weight: 600;
    padding: 10px 14px 4px;
    text-transform: none;
    letter-spacing: 0;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 6px 14px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.7);
    font-size: 12.5px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    border-radius: 0;
    transition: background 0.08s;
    position: relative;
    overflow: hidden;
  }
  .sidebar-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
  .sidebar-item.active {
    background: rgba(0,120,212,0.18);
    color: #fff;
  }

  /* Content */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    min-width: 0;
  }

  .state-msg {
    padding: 32px 16px;
    color: rgba(255,255,255,0.3);
    text-align: center;
    font-size: 13px;
  }

  .icon-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-content: flex-start;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 8px 8px;
    width: 110px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.08s;
    position: relative;
    overflow: hidden;
    border: 1px solid transparent;
    background: transparent;
    outline: none;
  }
  .tile:hover { background: rgba(255,255,255,0.07); }
  .tile.sel {
    background: rgba(0,120,212,0.22);
    border-color: rgba(0,120,212,0.5);
  }

  .tile-icon {
    width: 52px; height: 52px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(76,194,255,0.08);
    border-radius: 8px;
  }
  .tile-icon.eagler { background: rgba(100,200,100,0.08); }

  .tile-name {
    font-size: 11.5px;
    color: rgba(255,255,255,0.85);
    text-align: center;
    word-break: break-all;
    line-height: 1.3;
    max-width: 100%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Status bar */
  .statusbar {
    height: 24px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: 11.5px;
    color: rgba(255,255,255,0.35);
    flex-shrink: 0;
    background: #1e1e1e;
  }
</style>
