<script lang="ts">
  import { Search, Star, Download, Check, X, Send, ChevronRight } from 'lucide-svelte'
  import { installedApps, appRequests } from '../../stores/apps'
  import { windows } from '../../stores/windows'
  import type { StoreApp } from '../../types'

  export const windowId: string = ''

  const ALL_APPS: StoreApp[] = [
    {
      id: 'eaglercraft',
      title: 'EaglerCraft',
      description: 'Local Minecraft launcher with PixelClient 1.12.2 and TuffClient Beta. Runs offline — can\'t be blocked.',
      category: 'games',
      icon: '/icons/minecraft.svg',
      rating: 4.9,
      installs: 'Local',
      featured: true,
      builtin: true,
      appId: 'eaglercraft',
    },
    {
      id: 'slope',
      title: 'Slope',
      description: 'High-speed 3D ball runner. Dodge obstacles and survive as long as you can.',
      category: 'games',
      icon: '/icons/games.svg',
      rating: 4.3,
      installs: '89k',
      url: 'https://slope-game.github.io',
    },
    {
      id: '1v1lol',
      title: '1v1.LOL',
      description: 'Battle royale building shooter. Build structures, shoot enemies, and be the last one standing.',
      category: 'games',
      icon: '/icons/games.svg',
      rating: 4.1,
      installs: '210k',
      url: 'https://1v1.lol',
    },
    {
      id: 'chess',
      title: 'Chess',
      description: 'Play chess against the computer or challenge a friend online.',
      category: 'games',
      icon: '/icons/games.svg',
      rating: 4.6,
      installs: '56k',
      url: 'https://www.chess.com/play/computer',
    },
    {
      id: '2048',
      title: '2048',
      description: 'Slide and merge numbered tiles to reach 2048. Surprisingly addictive.',
      category: 'games',
      icon: '/icons/games.svg',
      rating: 4.4,
      installs: '300k',
      url: 'https://play2048.co',
    },
    {
      id: 'tetris',
      title: 'Tetris',
      description: 'The classic block-stacking puzzle. Compete for high scores on Jstris.',
      category: 'games',
      icon: '/icons/games.svg',
      rating: 4.7,
      installs: '95k',
      url: 'https://jstris.jezevec10.com',
    },
    {
      id: 'pacman',
      title: 'Pac-Man',
      description: 'Original Google Doodle Pac-Man. Eat all the dots, avoid the ghosts.',
      category: 'games',
      icon: '/icons/games.svg',
      rating: 4.5,
      installs: '78k',
      url: 'https://www.google.com/logos/2010/pacman10-i.html',
    },
    {
      id: 'cookieclicker',
      title: 'Cookie Clicker',
      description: 'The original idle clicker. Build a cookie empire one click at a time.',
      category: 'games',
      icon: '/icons/games.svg',
      rating: 4.2,
      installs: '500k',
      url: 'https://orteil.dashnet.org/cookieclicker/',
    },
    {
      id: 'browser-builtin',
      title: 'Web Browser',
      description: 'Browse any website with the built-in WOS browser.',
      category: 'tools',
      icon: '/icons/browser.svg',
      rating: 4.0,
      installs: 'Built-in',
      builtin: true,
      appId: 'browser',
    },
    {
      id: 'vscode-builtin',
      title: 'VS Code',
      description: 'Full VS Code via StackBlitz WebContainers — Monaco editor, terminal, Node.js runtime, multiple project templates.',
      category: 'tools',
      icon: '/icons/vscode.svg',
      rating: 4.9,
      installs: 'Built-in',
      builtin: true,
      appId: 'vscode',
    },
    {
      id: 'ide-builtin',
      title: 'Compiler',
      description: 'Lightweight code editor + Piston API runner. Supports Python, C++, Java, Rust, Go, JS, TS, C#, and 10 more.',
      category: 'tools',
      icon: '/icons/ide.svg',
      rating: 4.7,
      installs: 'Built-in',
      builtin: true,
      appId: 'ide',
    },
    {
      id: 'music-builtin',
      title: 'Music Player',
      description: 'YouTube music player with queue, repeat, shuffle, and taskbar mini-player.',
      category: 'media',
      icon: '/icons/music.svg',
      rating: 4.5,
      installs: 'Built-in',
      builtin: true,
      appId: 'music',
    },
  ]

  type Category = 'all' | 'games' | 'tools' | 'media'
  let selectedCategory: Category = 'all'
  let searchQuery = ''
  let showRequestModal = false
  let requestSuccess = false

  let reqName = ''
  let reqUrl = ''
  let reqCategory = 'games'
  let reqDesc = ''

  $: featured = ALL_APPS.find(a => a.featured)!

  $: filtered = ALL_APPS.filter(a => {
    if (a.featured && selectedCategory === 'all' && !searchQuery) return false
    const catMatch = selectedCategory === 'all' || a.category === selectedCategory
    const q = searchQuery.toLowerCase()
    const searchMatch = !q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    return catMatch && searchMatch
  })

  const categories: { id: Category; label: string; count: number }[] = [
    { id: 'all',    label: 'All',        count: ALL_APPS.length },
    { id: 'games',  label: 'Games',      count: ALL_APPS.filter(a => a.category === 'games').length },
    { id: 'tools',  label: 'Tools',      count: ALL_APPS.filter(a => a.category === 'tools').length },
    { id: 'media',  label: 'Media',      count: ALL_APPS.filter(a => a.category === 'media').length },
  ]

  function install(app: StoreApp) {
    if (app.builtin) {
      windows.open(app.appId!, app.title)
    } else {
      installedApps.install(app.id)
    }
  }

  function openExternal(app: StoreApp) {
    // Opens external tools in the WOS browser
    windows.open('browser', app.title, { width: 1100, height: 700 })
    // Pass URL via a custom event the browser app can pick up (future)
    // For now just open the browser — user can paste the URL
  }

  function stars(rating: number): string[] {
    return [1, 2, 3, 4, 5].map(i => {
      if (i <= Math.floor(rating)) return 'full'
      if (i === Math.ceil(rating) && rating % 1 >= 0.5) return 'half'
      return 'empty'
    })
  }

  function submitRequest() {
    if (!reqName.trim()) return
    appRequests.add({
      name: reqName,
      url: reqUrl,
      category: reqCategory,
      description: reqDesc,
    })
    requestSuccess = true
    reqName = ''; reqUrl = ''; reqCategory = 'games'; reqDesc = ''
    setTimeout(() => { requestSuccess = false; showRequestModal = false }, 2000)
  }
