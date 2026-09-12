<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { windows } from '../../stores/windows'
  import { ripple } from '../../actions/ripple'
  import { Gamepad2, Search, ChevronRight, Monitor, ArrowLeft, ArrowRight, ArrowUp, Star } from 'lucide-svelte'
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

  const FALLBACK_GAMES = [
    '3Dflightsimulator.html', 'ass_geometrydash.html', 'backrooms.html', 'blackjack.html',
    'flappybird.html', 'fnaf.html', 'fnaf2.html', 'fnaf3.html', 'fnaf4.html',
    'googledino.html', 'granny.html', 'granny2.html', 'minesweeper.html', 'noobminer.html',
    'paperio2.htm', 'poker.html', 'sandgame.html'
  ]

  // Games handpicked by WOS — current collection + best from the pack
  const WOS_PICKS_SET = new Set([
    // Current WOS collection
    '3Dflightsimulator.html',
    'ass_geometrydash.html',
    'backrooms.html',
    'blackjack.html',
    'flappybird.html',
    'fnaf.html',
    'fnaf2.html',
    'fnaf3.html',
    'fnaf4.html',
    'googledino.html',
    'granny.html',
    'granny2.html',
    'minesweeper.html',
    'noobminer.html',
    'paperio2.htm',
    'poker.html',
    'sandgame.html',
    // Top picks from the offline pack
    '1v1.lol.html',
    'among-us.html',
    'angry-birds.html',
    'angry-birds-space.html',
    'baldis-basics.html',
    'bitlife.html',
    'bloons-TD-5.html',
    'bloons-TD-4.html',
    'basketball-legends.html',
    'basketball-stars.html',
    'basket-bros.html',
    'baseball-bros.html',
    'bad-ice-cream.html',
    'bad-ice-cream-2.html',
    'bad-ice-cream-3.html',
    '2048.html',
    '8-ball-classic.html',
    'bloxorz.html',
    'age-of-war.html',
    'age-of-war-2.html',
    '10-minutes-till-dawn.html',
    'bad-piggies.html',
    'awesome-tanks-2.html',
    'zombie-rush.html',
    'slope.html',
    'slope/index.html',
    'retrobowl.html',
    'retrobowl/index.html',
    'cookieclicker.html',
    'cookieclicker/index.html',
  ])

  const GAME_TITLE_MAP: Record<string, string> = {
    'ass_geometrydash.html': 'Geometry Dash',
    '3Dflightsimulator.html': '3D Flight Simulator',
    '3D-flight-simulator.html': '3D Flight Simulator',
    'backrooms.html': 'The Backrooms',
    'blackjack.html': 'Blackjack',
    'poker.html': 'Poker',
    'flappybird.html': 'Flappy Bird',
    'fnaf.html': "Five Nights at Freddy's",
    'fnaf2.html': "Five Nights at Freddy's 2",
    'fnaf3.html': "Five Nights at Freddy's 3",
    'fnaf4.html': "Five Nights at Freddy's 4",
    'googledino.html': 'Chrome Dino Run',
    'granny.html': 'Granny',
    'granny2.html': 'Granny: Chapter Two',
    'minesweeper.html': 'Minesweeper',
    'noobminer.html': 'Noob Miner: Jailbreak',
    'paperio2.htm': 'Paper.io 2',
    'sandgame.html': 'Falling Sand Game',
    'retrobowl/index.html': 'Retro Bowl',
    'retrobowl.html': 'Retro Bowl',
    'slope/index.html': 'Slope',
    'slope.html': 'Slope',
    'cookieclicker/index.html': 'Cookie Clicker',
    'cookieclicker.html': 'Cookie Clicker',
    '2048.html': '2048',
    'hextris.html': 'Hextris',
    'drivemad/index.html': 'Drive Mad',
    'drivemad.html': 'Drive Mad',
    'basketrandom/index.html': 'Basket Random',
    'subwaysurfers/index.html': 'Subway Surfers',
    'rooftopsnipers/index.html': 'Rooftop Snipers',
    '1v1.lol.html': '1v1.lol',
    'among-us.html': 'Among Us',
    'angry-birds.html': 'Angry Birds',
    'angry-birds-space.html': 'Angry Birds Space',
    'angry-birds-showdown.html': 'Angry Birds Showdown',
    'baldis-basics.html': "Baldi's Basics",
    'bitlife.html': 'BitLife',
    'bloons-TD.html': 'Bloons TD',
    'bloons-TD-2.html': 'Bloons TD 2',
    'bloons-TD-3.html': 'Bloons TD 3',
    'bloons-TD-4.html': 'Bloons TD 4',
    'bloons-TD-5.html': 'Bloons TD 5',
    'basketball-legends.html': 'Basketball Legends',
    'basketball-stars.html': 'Basketball Stars',
    'basket-bros.html': 'Basket Bros',
    'baseball-bros.html': 'Baseball Bros',
    'basket-random.html': 'Basket Random',
    'bad-ice-cream.html': 'Bad Ice Cream',
    'bad-ice-cream-2.html': 'Bad Ice Cream 2',
    'bad-ice-cream-3.html': 'Bad Ice Cream 3',
    '8-ball-classic.html': '8 Ball Classic',
    'bloxorz.html': 'Bloxorz',
    'age-of-war.html': 'Age of War',
    'age-of-war-2.html': 'Age of War 2',
    'ages-of-conflict.html': 'Ages of Conflict',
    '10-minutes-till-dawn.html': '10 Minutes Till Dawn',
    'bad-piggies.html': 'Bad Piggies',
    'bad-parenting.html': 'Bad Parenting',
    'awesome-tanks.html': 'Awesome Tanks',
    'awesome-tanks-2.html': 'Awesome Tanks 2',
    'zombie-rush.html': 'Zombie Rush',
    '1-on-1-soccer.html': '1 on 1 Soccer',
    '1-on-1-tennis.html': '1 on 1 Tennis',
    '12-mini-battles.html': '12 Mini Battles',
    'agar-io-lite.html': 'Agar.io Lite',
    'bacon-may-die.html': 'Bacon May Die',
    'blocky-snakes.html': 'Blocky Snakes',
    'bit-planes.htm': 'Bit Planes',
    '3D-flight-simulator.html': '3D Flight Simulator',
  }

  function formatGameTitle(filename: string): string {
    if (GAME_TITLE_MAP[filename]) return GAME_TITLE_MAP[filename]
    const clean = filename
      .replace(/\/index\.html?$/i, '')
      .replace(/\.html?$/i, '')
      .replace(/^[a-z]+_/i, '')
    return clean
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  // Favorites — persisted to localStorage
  let favs: Set<string> = new Set()

  function loadFavs() {
    try {
      const raw = localStorage.getItem('wos_game_favs')
      if (raw) favs = new Set(JSON.parse(raw))
    } catch { favs = new Set() }
  }

  function saveFavs() {
    localStorage.setItem('wos_game_favs', JSON.stringify([...favs]))
  }

  function toggleFav(filename: string) {
    if (favs.has(filename)) favs.delete(filename)
    else favs.add(filename)
    favs = new Set(favs) // trigger reactivity
    saveFavs()
    closeCtx()
  }

  // Right-click context menu
  let ctxVisible = false
  let ctxX = 0
  let ctxY = 0
  let ctxTarget: GameEntry | null = null

  function openCtx(e: MouseEvent, g: GameEntry) {
    e.preventDefault()
    e.stopPropagation()
    ctxTarget = g
    ctxX = e.clientX
    ctxY = e.clientY
    ctxVisible = true
  }

  function closeCtx() {
    ctxVisible = false
    ctxTarget = null
  }

  import { installedGamesSet, refreshInstalledGames, getPlayableGameUrl } from '../../stores/installedGames'

  let games: GameEntry[] = []
  let loading = true
  let error = false
  let search = ''
  let selected = ''

  async function loadGamesList() {
    let files: string[] = []
    try {
      const res = await fetch('/games/manifest.json')
      if (res.ok) {
        files = await res.json()
      } else {
        files = [...FALLBACK_GAMES]
      }
    } catch {
      files = [...FALLBACK_GAMES]
    }

    const set = new Set(files)
    const storeInstalled = get(installedGamesSet)
    if (storeInstalled && typeof storeInstalled[Symbol.iterator] === 'function') {
      for (const f of storeInstalled) set.add(f)
    }

    games = Array.from(set)
      .filter(f => /\.html?$/i.test(f))
      .map(f => {
        const title = formatGameTitle(f)
        return { filename: f, name: title, displayName: title + '.app' }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    loading = false
  }

  onMount(async () => {
    loadFavs()
    await loadGamesList()
    refreshInstalledGames()
  })

  $: if ($installedGamesSet) {
    loadGamesList()
  }

  // Sectioned lists — reactive
  $: searchTerm = search.trim().toLowerCase()

  $: filtered = searchTerm
    ? games.filter(g => g.name.toLowerCase().includes(searchTerm))
    : null

  $: wosPicksGames  = filtered ? [] : games.filter(g => WOS_PICKS_SET.has(g.filename) && !favs.has(g.filename))
  $: favoritedGames = filtered ? [] : games.filter(g => favs.has(g.filename))
  $: otherGames     = filtered ? [] : games.filter(g => !WOS_PICKS_SET.has(g.filename) && !favs.has(g.filename))

  async function openGame(g: GameEntry) {
    const isBuiltin = FALLBACK_GAMES.includes(g.filename) || g.filename === 'zombie-rush.html'
    const url = await getPlayableGameUrl(g.filename, isBuiltin)
    const existing = get(windows).find(w => w.appId === 'game' && w.gameUrl === url)
    if (existing) { windows.focus(existing.id); return }
    windows.open('game', g.displayName, { gameUrl: url, width: 1024, height: 700 })
  }

  function onKey(e: KeyboardEvent, g: GameEntry) {
    if (e.key === 'Enter') openGame(g)
  }
</script>

<!-- Click-away to close context menu -->
<svelte:window on:click={closeCtx} />

<div class="explorer">

  <!-- Right-click context menu (position:fixed escapes overflow) -->
  {#if ctxVisible && ctxTarget}
    <div
      class="ctx-menu"
      style="left:{ctxX}px; top:{ctxY}px;"
      on:click|stopPropagation={() => {}}
      on:keydown={() => {}}
      role="menu"
    >
      <button class="ctx-item" on:click={() => ctxTarget && toggleFav(ctxTarget.filename)}>
        {#if ctxTarget && favs.has(ctxTarget.filename)}
          <Star size={13} />
          <span>Remove Favorite</span>
        {:else}
          <Star size={13} fill="currentColor" />
          <span>Add to Favorites</span>
        {/if}
      </button>
      <div class="ctx-divider"></div>
      <button class="ctx-item" on:click={() => ctxTarget && openGame(ctxTarget)}>
        ▶ Open
      </button>
    </div>
  {/if}

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
      <span class="addr-seg active">Homework</span>
    </div>
    <div class="search-wrap">
      <Search size={12} color="rgba(255,255,255,0.35)" />
      <input
        class="search-input"
        bind:value={search}
        placeholder="Search Homework"
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
        <span>Homework</span>
      </button>

      <div class="sidebar-section">This PC</div>
      <button class="sidebar-item" use:ripple>
        <Monitor size={15} color="rgba(255,255,255,0.5)" />
        <span>Desktop</span>
      </button>
    </nav>

    <!-- Content -->
    <div class="content" on:click={() => { selected = ''; closeCtx() }} on:keydown={() => {}}>
      {#if loading}
        <div class="state-msg">Loading games...</div>
      {:else if filtered !== null}
        <!-- Search results: flat list -->
        <div class="icon-grid">
          {#each filtered as g (g.filename)}
            <div
              role="button"
              tabindex="0"
              class="tile"
              class:sel={selected === g.filename}
              class:fav={favs.has(g.filename)}
              use:ripple
              on:click|stopPropagation={() => selected = g.filename}
              on:dblclick={() => openGame(g)}
              on:keydown={(e) => onKey(e, g)}
              on:contextmenu={(e) => openCtx(e, g)}
              title={g.displayName}
            >
              <div class="tile-icon">
                <Gamepad2 size={36} color="#4cc2ff" />
                {#if favs.has(g.filename)}
                  <span class="star-badge"><Star size={11} fill="#ffd700" color="#ffd700" /></span>
                {/if}
              </div>
              <span class="tile-name">{g.displayName}</span>
            </div>
          {:else}
            <div class="state-msg">No results for "{search}"</div>
          {/each}
        </div>
      {:else}
        <!-- Sectioned view -->
        <div class="icon-grid">

          <!-- EaglerCraft always first in WOS PICKS -->
          {#if wosPicksGames.length > 0 || true}
            <div class="section-row">
              <span class="section-label">WOS PICKS</span>
              <div class="section-rule"></div>
            </div>

            <!-- EaglerCraft pinned -->
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

            {#each wosPicksGames as g (g.filename)}
              <div
                role="button"
                tabindex="0"
                class="tile"
                class:sel={selected === g.filename}
                use:ripple
                on:click|stopPropagation={() => selected = g.filename}
                on:dblclick={() => openGame(g)}
                on:keydown={(e) => onKey(e, g)}
                on:contextmenu={(e) => openCtx(e, g)}
                title={g.displayName}
              >
                <div class="tile-icon">
                  <Gamepad2 size={36} color="#4cc2ff" />
                </div>
                <span class="tile-name">{g.displayName}</span>
              </div>
            {/each}
          {/if}

          <!-- FAVORITED -->
          {#if favoritedGames.length > 0}
            <div class="section-row">
              <span class="section-label">FAVORITED</span>
              <div class="section-rule"></div>
            </div>

            {#each favoritedGames as g (g.filename)}
              <div
                role="button"
                tabindex="0"
                class="tile fav"
                class:sel={selected === g.filename}
                use:ripple
                on:click|stopPropagation={() => selected = g.filename}
                on:dblclick={() => openGame(g)}
                on:keydown={(e) => onKey(e, g)}
                on:contextmenu={(e) => openCtx(e, g)}
                title={g.displayName}
              >
                <div class="tile-icon fav-icon">
                  <Gamepad2 size={36} color="#ffd700" />
                  <span class="star-badge"><Star size={11} fill="#ffd700" color="#ffd700" /></span>
                </div>
                <span class="tile-name">{g.displayName}</span>
              </div>
            {/each}
          {/if}

          <!-- OTHER -->
          {#if otherGames.length > 0}
            <div class="section-row">
              <span class="section-label">OTHER</span>
              <div class="section-rule"></div>
            </div>

            {#each otherGames as g (g.filename)}
              <div
                role="button"
                tabindex="0"
                class="tile"
                class:sel={selected === g.filename}
                use:ripple
                on:click|stopPropagation={() => selected = g.filename}
                on:dblclick={() => openGame(g)}
                on:keydown={(e) => onKey(e, g)}
                on:contextmenu={(e) => openCtx(e, g)}
                title={g.displayName}
              >
                <div class="tile-icon other-icon">
                  <Gamepad2 size={36} color="rgba(255,255,255,0.35)" />
                </div>
                <span class="tile-name other-name">{g.displayName}</span>
              </div>
            {/each}
          {/if}

        </div>
      {/if}
    </div>
  </div>

  <!-- Status bar -->
  <div class="statusbar">
    {#if selected}
      <span>1 item selected</span>
    {:else if filtered !== null}
      <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
    {:else}
      {@const total = games.length + 1}
      <span>{total} item{total !== 1 ? 's' : ''}</span>
    {/if}
  </div>

</div>

<!-- Context menu portal — rendered outside .explorer so it isn't clipped -->

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

  /* Section dividers */
  .section-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 2px 6px;
    flex-basis: 100%;
  }

  .section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: rgba(255,255,255,0.28);
    white-space: nowrap;
    flex-shrink: 0;
    user-select: none;
  }

  .section-rule {
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.07);
  }

  /* Icon grid */
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
  .tile.fav:hover { background: rgba(255,215,0,0.07); }
  .tile.fav.sel {
    background: rgba(255,215,0,0.15);
    border-color: rgba(255,215,0,0.35);
  }

  .tile-icon {
    width: 52px; height: 52px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(76,194,255,0.08);
    border-radius: 8px;
    position: relative;
  }
  .tile-icon.eagler { background: rgba(100,200,100,0.08); }
  .tile-icon.fav-icon { background: rgba(255,215,0,0.1); }
  .tile-icon.other-icon { background: rgba(255,255,255,0.04); }

  .star-badge {
    position: absolute;
    bottom: -3px;
    right: -4px;
    font-size: 12px;
    line-height: 1;
    pointer-events: none;
  }

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
  .other-name {
    color: rgba(255,255,255,0.45);
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

  /* Right-click context menu */
  .ctx-menu {
    position: fixed;
    z-index: 99999;
    background: #2d2d2d;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 4px;
    min-width: 190px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    font-size: 13px;
  }

  .ctx-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 12px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.85);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    border-radius: 5px;
    text-align: left;
    transition: background 0.07s;
  }
  .ctx-item:hover { background: rgba(255,255,255,0.09); }

  .ctx-divider {
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 3px 4px;
  }
</style>
