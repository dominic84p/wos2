<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { windows } from '../../stores/windows'
  import { vfs } from '../../stores/filesystem'
  import { localfs } from '../../stores/localfs'
  import {
    Play, Pause, Volume2, VolumeX, Maximize, Music,
    PictureInPicture, RotateCcw, RotateCw, FolderOpen, Repeat,
    Home, Scaling, Sliders, Monitor, MoreHorizontal
  } from 'lucide-svelte'

  export let windowId: string = ''

  let mediaSrc = ''
  let fileName = 'Media Player'
  let isVideo = true
  $: isImage = /\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/i.test(fileName) || mediaSrc.startsWith('data:image/')
  let isPlaying = false
  let isMuted = false
  let isLooping = false
  let volume = 1
  let currentTime = 0
  let duration = 0
  let playbackRate = 1.0
  let showControls = true
  let showVolumeSlider = false
  let showSpeedMenu = false
  let hideTimeout: ReturnType<typeof setTimeout>
  let flashAction: 'play' | 'pause' | 'seek-fw' | 'seek-bw' | null = null
  let flashTimeout: ReturnType<typeof setTimeout>

  let mediaElement: HTMLVideoElement | HTMLAudioElement
  let playerContainer: HTMLElement

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

  $: win = $windows.find(w => w.id === windowId)
  $: path = win?.filePath

  let loadedPath = ''
  $: if (path && path !== loadedPath) {
    loadedPath = path
    loadFromPath(path)
  }

  onMount(async () => {
    if (path) {
      await loadFromPath(path)
    }
  })

  onDestroy(() => {
    if (hideTimeout) clearTimeout(hideTimeout)
    if (flashTimeout) clearTimeout(flashTimeout)
  })

  async function loadFromPath(filePath: string) {
    if (!filePath) return
    fileName = filePath.split('/').pop() ?? 'Media Player'
    isVideo = /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv)$/i.test(fileName)

    try {
      if (filePath.startsWith('blob:') || filePath.startsWith('http:') || filePath.startsWith('https:') || filePath.startsWith('data:')) {
        mediaSrc = filePath
        return
      }

      if (filePath.startsWith('/Mounted/') || filePath.startsWith('local:')) {
        const cleanPath = filePath.replace(/^\/Mounted/, '').replace(/^local:/, '')
        const blobUrl = await localfs.readBlobURL(cleanPath)
        if (blobUrl) {
          mediaSrc = blobUrl
          return
        }
      }

      if ($localfs.isMounted) {
        const cleanPath = filePath.replace(/^\/Mounted/, '').replace(/^local:/, '')
        try {
          const blobUrl = await localfs.readBlobURL(cleanPath)
          if (blobUrl) {
            mediaSrc = blobUrl
            return
          }
        } catch {}
      }

      const content = vfs.readFile(filePath)
      if (content) {
        if (content.startsWith('data:')) {
          mediaSrc = content
        } else {
          const blob = new Blob([content], { type: /\.svg$/i.test(fileName) ? 'image/svg+xml' : isVideo ? 'video/mp4' : 'audio/mp3' })
          mediaSrc = URL.createObjectURL(blob)
        }
      }
    } catch (e) {
      console.error('Error loading media file:', e)
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    fileName = file.name
    isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv)$/i.test(file.name)
    mediaSrc = URL.createObjectURL(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer?.files[0]
    if (!file) return
    fileName = file.name
    isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv)$/i.test(file.name)
    mediaSrc = URL.createObjectURL(file)
  }

  function triggerFlash(action: 'play' | 'pause' | 'seek-fw' | 'seek-bw') {
    flashAction = action
    if (flashTimeout) clearTimeout(flashTimeout)
    flashTimeout = setTimeout(() => flashAction = null, 600)
  }

  function togglePlay() {
    if (isImage) return
    if (!mediaElement) return
    if (isPlaying) {
      mediaElement.pause()
      isPlaying = false
      triggerFlash('pause')
    } else {
      mediaElement.play().catch(() => {})
      isPlaying = true
      triggerFlash('play')
    }
  }

  function toggleMute() {
    if (!mediaElement) return
    mediaElement.muted = !mediaElement.muted
    isMuted = mediaElement.muted
  }

  function toggleLoop() {
    isLooping = !isLooping
    if (mediaElement) mediaElement.loop = isLooping
  }

  function handleVolume(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value)
    volume = val
    if (mediaElement) {
      mediaElement.volume = val
      mediaElement.muted = val === 0
      isMuted = val === 0
    }
  }

  function handleSeek(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value)
    currentTime = val
    if (mediaElement) mediaElement.currentTime = val
  }

  function seekRelative(seconds: number) {
    if (!mediaElement) return
    mediaElement.currentTime = Math.max(0, Math.min(duration, mediaElement.currentTime + seconds))
    triggerFlash(seconds > 0 ? 'seek-fw' : 'seek-bw')
  }

  function changeSpeed(rate: number) {
    playbackRate = rate
    if (mediaElement) mediaElement.playbackRate = rate
    showSpeedMenu = false
  }

  function togglePiP() {
    if (mediaElement && mediaElement instanceof HTMLVideoElement) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture()
      } else {
        mediaElement.requestPictureInPicture()
      }
    }
  }

  function toggleFullscreen() {
    if (!playerContainer) return
    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  function handleMouseMove() {
    showControls = true
    if (hideTimeout) clearTimeout(hideTimeout)
    if (isPlaying) {
      hideTimeout = setTimeout(() => showControls = false, 2500)
    }
  }

  function formatTime(s: number): string {
    if (isNaN(s) || s < 0) return '0:00:00'
    const hrs = Math.floor(s / 3600)
    const mins = Math.floor((s % 3600) / 60)
    const secs = Math.floor(s % 60)
    const mStr = String(mins).padStart(2, '0')
    const sStr = String(secs).padStart(2, '0')
    return `${hrs}:${mStr}:${sStr}`
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay() }
    if (e.key === 'f') { e.preventDefault(); toggleFullscreen() }
    if (e.key === 'm') { e.preventDefault(); toggleMute() }
    if (e.key === 'ArrowLeft') { e.preventDefault(); seekRelative(-10) }
    if (e.key === 'ArrowRight') { e.preventDefault(); seekRelative(10) }
    if (e.key === 'ArrowUp') { e.preventDefault(); handleVolume({ target: { value: Math.min(1, volume + 0.1) } } as any) }
    if (e.key === 'ArrowDown') { e.preventDefault(); handleVolume({ target: { value: Math.max(0, volume - 0.1) } } as any) }
  }

  $: progressPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="media-app"
  bind:this={playerContainer}
  on:mousemove={handleMouseMove}
  on:mouseleave={() => isPlaying && (showControls = false)}
  on:keydown={handleKeydown}
  on:dragover|preventDefault
  on:drop={handleDrop}
  tabindex="0"
