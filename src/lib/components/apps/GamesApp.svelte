<script lang="ts">
  import type { GameEntry } from '../../types'

  export const windowId: string = ''

  const games: GameEntry[] = [
    { id: 'eaglercraft', title: 'EaglerCraft',  url: 'https://eaglercraft.com/mc/1.8.8/', icon: '/icons/eaglercraft.png' },
    { id: 'slope',       title: 'Slope',        url: 'https://slope-game.github.io',      icon: '/icons/games.svg' },
    { id: '1v1lol',      title: '1v1.LOL',      url: 'https://1v1.lol',                   icon: '/icons/games.svg' },
    { id: 'chess',       title: 'Chess',        url: 'https://www.chess.com/play/computer',icon: '/icons/games.svg' },
  ]

  let active: GameEntry | null = null
</script>

<div class="games">
  {#if active}
    <div class="game-header">
      <button class="back" on:click={() => active = null}>← Back</button>
      <span>{active.title}</span>
    </div>
    <iframe src={active.url} title={active.title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
  {:else}
    <div class="grid">
      {#each games as game}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="card" on:click={() => active = game}>
          <img src={game.icon} alt={game.title} on:error={(e) => { (e.currentTarget as HTMLImageElement).src = '/icons/games.svg' }} />
          <span>{game.title}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .games {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1a1a1a;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px;
    padding: 20px;
    overflow-y: auto;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .card:hover {
    background: rgba(255,255,255,0.1);
    transform: translateY(-2px);
  }

  .card img {
    width: 56px;
    height: 56px;
    object-fit: contain;
  }

  .card span {
    font-size: 13px;
    color: #fff;
    text-align: center;
  }

  .game-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: #2a2a2a;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }

  .back {
    border: none;
    background: transparent;
    color: var(--accent);
    cursor: pointer;
    font-size: 13px;
    padding: 4px 8px;
    border-radius: 5px;
    transition: background 0.1s;
  }

  .back:hover { background: rgba(53,132,228,0.15); }

  .game-header span {
    font-size: 13px;
    color: var(--text-secondary);
  }

  iframe {
    flex: 1;
    border: none;
    width: 100%;
  }
</style>
