<script lang="ts">
  import { onMount } from 'svelte'
  import { Search, Download, Check, X, Play, HardDrive, RefreshCw, ExternalLink, Gamepad2, Layers, Flame, Trophy, Compass, ShieldAlert, Sparkles, Brain, Cpu, Car, Ghost, Swords, Loader2 } from 'lucide-svelte'
  import { windows } from '../../stores/windows'
  import { localfs } from '../../stores/localfs'
  import { installedGamesSet, downloadProgress, getPlayableGameUrl, downloadStoreGame, refreshInstalledGames } from '../../stores/installedGames'
  import { STORE_GAMES, AUTHOR_NAME, REPO_URL, type StoreGame } from '../../data/gameRegistry'

  export const windowId: string = ''

  type StoreCategory = 'all' | 'wos-picks' | 'installed' | 'action' | 'sports' | 'racing' | 'horror' | 'strategy' | 'idle' | 'puzzle' | 'platformer' | 'arcade' | 'simulation'

  let selectedCategory: StoreCategory = 'wos-picks'
  let searchQuery = ''
  let latestReleaseTag = ''
  let checkingRelease = false

  const categories: { id: StoreCategory; label: string; icon: any }[] = [
    { id: 'wos-picks',   label: 'WOS Picks',   icon: Flame },
    { id: 'installed',   label: 'Installed',   icon: Check },
    { id: 'all',         label: 'All Games',   icon: Layers },
    { id: 'action',      label: 'Action',      icon: Swords },
    { id: 'sports',      label: 'Sports',      icon: Trophy },
    { id: 'racing',      label: 'Racing',      icon: Car },
    { id: 'horror',      label: 'Horror',      icon: Ghost },
    { id: 'platformer',  label: 'Platformer',  icon: Compass },
    { id: 'strategy',    label: 'Strategy',    icon: ShieldAlert },
    { id: 'idle',        label: 'Idle / Clicker', icon: Sparkles },
    { id: 'puzzle',      label: 'Puzzle',      icon: Brain },
    { id: 'arcade',      label: 'Arcade',      icon: Gamepad2 },
    { id: 'simulation',  label: 'Simulation',  icon: Cpu },
  ]

  $: installedSet = $installedGamesSet
  $: progressMap = $downloadProgress

  $: filteredGames = STORE_GAMES.filter(g => {
    const isInstalled = g.isBuiltin || installedSet.has(g.filename)

    // Category filter
    if (selectedCategory === 'wos-picks' && !g.isWosPick) return false
    if (selectedCategory === 'installed' && !isInstalled) return false
    if (selectedCategory !== 'all' && selectedCategory !== 'wos-picks' && selectedCategory !== 'installed') {
      if (g.category !== selectedCategory) return false
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
    }

    return true
  })

  async function checkLatestRelease() {
    checkingRelease = true
    try {
      const res = await fetch('https://api.github.com/repos/CoolDude2349/Offline-HTML-Games-Pack/commits/master')
      if (res.ok) {
        const data = await res.json()
        const sha = data.sha?.substring(0, 7)
        const date = data.commit?.committer?.date ? new Date(data.commit.committer.date).toLocaleDateString() : ''
        latestReleaseTag = `Latest: ${sha} (${date})`
      } else {
        latestReleaseTag = 'Latest: master branch'
      }
    } catch {
      latestReleaseTag = 'Latest: offline pack'
    } finally {
      checkingRelease = false
    }
  }

  async function handleAction(game: StoreGame) {
    const isInstalled = game.isBuiltin || installedSet.has(game.filename)

    if (isInstalled) {
      const url = await getPlayableGameUrl(game.filename, game.isBuiltin)
      windows.open('game', `${game.name}.app`, {
        gameUrl: url,
        width: 1024,
        height: 700
      })
    } else {
      await downloadStoreGame(game)
    }
  }

  onMount(() => {
    checkLatestRelease()
    refreshInstalledGames()
  })
</script>