>
  <!-- Top App Bar -->
  <div class="top-header" class:hidden={!showControls && isPlaying}>
    <div class="top-left">
      <button class="top-icon-btn" title="Home">
        <Home size={13} color="rgba(255,255,255,0.7)" />
      </button>
      <div class="top-sep"></div>
      <div class="app-logo">
        <div class="logo-circle">
          <div class="logo-play-icon"></div>
        </div>
        <span class="app-title">Media Player</span>
      </div>
    </div>
  </div>

  <!-- Main Viewport -->
  <div class="media-viewport" on:click={togglePlay} on:dblclick={toggleFullscreen}>
    {#if mediaSrc}
      {#if isImage}
        <img src={mediaSrc} alt={fileName} class="image-element" />
      {:else if isVideo}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
          bind:this={mediaElement}
          src={mediaSrc}
          class="video-element"
          on:timeupdate={() => currentTime = mediaElement?.currentTime ?? 0}
          on:loadedmetadata={() => {
            duration = mediaElement?.duration ?? 0
            mediaElement?.play().catch(() => {})
            isPlaying = true
          }}
          on:play={() => isPlaying = true}
          on:pause={() => isPlaying = false}
          on:ended={() => { isPlaying = false; showControls = true }}
          playsinline
        ></video>
      {:else}
        <div class="audio-stage">
          <div class="disc-glow" class:spinning={isPlaying}>
            <div class="disc-center">
              <Music size={54} color="#ffffff" />
            </div>
          </div>
          <div class="audio-meta">
            <span class="audio-title">{fileName}</span>
            <span class="audio-sub">Groove Music Player</span>
          </div>

          <!-- Spectrum equalizer animation -->
          <div class="audio-spectrum" class:playing={isPlaying}>
            <div class="bar bar1"></div>
            <div class="bar bar2"></div>
            <div class="bar bar3"></div>
            <div class="bar bar4"></div>
            <div class="bar bar5"></div>
          </div>

          <audio
            bind:this={mediaElement}
            src={mediaSrc}
            on:timeupdate={() => currentTime = mediaElement?.currentTime ?? 0}
            on:loadedmetadata={() => {
              duration = mediaElement?.duration ?? 0
              mediaElement?.play().catch(() => {})
              isPlaying = true
            }}
            on:play={() => isPlaying = true}
            on:pause={() => isPlaying = false}
            on:ended={() => isPlaying = false}
          ></audio>
        </div>
      {/if}
    {:else}
      <label class="drop-zone">
        <FolderOpen size={48} color="#f7630c" />
        <span class="drop-title">Open or Drop Image, Video or Audio</span>
        <span class="drop-sub">Pictures, videos and music</span>
        <input type="file" accept="image/*,video/*,audio/*" on:change={handleFileSelect} hidden />
      </label>
    {/if}

    <!-- Flash Overlay Animation -->
    {#if flashAction}
      <div class="flash-overlay">
        {#if flashAction === 'play'}<Play size={36} color="#fff" />{/if}
        {#if flashAction === 'pause'}<Pause size={36} color="#fff" />{/if}
        {#if flashAction === 'seek-fw'}<RotateCw size={36} color="#fff" />{/if}
        {#if flashAction === 'seek-bw'}<RotateCcw size={36} color="#fff" />{/if}
      </div>
    {/if}
  </div>

  <!-- Bottom Floating Media Player Controls Bar -->
  {#if !isImage}
  <div class="bottom-controls-bar" class:hidden={!showControls && isPlaying}>
    <!-- Progress Bar Row -->
    <div class="progress-row">
      <span class="time-stamp left">{formatTime(currentTime)}</span>
      <div class="progress-track-wrap">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          on:input={handleSeek}
          class="progress-slider"
          style="background: linear-gradient(to right, #f7630c 0%, #f7630c {progressPct}%, rgba(255,255,255,0.22) {progressPct}%, rgba(255,255,255,0.22) 100%)"
        />
      </div>
      <span class="time-stamp right">{formatTime(duration)}</span>
    </div>

    <!-- Main Controls Row -->
    <div class="controls-main-row">
      <!-- Left: File title -->
      <div class="left-section">
        <span class="video-title-label" title={fileName}>{fileName}</span>
      </div>

      <!-- Center: Playback control buttons -->
      <div class="center-controls">
        <label class="ctrl-btn" title="Open Media File">
          <FolderOpen size={16} />
          <input type="file" accept="image/*,video/*,audio/*" on:change={handleFileSelect} hidden />
        </label>

        <button class="ctrl-btn" on:click|stopPropagation={() => seekRelative(-10)} title="Rewind 10s (←)">
          <div class="seek-btn-inner">
            <RotateCcw size={15} />
            <span class="seek-num">10</span>
          </div>
        </button>

        <!-- Main Play / Pause Button -->
        <button class="play-pause-ring-btn" on:click|stopPropagation={togglePlay} title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
          {#if isPlaying}
            <Pause size={17} color="#ffffff" />
          {:else}
            <Play size={17} color="#ffffff" style="margin-left: 2px" />
          {/if}
        </button>

        <button class="ctrl-btn" on:click|stopPropagation={() => seekRelative(10)} title="Forward 10s (→)">
          <div class="seek-btn-inner">
            <RotateCw size={15} />
            <span class="seek-num">10</span>
          </div>
        </button>

        <button class="ctrl-btn" title="Fit to Window" on:click|stopPropagation={toggleFullscreen}>
          <Scaling size={16} />
        </button>

        <div class="speed-menu-wrap">
          <button class="ctrl-btn" title="Playback Speed" on:click|stopPropagation={() => showSpeedMenu = !showSpeedMenu}>
            <Sliders size={16} />
          </button>
          {#if showSpeedMenu}
            <div class="speed-dropdown">
              {#each speeds as s}
                <button class="speed-opt" class:active={playbackRate === s} on:click|stopPropagation={() => changeSpeed(s)}>
                  {s}x
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <button class="ctrl-btn" class:active-toggle={isLooping} on:click|stopPropagation={toggleLoop} title="Toggle Repeat">
          <Repeat size={15} />
        </button>
      </div>

      <!-- Right: Secondary controls -->
      <div class="right-controls">
        {#if isVideo}
          <button class="ctrl-btn" on:click|stopPropagation={togglePiP} title="Picture-in-Picture">
            <PictureInPicture size={16} />
          </button>

          <button class="ctrl-btn" title="Cast to device">
            <Monitor size={16} />
          </button>
        {/if}

        <div class="volume-container" on:mouseenter={() => showVolumeSlider = true} on:mouseleave={() => showVolumeSlider = false}>
          {#if showVolumeSlider}
            <div class="volume-popover">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                on:input={handleVolume}
                class="volume-popup-slider"
                style="background: linear-gradient(to right, #f7630c 0%, #f7630c {(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) {(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)"
              />
            </div>
          {/if}

          <button class="ctrl-btn" on:click|stopPropagation={toggleMute} title={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
            {#if isMuted || volume === 0}
              <VolumeX size={16} color="#f14c4c" />
            {:else}
              <Volume2 size={16} />
            {/if}
          </button>
        </div>

        {#if isVideo}
          <button class="ctrl-btn" on:click|stopPropagation={toggleFullscreen} title="Fullscreen (F)">
            <Maximize size={16} />
          </button>
        {/if}

        <button class="ctrl-btn" title="More Options">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  </div>
  {/if}
</div>

<style>
  .image-element { position: absolute; width: 100%; height: 100%; object-fit: contain; }
  .media-app {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #000000;
    color: #ffffff;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    outline: none;
    user-select: none;
  }

  /* Top Bar */
  .top-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 36px;
    padding: 0 12px;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
    transition: opacity 0.25s ease;
    pointer-events: auto;
  }

  .top-header.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .top-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .top-icon-btn {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.7);
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .top-icon-btn:hover {
    background: rgba(255,255,255,0.15);
    color: #fff;
  }

  .top-sep {
    width: 1px;
    height: 12px;
    background: rgba(255,255,255,0.2);
  }

  .app-logo {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .logo-circle {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c0392b 0%, #8e44ad 50%, #f7630c 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-play-icon {
    width: 0;
    height: 0;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-left: 6px solid #ffffff;
    margin-left: 1px;
  }

  .app-title {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255,255,255,0.85);
  }

  /* Viewport */
  .media-viewport {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000000;
    cursor: pointer;
  }

  .video-element {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* Audio Stage */
  .audio-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .disc-glow {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(247,99,12,0.45) 0%, rgba(15,15,22,0.95) 75%);
    border: 3px solid rgba(255,255,255,0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 45px rgba(247,99,12,0.35);
    transition: transform 0.3s;
  }

  .disc-center {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: rgba(247, 99, 12, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.4);
  }

  .disc-glow.spinning {
    animation: rotate-disc 10s linear infinite;
  }

  @keyframes rotate-disc {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .audio-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .audio-title {
    font-size: 18px;
    font-weight: 600;
    color: rgba(255,255,255,0.95);
  }

  .audio-sub {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.4px;
  }

  .audio-spectrum {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 24px;
  }

  .audio-spectrum .bar {
    width: 4px;
    background: #f7630c;
    border-radius: 2px;
    height: 4px;
  }

  .audio-spectrum.playing .bar1 { animation: eq-bounce 0.8s ease-in-out infinite alternate; }
  .audio-spectrum.playing .bar2 { animation: eq-bounce 0.6s ease-in-out infinite 0.2s alternate; }
  .audio-spectrum.playing .bar3 { animation: eq-bounce 0.9s ease-in-out infinite 0.1s alternate; }
  .audio-spectrum.playing .bar4 { animation: eq-bounce 0.7s ease-in-out infinite 0.3s alternate; }
  .audio-spectrum.playing .bar5 { animation: eq-bounce 0.85s ease-in-out infinite 0.15s alternate; }

  @keyframes eq-bounce {
    0% { height: 4px; }
    100% { height: 22px; }
  }

  /* Drop Zone Placeholder */
  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 60px;
    border: 2px dashed rgba(255,255,255,0.18);
    border-radius: 16px;
    background: rgba(255,255,255,0.02);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .drop-zone:hover {
    background: rgba(255,255,255,0.06);
    border-color: #f7630c;
  }

  .drop-title {
    font-size: 15px;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
  }

  .drop-sub {
    font-size: 12px;
    color: rgba(255,255,255,0.45);
  }

  /* Flash Action Overlay */
  .flash-overlay {
    position: absolute;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    animation: flash-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes flash-pop {
    0% { opacity: 0; transform: scale(0.6); }
    50% { opacity: 1; transform: scale(1.1); }
    100% { opacity: 0; transform: scale(1); }
  }

  /* Bottom Controls Bar (Matches Real Windows 11 Media Player) */
  .bottom-controls-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.6) 70%, transparent 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding: 0 16px 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: opacity 0.25s ease, transform 0.25s ease;
    z-index: 50;
    pointer-events: auto;
  }

  .bottom-controls-bar.hidden {
    opacity: 0;
    transform: translateY(20px);
    pointer-events: none;
  }

  /* Progress Bar Row */
  .progress-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .time-stamp {
    font-size: 11px;
    font-family: 'Segoe UI', monospace;
    color: rgba(255, 255, 255, 0.8);
    min-width: 52px;
    user-select: none;
  }

  .time-stamp.right {
    text-align: right;
  }

  .progress-track-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    position: relative;
  }

  .progress-slider {
    width: 100%;
    height: 4px;
    cursor: pointer;
    border-radius: 2px;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    transition: height 0.15s ease;
  }

  .progress-slider:hover {
    height: 6px;
  }

  .progress-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #f7630c;
    box-shadow: 0 0 8px rgba(247, 99, 12, 0.7);
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .progress-slider::-webkit-slider-thumb:hover {
    transform: scale(1.3);
  }

  /* Main Controls Row */
  .controls-main-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* Left Section */
  .left-section {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .video-title-label {
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.95);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 240px;
  }

  /* Center Controls Cluster */
  .center-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ctrl-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, transform 0.1s;
    position: relative;
  }

  .ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  .ctrl-btn.active-toggle {
    color: #f7630c;
    background: rgba(247, 99, 12, 0.15);
  }

  .seek-btn-inner {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .seek-num {
    position: absolute;
    font-size: 8px;
    font-weight: 700;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    color: #fff;
  }

  /* Play Pause Glowing Ring Button */
  .play-pause-ring-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid #f7630c;
    background: rgba(0, 0, 0, 0.5);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 0 14px rgba(247, 99, 12, 0.45);
    transition: background 0.15s, transform 0.15s, border-color 0.15s;
    margin: 0 4px;
  }

  .play-pause-ring-btn:hover {
    background: #f7630c;
    border-color: #f7630c;
    transform: scale(1.08);
  }

  /* Right Controls Cluster */
  .right-controls {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  .volume-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .volume-popover {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(24, 24, 28, 0.95);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    z-index: 100;
  }

  .volume-popup-slider {
    width: 90px;
    height: 4px;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    border-radius: 2px;
    outline: none;
  }

  .volume-popup-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
  }

  /* Speed Dropdown Menu */
  .speed-menu-wrap {
    position: relative;
  }

  .speed-dropdown {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(24, 24, 28, 0.95);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.6);
    z-index: 100;
    min-width: 60px;
  }

  .speed-opt {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.8);
    font-size: 11px;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    text-align: center;
  }

  .speed-opt:hover {
    background: rgba(255,255,255,0.15);
    color: #fff;
  }

  .speed-opt.active {
    color: #f7630c;
    font-weight: 600;
  }
</style>