</script>

<div class="discover">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-inner">
      <p class="sidebar-label">Browse</p>
      {#each categories as cat}
        <button
          class="cat-btn"
          class:active={selectedCategory === cat.id}
          on:click={() => { selectedCategory = cat.id; searchQuery = '' }}
        >
          <span>{cat.label}</span>
          <span class="cat-count">{cat.count}</span>
        </button>
      {/each}

      <div class="sidebar-divider"></div>
      <p class="sidebar-label">Community</p>

      <button class="cat-btn requests-btn" on:click={() => showRequestModal = true}>
        <Send size={14} />
        <span>Request an App</span>
        <ChevronRight size={12} class="chevron" />
      </button>
    </div>
  </aside>

  <!-- Main -->
  <main class="main">
    <!-- Search header -->
    <div class="search-bar">
      <Search size={15} class="search-icon" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search apps and games..."
        spellcheck="false"
      />
      {#if searchQuery}
        <button class="clear-search" on:click={() => searchQuery = ''}>
          <X size={13} />
        </button>
      {/if}
    </div>

    <div class="scroll-area">
      <!-- Featured banner (only when not searching/filtering) -->
      {#if featured && selectedCategory === 'all' && !searchQuery}
        <section class="featured-section">
          <p class="section-label">Featured</p>
          <div class="featured-card">
            <div class="featured-bg" style="background: linear-gradient(135deg, #1a3a6b 0%, #0d1b2a 100%)"></div>
            <div class="featured-content">
              <img
                src={featured.icon}
                alt={featured.title}
                class="featured-icon"
                on:error={(e) => { (e.currentTarget as HTMLImageElement).src = '/icons/games.svg' }}
              />
              <div class="featured-meta">
                <h2>{featured.title}</h2>
                <p>{featured.description}</p>
                <div class="featured-stars">
                  {#each stars(featured.rating) as s}
                    <Star size={14} class="star star-{s}" fill={s === 'empty' ? 'none' : 'currentColor'} />
                  {/each}
                  <span>{featured.rating} · {featured.installs} installs</span>
                </div>
              </div>
              <button
                class="install-btn featured-install"
                on:click={() => install(featured)}
              >
                {#if $installedApps.has(featured.id)}
                  <Check size={15} /> Installed
                {:else}
                  <Download size={15} /> Install
                {/if}
              </button>
            </div>
          </div>
        </section>
      {/if}

      <!-- App grid -->
      <section class="apps-section">
        <p class="section-label">
          {searchQuery ? `Results for "${searchQuery}"` : selectedCategory === 'all' ? 'All Apps' : categories.find(c => c.id === selectedCategory)?.label}
        </p>

        {#if filtered.length === 0}
          <div class="empty-state">
            <p>No apps found.</p>
            <button class="text-btn" on:click={() => showRequestModal = true}>
              Request this app →
            </button>
          </div>
        {:else}
          <div class="app-grid">
            {#each filtered as app (app.id)}
              <div class="app-card">
                <img
                  src={app.icon}
                  alt={app.title}
                  class="app-icon"
                  on:error={(e) => { (e.currentTarget as HTMLImageElement).src = '/icons/games.svg' }}
                />
                <div class="app-info">
                  <span class="app-title">{app.title}</span>
                  <div class="app-stars">
                    {#each stars(app.rating) as s}
                      <Star size={10} class="star star-{s}" fill={s === 'empty' ? 'none' : 'currentColor'} />
                    {/each}
                    <span class="app-rating">{app.rating}</span>
                  </div>
                  <p class="app-desc">{app.description}</p>
                </div>
                <div class="app-actions">
                  <span class="installs">{app.installs}</span>
                  {#if app.builtin}
                    <button class="install-btn open-btn" on:click={() => install(app)}>Open</button>
                  {:else if $installedApps.has(app.id)}
                    <button class="install-btn installed-btn" on:click={() => installedApps.uninstall(app.id)}>
                      <Check size={13} /> Remove
                    </button>
                  {:else}
                    <button class="install-btn" on:click={() => install(app)}>
                      <Download size={13} /> Install
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  </main>
</div>

<!-- Request Modal -->
{#if showRequestModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click|self={() => showRequestModal = false}>
    <div class="modal">
      <div class="modal-header">
        <h3>Request an App</h3>
        <button class="icon-btn" on:click={() => showRequestModal = false}><X size={16} /></button>
      </div>

      {#if requestSuccess}
        <div class="success-msg">
          <Check size={20} />
          <span>Request submitted! We'll review it soon.</span>
        </div>
      {:else}
        <div class="modal-body">
          <label>
            App Name *
            <input type="text" bind:value={reqName} placeholder="e.g. Blooket" />
          </label>
          <label>
            URL
            <input type="text" bind:value={reqUrl} placeholder="https://..." />
          </label>
          <label>
            Category
            <select bind:value={reqCategory}>
              <option value="games">Games</option>
              <option value="tools">Tools</option>
              <option value="media">Media</option>
            </select>
          </label>
          <label>
            Why do you want this app?
            <textarea bind:value={reqDesc} rows="3" placeholder="Brief description..."></textarea>
          </label>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" on:click={() => showRequestModal = false}>Cancel</button>
          <button class="submit-btn" on:click={submitRequest} disabled={!reqName.trim()}>
            <Send size={14} /> Submit Request
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .discover {
    display: flex;
    height: 100%;
    background: #18181f;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 180px;
    background: #1e1e28;
    border-right: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
  }

  .sidebar-inner {
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .sidebar-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.35);
    padding: 6px 10px 4px;
    font-weight: 600;
  }

  .cat-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.65);
    border-radius: 7px;
    cursor: pointer;
    font-size: 13px;
    text-align: left;
    transition: background 0.12s, color 0.12s;
  }

  .cat-btn span:first-child { flex: 1; }
  .cat-btn:hover { background: rgba(255,255,255,0.07); color: #fff; }
  .cat-btn.active { background: rgba(53,132,228,0.2); color: var(--accent); }

  .cat-count {
    font-size: 11px;
    color: rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.06);
    padding: 1px 6px;
    border-radius: 10px;
  }

  .sidebar-divider {
    height: 1px;
    background: rgba(255,255,255,0.06);
    margin: 10px 4px;
  }

  .requests-btn {
    color: rgba(255,255,255,0.65);
    margin-top: auto;
  }

  :global(.chevron) { margin-left: auto; opacity: 0.5; }

  /* ── Main ── */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #1e1e28;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }

  :global(.search-icon) { color: rgba(255,255,255,0.4); flex-shrink: 0; }

  .search-bar input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
  }

  .search-bar input::placeholder { color: rgba(255,255,255,0.3); }

  .clear-search {
    border: none; background: transparent;
    color: rgba(255,255,255,0.4); cursor: pointer;
    display: flex; align-items: center;
    padding: 2px; border-radius: 4px;
    transition: color 0.1s;
  }

  .clear-search:hover { color: #fff; }

  .scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255,255,255,0.4);
    font-weight: 600;
    margin-bottom: 10px;
  }

  /* ── Featured ── */
  .featured-card {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
  }

  .featured-bg {
    position: absolute;
    inset: 0;
  }

  .featured-content {
    position: relative;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 24px 20px;
  }

  .featured-icon {
    width: 80px; height: 80px;
    border-radius: 16px;
    object-fit: contain;
    background: rgba(0,0,0,0.3);
    flex-shrink: 0;
  }

  .featured-meta {
    flex: 1;
    min-width: 0;
  }

  .featured-meta h2 {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }

  .featured-meta p {
    font-size: 13px;
    color: rgba(255,255,255,0.7);
    line-height: 1.4;
    margin-bottom: 8px;
  }

  .featured-stars {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    color: rgba(255,255,255,0.6);
  }

  .featured-stars span { margin-left: 4px; }

  .featured-install {
    padding: 10px 20px !important;
    font-size: 14px !important;
    flex-shrink: 0;
  }

  /* ── App Grid ── */
  .app-grid {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .app-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid transparent;
    transition: background 0.12s, border-color 0.12s;
    cursor: default;
  }

  .app-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.07);
  }

  .app-icon {
    width: 52px; height: 52px;
    border-radius: 12px;
    object-fit: contain;
    background: rgba(255,255,255,0.04);
    flex-shrink: 0;
  }

  .app-info { flex: 1; min-width: 0; }

  .app-title {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 3px;
  }

  .app-stars {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-bottom: 4px;
  }

  .app-rating {
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    margin-left: 3px;
  }

  .app-desc {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    line-height: 1.35;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .app-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
  }

  .installs {
    font-size: 11px;
    color: rgba(255,255,255,0.3);
  }

  /* ── Stars ── */
  :global(.star-full)  { color: #f5c842; }
  :global(.star-half)  { color: #f5c842; opacity: 0.6; }
  :global(.star-empty) { color: rgba(255,255,255,0.2); }

  /* ── Install Buttons ── */
  .install-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: none;
    border-radius: 7px;
    background: var(--accent);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.1s, transform 0.08s;
  }

  .install-btn:hover { background: var(--accent-hover); }
  .install-btn:active { transform: scale(0.96); }

  .installed-btn {
    background: rgba(39, 174, 96, 0.2);
    color: #27ae60;
    border: 1px solid rgba(39,174,96,0.3);
  }

  .installed-btn:hover { background: rgba(39, 174, 96, 0.3); }

  .open-btn {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }

  .open-btn:hover { background: rgba(255,255,255,0.18); }

  /* ── Empty ── */
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: rgba(255,255,255,0.4);
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }

  .text-btn {
    border: none; background: transparent;
    color: var(--accent); cursor: pointer;
    font-size: 13px;
    transition: opacity 0.1s;
  }

  .text-btn:hover { opacity: 0.8; }

  /* ── Modal ── */
  .modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(4px);
  }

  .modal {
    background: #242432;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    width: 400px;
    max-width: calc(100% - 32px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .modal-header h3 { font-size: 15px; font-weight: 600; color: #fff; }

  .icon-btn {
    width: 28px; height: 28px;
    border: none; background: transparent;
    color: rgba(255,255,255,0.5);
    border-radius: 6px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s, color 0.1s;
  }

  .icon-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px;
  }

  .modal-body label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 12px;
    color: rgba(255,255,255,0.6);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .modal-body input,
  .modal-body select,
  .modal-body textarea {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 7px;
    padding: 8px 12px;
    color: #fff;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
    resize: vertical;
  }

  .modal-body input:focus,
  .modal-body select:focus,
  .modal-body textarea:focus {
    border-color: var(--accent);
  }

  .modal-body select option { background: #242432; }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 20px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .cancel-btn {
    padding: 8px 16px;
    border: 1px solid rgba(255,255,255,0.12);
    background: transparent;
    color: rgba(255,255,255,0.7);
    border-radius: 7px;
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
    transition: background 0.1s;
  }

  .cancel-btn:hover { background: rgba(255,255,255,0.06); }

  .submit-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border: none;
    background: var(--accent);
    color: #fff;
    border-radius: 7px;
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
    font-weight: 500;
    transition: background 0.1s;
  }

  .submit-btn:hover { background: var(--accent-hover); }
  .submit-btn:disabled { opacity: 0.4; cursor: default; }

  .success-msg {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 28px 24px;
    color: #27ae60;
    font-size: 14px;
    font-weight: 500;
  }
</style>
