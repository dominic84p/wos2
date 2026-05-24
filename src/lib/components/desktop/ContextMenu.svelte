<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import { Settings, AppWindow, Image, RefreshCw, FolderOpen } from 'lucide-svelte'

  export let x: number
  export let y: number

  const dispatch = createEventDispatcher()

  const items = [
    { id: 'settings',  label: 'Display settings',    icon: Settings   },
    { id: 'discover',  label: 'App Store',            icon: AppWindow  },
    { id: 'files',     label: 'Open File Explorer',  icon: FolderOpen },
    { divider: true },
    { id: 'wallpaper', label: 'Personalize',          icon: Image      },
    { id: 'refresh',   label: 'Refresh',              icon: RefreshCw  },
  ]

  function pick(id: string) {
    if (id === 'refresh') { location.reload(); return }
    dispatch('action', id)
    dispatch('close')
  }

  function dismiss() { dispatch('close') }

  let cx = x, cy = y
  let menuEl: HTMLElement

  function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape') dismiss() }

  onMount(() => {
    window.addEventListener('keydown', onKeydown)
    const rect = menuEl.getBoundingClientRect()
    if (cx + rect.width  > window.innerWidth)       cx = window.innerWidth  - rect.width  - 8
    if (cy + rect.height > window.innerHeight - 48) cy = y - rect.height
  })
  onDestroy(() => window.removeEventListener('keydown', onKeydown))
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="ctx-backdrop" on:click={dismiss} on:contextmenu|preventDefault={dismiss}></div>

<menu class="actmenu" style="left:{cx}px;top:{cy}px" bind:this={menuEl}>
  {#each items as item}
    {#if 'divider' in item}
      <div class="menuhr"></div>
    {:else}
      <button class="menuopt" on:click={() => pick(item.id!)}>
        <div class="spcont"><svelte:component this={item.icon} size={14} /></div>
        <div class="nopt">{item.label}</div>
      </button>
    {/if}
  {/each}
</menu>

<style>
  .ctx-backdrop {
    position: fixed;
    inset: 0;
    z-index: 8000;
  }

  /* actmenu — ported from Win11React menu.scss, dark theme */
  .actmenu {
    --bg1: rgba(34,36,47,0.85);
    --bg2: rgba(255,255,255,0.08);

    position: fixed;
    z-index: 8001;
    background: var(--bg1);
    -webkit-backdrop-filter: saturate(2) blur(20px);
    backdrop-filter: saturate(2) blur(20px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 4px 0;
    min-width: 220px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    list-style: none;
    animation: ctx-in 0.08s ease-out;
  }

  @keyframes ctx-in {
    from { opacity: 0; transform: scale(0.96) translateY(-4px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }

  /* menuopt — ported directly from Win11React menu.scss */
  .menuopt {
    height: 32px;
    box-sizing: border-box;
    position: relative;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: default;
    margin: 2px 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    color: var(--txt-col);
    background: transparent;
    border: none;
    width: calc(100% - 12px);
    text-align: left;
    transition: background 0.08s;
  }

  .menuopt:hover { background: var(--bg2); }
  .menuopt:active { background: rgba(255,255,255,0.12); }

  .spcont {
    width: 16px;
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.55);
    flex-shrink: 0;
  }

  .nopt { flex: 1; }

  /* menuhr — ported from Win11React */
  .menuhr {
    position: relative;
    width: 100%;
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 4px 0;
  }
</style>
