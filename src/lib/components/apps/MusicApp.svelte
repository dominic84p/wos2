<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Plus, Trash2 } from 'lucide-svelte'
  import { music, currentTrack } from '../../stores/music'
  import type { MusicTrack } from '../../types'

  export const windowId: string = ''

  let player: YT.Player | null = null
  let ytReady = false
  let addUrl = ''
  let searching = false
  let searchError = ''

  // YouTube IFrame API
  declare global {
    interface Window {
      YT: typeof YT
      onYouTubeIframeAPIReady: () => void
    }
  }

  onMount(() => {
    if (window.YT?.Player) {
      ytReady = true
      initPlayer()
      return
    }
    window.onYouTubeIframeAPIReady = () => {
      ytReady = true
      initPlayer()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })

  function initPlayer() {
    player = new window.YT.Player('yt-player', {
      height: '0',
      width: '0',
      playerVars: { autoplay: 0, controls: 0 },
      events: {
        onStateChange: (e: YT.OnStateChangeEvent) => {
          if (e.data === window.YT.PlayerState.ENDED) music.next()
        },
      },
    })
  }

  $: if (player && $currentTrack && $music.playing) {
    player.loadVideoById($currentTrack.id)
  }
  $: if (player && !$music.playing) {
    player?.pauseVideo?.()
  }
  $: if (player) {
    player.setVolume?.($music.volume * 100)
  }

  async function addFromUrl() {
    const raw = addUrl.trim()
    if (!raw) return
    searchError = ''
    searching = true
    try {
      const videoId = extractVideoId(raw)
      if (!videoId) { searchError = 'Could not parse YouTube URL'; searching = false; return }

      // Fetch title via oEmbed (no API key needed)
      const oembed = await fetch(`https://www.youtube.com/oembed?url=https://youtu.be/${videoId}&format=json`)
      if (!oembed.ok) throw new Error('Video not found')
      const data = await oembed.json()

      const track: MusicTrack = {
        id: videoId,
        title: data.title,
        artist: data.author_name,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      }
      music.addTrack(track)
      addUrl = ''
    } catch {
      searchError = 'Could not add track — check URL'
    }
    searching = false
  }

  function extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const p of patterns) {
      const m = url.match(p)
      if (m) return m[1]
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
    return null
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') addFromUrl()
  }

  onDestroy(() => {
    player?.destroy()
  })
</script>

