<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import { ripple } from '../../actions/ripple'
  import AppIcon from '../ui/AppIcon.svelte'
  import { Search, Power, ChevronRight, ChevronLeft } from 'lucide-svelte'
  import type { AppMeta } from '../../types'

  export let apps: AppMeta[]

  const dispatch = createEventDispatcher()

  let showAll = false
  let query   = ''
  let hidden  = false

  // close animation then emit
  function launch(app: AppMeta) {
    hidden = true
    setTimeout(() => { dispatch('launch', app); dispatch('close') }, 180)
  }

  function close() {
    hidden = true
    setTimeout(() => dispatch('close'), 180)
  }

  $: filtered = query.length > 0
    ? apps.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : apps

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
  }

  onMount(() => window.addEventListener('keydown', handleKeydown))
  onDestroy(() => window.removeEventListener('keydown', handleKeydown))
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="sm-backdrop" on:click|self={close}></div>

<!-- startMenu — ported from Win11React startmenu.scss -->
<div class="startMenu dpShad" data-hide={hidden}>

  {#if !showAll}
    <!-- Main view -->
    <div class="stmenu" data-allapps="false">

      <!-- Search -->
      <div class="menuUp">
        <div class="sm-search">
          <Search size={14} color="rgba(0,0,0,0.5)" />
          <input
            class="sm-input"
            type="text"
            placeholder="Search for apps..."
            bind:value={query}
          />
        </div>
      </div>

      <!-- Pinned / filtered apps -->
      <div class="stAcbar">
        <span class="gpname">{query ? 'Results' : 'Pinned'}</span>
        {#if !query}
          <button class="gpbtn" use:ripple on:click={() => showAll = true}>
            All apps <ChevronRight size={11} />
          </button>
        {/if}
      </div>

      <div class="pnApps">
        {#each filtered as app (app.id)}
          <button class="pnApp" use:ripple on:click={() => launch(app)}>
            <AppIcon appId={app.id} size={40} />
            <div class="appName">{app.label}</div>
          </button>
        {:else}
          <p class="sm-empty">No results for "{query}"</p>
        {/each}
      </div>

    </div>

  {:else}
    <!-- All apps view -->
    <div class="allCont" data-allapps="true">
      <div class="appCont">
        <div class="stAcbar">
          <button class="gpbtn" use:ripple on:click={() => showAll = false}>
            <ChevronLeft size={11} /> Back
          </button>
          <span class="gpname">All apps</span>
        </div>

        <div class="allApps">
          {#each apps.slice().sort((a, b) => a.label.localeCompare(b.label)) as app (app.id)}
            <button class="allApp" use:ripple on:click={() => launch(app)}>
              <AppIcon appId={app.id} size={28} />
              <span class="appName">{app.label}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Bottom bar — menuBar from Win11React -->
  <div class="menuBar">
    <div class="profile">
      <div class="user-avatar">W</div>
      <span class="usName">WOS User</span>
    </div>
    <button class="powerMenu" use:ripple title="Restart" on:click={() => location.reload()}>
      <Power size={16} color="var(--txt-col)" />
    </button>
  </div>

</div>

<style>
  .sm-backdrop {
    position: fixed;
    inset: 0;
    bottom: var(--taskbar-height);
    z-index: 9998;
  }

  /* startMenu — ported from Win11React startmenu.scss, dark theme */
  .startMenu {
    --bg1: rgba(36,36,36,0.9);
    --bg2: rgba(255,255,255,0.1);
    --bg3: rgba(0,0,0,0.18);
    --bg4: rgba(255,255,255,0.1);
    --roundRad: 10px;

    position: fixed;
    bottom: calc(var(--taskbar-height) + 10px);
    left: 10px;
    width: 560px;
    max-width: calc(100vw - 20px);
    height: min(calc(100vh - var(--taskbar-height) - 24px), 600px);
    color: var(--dark-txt);
    background: var(--bg1);
    -webkit-backdrop-filter: blur(20px) saturate(1.8);
    backdrop-filter: blur(20px) saturate(1.8);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: var(--roundRad);
    overflow: hidden;
    transition: transform 0.18s cubic-bezier(0.79,0.14,0.15,0.86),
                opacity  0.18s ease;
    z-index: 9999;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0,0,0,0.8);
  }

  .startMenu[data-hide="true"] {
    transform: translateY(12px);
    opacity: 0;
    pointer-events: none;
  }

  /* stmenu / allCont */
  .stmenu, .allCont {
    flex: 1;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* Search */
  .menuUp { padding: 20px 24px 12px; }

  .sm-search {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,0.9);
    border-radius: 20px;
    padding: 7px 16px;
    border: 1px solid rgba(0,0,0,0.1);
  }

  .sm-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13px;
    font-family: inherit;
    color: #111;
    outline: none;
    user-select: text;
    -webkit-user-select: text;
  }

  .sm-input::placeholder { color: rgba(0,0,0,0.4); }

  /* stAcbar */
  .stAcbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px 8px;
  }

  .gpname {
    font-weight: 600;
    font-size: 13px;
    color: var(--dark-txt);
  }

  .gpbtn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255,255,255,0.1);
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 12px;
    font-family: inherit;
    color: var(--med-txt);
    cursor: pointer;
    transition: background 0.1s;
    position: relative;
    overflow: hidden;
  }

  .gpbtn:hover { background: rgba(255,255,255,0.16); }

  /* pnApps — pinned grid */
  .pnApps {
    flex: 1;
    padding: 8px 16px;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-content: flex-start;
    overflow-y: auto;
  }

  .pnApp {
    width: 86px;
    height: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s;
    position: relative;
    overflow: hidden;
  }

  .pnApp:hover { background: var(--bg2); }

  .pnApp .appName {
    font-size: 11px;
    color: var(--dark-txt);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 78px;
    cursor: default;
  }

  .sm-empty {
    font-size: 13px;
    color: var(--gray-txt);
    padding: 24px;
    width: 100%;
    text-align: center;
  }

  /* allApps list */
  .appCont {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px 0 0;
  }

  .allApps {
    flex: 1;
    overflow-y: auto;
    padding: 8px 16px;
  }

  .allApp {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.08s;
    position: relative;
    overflow: hidden;
    text-align: left;
  }

  .allApp:hover { background: var(--bg2); }

  .allApp .appName {
    font-size: 13px;
    color: var(--dark-txt);
    white-space: nowrap;
  }

  /* menuBar — bottom bar */
  .menuBar {
    flex-shrink: 0;
    box-sizing: border-box;
    width: 100%;
    height: 56px;
    padding: 0 32px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    background: var(--bg3);
    border-top: 1px solid var(--bg4);
  }

  .profile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s;
    border: none;
    background: transparent;
  }

  .profile:hover { background: var(--bg2); }

  .user-avatar {
    width: 30px; height: 30px;
    background: var(--accent-solid, #0078d4);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    flex-shrink: 0;
  }

  .usName {
    font-size: 13px;
    font-weight: 500;
    color: var(--txt-col);
  }

  .powerMenu {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.1s;
    position: relative;
    overflow: hidden;
  }

  .powerMenu:hover { background: rgba(192,57,43,0.2); }
</style>