<div class="store-container">
  <!-- Sidebar -->
  <aside class="store-sidebar">
    <div class="sidebar-header">
      <Gamepad2 size={18} class="brand-icon" />
      <span class="brand-title">WOS Game Store</span>
    </div>

    <div class="sidebar-scroll">
      <div class="cat-label">Explore</div>
      {#each categories as cat}
        <button
          class="cat-item"
          class:active={selectedCategory === cat.id}
          on:click={() => { selectedCategory = cat.id; searchQuery = '' }}
        >
          <svelte:component this={cat.icon} size={15} />
          <span>{cat.label}</span>
          {#if cat.id === 'installed'}
            <span class="cat-badge">{installedSet.size + 17}</span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Storage Status & Credits -->
    <div class="sidebar-footer">
      <div class="storage-info">
        <HardDrive size={13} class="footer-icon" />
        <span class="storage-text">
          {$localfs.isMounted ? `Storage: ${$localfs.dirName}` : 'Storage: Browser Cache'}
        </span>
      </div>

      <div class="author-credits">
        <div class="author-row">
          <span>Curated by {AUTHOR_NAME}</span>
          <a href={REPO_URL} target="_blank" rel="noreferrer" title="Open repository">
            <ExternalLink size={12} />
          </a>
        </div>
        {#if latestReleaseTag}
          <div class="release-row">
            <span>{latestReleaseTag}</span>
            <button class="icon-refresh" on:click={checkLatestRelease} title="Check update">
              <RefreshCw size={10} class={checkingRelease ? 'spin' : ''} />
            </button>
          </div>
        {/if}
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="store-main">
    <!-- Top Bar -->
    <header class="store-topbar">
      <div class="search-box">
        <Search size={14} class="search-ico" />
        <input
          type="text"
          placeholder="Search from 280+ offline games..."
          bind:value={searchQuery}
          spellcheck="false"
        />
        {#if searchQuery}
          <button class="clear-btn" on:click={() => searchQuery = ''}>
            <X size={13} />
          </button>
        {/if}
      </div>

      <div class="topbar-stats">
        <span>{filteredGames.length} games</span>
      </div>
    </header>

    <!-- Game List -->
    <div class="store-content">
      {#if filteredGames.length === 0}
        <div class="empty-state">
          <p>No games found matching your search.</p>
        </div>
      {:else}
        <div class="game-grid">
          {#each filteredGames as game (game.filename)}
            {@const isInstalled = game.isBuiltin || installedSet.has(game.filename)}
            {@const curProg = progressMap[game.filename]}

            <div class="game-card" class:card-installed={isInstalled}>
              <div class="card-icon-wrap">
                <Gamepad2 size={24} class={isInstalled ? 'icon-active' : 'icon-muted'} />
              </div>

              <div class="card-details">
                <div class="card-title-row">
                  <span class="card-title">{game.name}</span>
                  {#if game.isWosPick}
                    <span class="tag-pick">PICK</span>
                  {/if}
                </div>

                <div class="card-sub-row">
                  <span class="card-cat">{game.category}</span>
                  <span class="card-bullet">·</span>
                  <span class="card-size">{game.sizeMB} MB</span>
                  {#if game.isBuiltin}
                    <span class="card-bullet">·</span>
                    <span class="card-builtin">Local</span>
                  {/if}
                </div>
              </div>

              <div class="card-action-wrap">
                {#if curProg !== undefined}
                  <div class="progress-pill">
                    <Loader2 size={12} class="spin" />
                    <span>{curProg > 0 ? `${curProg}%` : 'Starting'}</span>
                  </div>
                {:else if isInstalled}
                  <button class="btn-play" on:click={() => handleAction(game)}>
                    <Play size={12} fill="currentColor" />
                    <span>Play</span>
                  </button>
                {:else}
                  <button class="btn-get" on:click={() => handleAction(game)}>
                    <Download size={12} />
                    <span>Get</span>
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  .store-container {
    display: flex;
    height: 100%;
    background: #18181c;
    color: #e4e4e7;
    font-family: inherit;
    font-size: 13px;
    user-select: none;
    overflow: hidden;
  }

  /* Sidebar */
  .store-sidebar {
    width: 200px;
    background: #1e1e24;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 16px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-weight: 600;
    font-size: 13.5px;
    color: #fff;
  }

  :global(.brand-icon) {
    color: #3b82f6;
  }

  .sidebar-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .cat-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
    padding: 8px 8px 4px;
  }

  .cat-item {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 7px 10px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.65);
    border-radius: 6px;
    font-size: 12.5px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, color 0.1s;
  }

  .cat-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  .cat-item.active {
    background: rgba(59, 130, 246, 0.18);
    color: #60a5fa;
    font-weight: 500;
  }

  .cat-badge {
    margin-left: auto;
    font-size: 10.5px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.6);
    padding: 1px 6px;
    border-radius: 10px;
  }

  .sidebar-footer {
    padding: 12px 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background: #1b1b20;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .storage-info {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
  }

  .author-credits {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 10.5px;
    color: rgba(255, 255, 255, 0.4);
  }

  .author-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .author-row a {
    color: rgba(255, 255, 255, 0.4);
    display: flex;
    align-items: center;
  }

  .author-row a:hover {
    color: #60a5fa;
  }

  .release-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: rgba(255, 255, 255, 0.3);
  }

  .icon-refresh {
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
  }

  /* Main Section */
  .store-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .store-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: #1c1c22;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 6px;
    padding: 6px 10px;
    width: 320px;
  }

  :global(.search-ico) {
    color: rgba(255, 255, 255, 0.35);
  }

  .search-box input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    color: #fff;
    font-size: 12.5px;
    font-family: inherit;
  }

  .search-box input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .clear-btn {
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .topbar-stats {
    font-size: 11.5px;
    color: rgba(255, 255, 255, 0.35);
  }

  .store-content {
    flex: 1;
    overflow-y: auto;
    padding: 14px 18px;
  }

  .game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 8px;
  }

  .game-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    transition: background 0.1s, border-color 0.1s;
  }

  .game-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .card-installed {
    border-color: rgba(59, 130, 246, 0.15);
  }

  .card-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  :global(.icon-active) {
    color: #60a5fa;
  }

  :global(.icon-muted) {
    color: rgba(255, 255, 255, 0.35);
  }

  .card-details {
    flex: 1;
    min-width: 0;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }

  .card-title {
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tag-pick {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.12);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .card-sub-row {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    text-transform: capitalize;
  }

  .card-bullet {
    opacity: 0.4;
  }

  .card-builtin {
    color: #34d399;
    font-weight: 500;
  }

  .card-action-wrap {
    flex-shrink: 0;
  }

  .btn-get, .btn-play {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .btn-get {
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  .btn-get:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-play {
    border: 1px solid rgba(59, 130, 246, 0.4);
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
  }

  .btn-play:hover {
    background: rgba(59, 130, 246, 0.25);
    color: #93c5fd;
  }

  .progress-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    color: #60a5fa;
    padding: 4px 8px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 5px;
  }

  .empty-state {
    padding: 48px 0;
    text-align: center;
    color: rgba(255, 255, 255, 0.35);
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
