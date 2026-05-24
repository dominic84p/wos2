<script lang="ts">
  import { ripple } from '../../actions/ripple'
  import { Pickaxe } from 'lucide-svelte'

  export const windowId: string = ''

  interface Variant { label: string; url: string; fast?: boolean }
  interface Client { id: string; name: string; desc: string; color: string; variants: Variant[] }

  const CLIENTS: Client[] = [
    {
      id: 'tuff',
      name: 'Tuff Client',
      desc: 'Stable EaglerCraft client with solid features and great performance.',
      color: '#0288d1',
      variants: [
        { label: 'JavaScript',  url: '/eaglercraft/clients/eaglercraft.dev_Tuff_Client_JS.html' },
        { label: 'WebAssembly', url: '/eaglercraft/clients/eaglercraft.dev_Tuff_Client_WASM.html', fast: true },
      ],
    },
    {
      id: 'tuff-beta',
      name: 'Tuff Client Beta',
      desc: 'Latest beta build of Tuff Client (1.1UT15) — newest features, may be unstable.',
      color: '#0288d1',
      variants: [
        { label: 'JavaScript',  url: '/eaglercraft/clients/eaglercraft.dev_Tuff_Client_Beta_1.1UT15_JS.html' },
        { label: 'WebAssembly', url: '/eaglercraft/clients/eaglercraft.dev_Tuff_Client_Beta_1.1UT15_WASM.html', fast: true },
      ],
    },
    {
      id: 'resent',
      name: 'Resent Client',
      desc: 'Feature-rich EaglerCraft client with a suite of combat and utility mods.',
      color: '#7b1fa2',
      variants: [
        { label: 'JavaScript',  url: '/eaglercraft/clients/eaglercraft.dev_Resent_Client_5.0_JS.html' },
        { label: 'WebAssembly', url: '/eaglercraft/clients/eaglercraft.dev_Resent_Client_5.0_WASM.html', fast: true },
      ],
    },
    {
      id: 'pixel3',
      name: 'PixelClient 3',
      desc: 'Third-gen PixelClient on 1.12.2 — expanded modules and clean HUD.',
      color: '#388e3c',
      variants: [
        { label: 'JavaScript',  url: '/eaglercraft/clients/eaglercraft.dev_PixelClient_3_1.12.2_JS.html' },
        { label: 'WebAssembly', url: '/eaglercraft/clients/eaglercraft.dev_PixelClient_3_1.12.2_WASM.html', fast: true },
      ],
    },
  ]

  let activeSrc: string | null = null
  let activeLabel = ''

  function launch(url: string, clientName: string, variant: string) {
    activeSrc = url
    activeLabel = `${clientName} — ${variant}`
  }

  function back() {
    activeSrc = null
    activeLabel = ''
  }
</script>

<div class="eagler">
  {#if activeSrc}
    <div class="game-bar">
      <button class="back-btn" use:ripple on:click={back}>← Launcher</button>
      <span class="game-label">{activeLabel}</span>
      <span class="hint">F11 fullscreen · Esc unlock mouse</span>
    </div>
    <iframe
      src={activeSrc}
      title={activeLabel}
      allow="pointer-lock; fullscreen; clipboard-read; clipboard-write"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-pointer-lock"
    ></iframe>

  {:else}
    <div class="launcher">
      <div class="launcher-header">
        <div class="header-icon">
          <Pickaxe size={26} color="white" strokeWidth={1.8} />
        </div>
        <div>
          <h1>EaglerCraft</h1>
          <p>Runs locally — blocked sites can't stop you</p>
        </div>
      </div>

      <div class="client-list">
        {#each CLIENTS as client (client.id)}
          <div class="client-card" style="--c:{client.color}">
            <div class="card-dot" style="background:{client.color}"></div>
            <div class="card-body">
              <span class="card-name">{client.name}</span>
              <span class="card-desc">{client.desc}</span>
            </div>
            <div class="variant-row">
              {#each client.variants as v}
                <button
                  class="variant-btn"
                  class:wasm={v.fast}
                  use:ripple
                  on:click={() => launch(v.url, client.name, v.label)}
                >
                  {v.fast ? 'WASM ⚡' : 'JS'}
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <p class="footer-note">WASM runs faster. If it fails to load, use JS instead.</p>
    </div>
  {/if}
</div>

<style>
  .eagler {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #0f0f13;
    overflow: hidden;
    color: #fff;
  }

  .game-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 12px;
    background: #1a1a22;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }

  .back-btn {
    border: none;
    background: rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.7);
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .back-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
  .game-label { font-size: 13px; color: rgba(255,255,255,0.7); font-weight: 500; }
  .hint { margin-left: auto; font-size: 11px; color: rgba(255,255,255,0.22); }

  iframe { flex: 1; border: none; width: 100%; background: #000; }

  .launcher {
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 32px;
    height: 100%;
    overflow-y: auto;
  }

  .launcher-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-icon {
    width: 52px; height: 52px;
    background: linear-gradient(135deg, #43a047, #1b5e20);
    border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }

  .launcher-header h1 { font-size: 24px; font-weight: 700; color: #fff; }
  .launcher-header p { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 4px; }

  .client-list { display: flex; flex-direction: column; gap: 12px; }

  .client-card {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-left: 3px solid var(--c);
    border-radius: 12px;
    padding: 18px 20px;
    transition: background 0.12s;
  }

  .client-card:hover { background: rgba(255,255,255,0.06); }

  .card-dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .card-name { font-size: 16px; font-weight: 600; color: #fff; }
  .card-desc { font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.4; }

  .variant-row { display: flex; gap: 8px; flex-shrink: 0; }

  .variant-btn {
    padding: 8px 18px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.7);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    position: relative;
    overflow: hidden;
  }

  .variant-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

  .variant-btn.wasm {
    background: rgba(67,160,71,0.12);
    border-color: rgba(67,160,71,0.3);
    color: #81c784;
  }

  .variant-btn.wasm:hover {
    background: rgba(67,160,71,0.22);
    color: #a5d6a7;
  }

  .footer-note {
    font-size: 12px;
    color: rgba(255,255,255,0.2);
    text-align: center;
  }
</style>