<div class="music-app">
  <!-- Hidden YT player -->
  <div id="yt-player" style="display:none"></div>

  <!-- Now playing -->
  <div class="now-playing">
    {#if $currentTrack}
      <img src={$currentTrack.thumbnail} alt="art" class="album-art" />
      <div class="track-meta">
        <span class="track-title">{$currentTrack.title}</span>
        <span class="track-artist">{$currentTrack.artist}</span>
      </div>
    {:else}
      <div class="empty-art"></div>
      <div class="track-meta">
        <span class="track-title">No track playing</span>
        <span class="track-artist">Add a YouTube link below</span>
      </div>
    {/if}
  </div>

  <!-- Controls -->
  <div class="controls">
    <button class:active={$music.shuffle} on:click={() => music.toggleShuffle()} title="Shuffle">
      <Shuffle size={16} />
    </button>
    <button on:click={() => music.prev()} title="Previous">
      <SkipBack size={20} />
    </button>
    <button class="play-btn" on:click={() => $music.playing ? music.pause() : music.play()}>
      {#if $music.playing}<Pause size={22} />{:else}<Play size={22} />{/if}
    </button>
    <button on:click={() => music.next()} title="Next">
      <SkipForward size={20} />
    </button>
    <button
      class:active={$music.repeat !== 'off'}
      on:click={() => music.cycleRepeat()}
      title="Repeat: {$music.repeat}"
    >
      <Repeat size={16} />
      {#if $music.repeat === 'one'}<span class="repeat-badge">1</span>{/if}
    </button>
  </div>

  <!-- Volume -->
  <div class="volume-row">
    <Volume2 size={14} />
    <input
      type="range" min="0" max="1" step="0.01"
      value={$music.volume}
      on:input={(e) => music.setVolume(+e.currentTarget.value)}
    />
  </div>

  <!-- Add track -->
  <div class="add-row">
    <input
      type="text"
      bind:value={addUrl}
      on:keydown={onKeydown}
      placeholder="Paste YouTube URL or video ID..."
    />
    <button class="add-btn" on:click={addFromUrl} disabled={searching} title="Add">
      <Plus size={16} />
    </button>
  </div>
  {#if searchError}<p class="error">{searchError}</p>{/if}

  <!-- Queue -->
  <div class="queue">
    <p class="queue-label">Queue ({$music.queue.length})</p>
    {#each $music.queue as track, i}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="queue-item"
        class:active={i === $music.currentIndex}
        on:click={() => music.play(i)}
      >
        <img src={track.thumbnail} alt="art" />
        <div class="q-info">
          <span class="q-title">{track.title}</span>
          <span class="q-artist">{track.artist}</span>
        </div>
        <button class="remove-btn" on:click|stopPropagation={() => music.removeTrack(track.id)} title="Remove">
          <Trash2 size={13} />
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  .music-app {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1a1a1a;
    overflow: hidden;
  }

  .now-playing {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px;
    background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
    flex-shrink: 0;
  }

  .album-art, .empty-art {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .empty-art { background: rgba(255,255,255,0.06); }

  .track-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .track-title { font-size: 15px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .track-artist { font-size: 12px; color: var(--text-secondary); }

  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    flex-shrink: 0;
    position: relative;
  }

  .controls button {
    width: 36px; height: 36px;
    border: none; background: transparent;
    color: var(--text-secondary);
    border-radius: 50%; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: color 0.1s, background 0.1s;
    position: relative;
  }

  .controls button:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .controls button.active { color: var(--accent); }

  .play-btn {
    width: 48px !important; height: 48px !important;
    background: var(--accent) !important;
    color: #fff !important;
  }

  .play-btn:hover { background: var(--accent-hover) !important; }

  .repeat-badge {
    position: absolute;
    top: 4px; right: 4px;
    font-size: 9px; font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }

  .volume-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px 12px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .volume-row input[type=range] {
    flex: 1;
    accent-color: var(--accent);
    height: 4px;
  }

  .add-row {
    display: flex;
    gap: 8px;
    padding: 8px 16px;
    flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .add-row input {
    flex: 1;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    padding: 6px 10px;
    color: #fff;
    font-size: 13px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
  }

  .add-row input:focus { border-color: var(--accent); }
  .add-row input::placeholder { color: rgba(255,255,255,0.3); }

  .add-btn {
    width: 34px; height: 34px;
    border: none;
    background: var(--accent);
    color: #fff;
    border-radius: 6px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s;
    flex-shrink: 0;
  }

  .add-btn:hover { background: var(--accent-hover); }
  .add-btn:disabled { opacity: 0.5; cursor: default; }

  .error { font-size: 12px; color: #e74c3c; padding: 0 16px 8px; }

  .queue {
    flex: 1;
    overflow-y: auto;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .queue-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    padding: 10px 16px 6px;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    cursor: pointer;
    transition: background 0.1s;
  }

  .queue-item:hover { background: rgba(255,255,255,0.05); }
  .queue-item.active { background: rgba(53,132,228,0.15); }

  .queue-item img {
    width: 40px; height: 40px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .q-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .q-title { font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .q-artist { font-size: 11px; color: var(--text-secondary); }

  .remove-btn {
    width: 28px; height: 28px;
    border: none; background: transparent;
    color: var(--text-secondary);
    border-radius: 4px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.1s, color 0.1s;
  }

  .queue-item:hover .remove-btn { opacity: 1; }
  .remove-btn:hover { color: #e74c3c; }
</style>
