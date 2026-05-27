<script lang="ts">
  import { settings } from '../../stores/settings'
  import { exportBackup, importBackup, type WOSBackup } from '../../utils/backup'
  import { Download, Upload, RotateCcw, Palette, Shield, Database, Info, Monitor } from 'lucide-svelte'
  import type { ThemeId, TaskbarEdge } from '../../types'

  export const windowId: string = ''

  type Section = 'appearance' | 'desktop' | 'privacy' | 'data' | 'about'
  let activeSection: Section = 'appearance'

  // ── Wallpapers ────────────────────────────────────────────────────
  let wallpapers: string[] = []
  async function loadWallpapers() {
    try {
      const res = await fetch('/wallpapers/manifest.json')
      if (res.ok) wallpapers = (await res.json() as string[]).map(f => `/wallpapers/${f}`)
    } catch { wallpapers = ['/wallpapers/cool space.jpg'] }
  }
  loadWallpapers()

  // ── Theme presets ─────────────────────────────────────────────────
  interface ThemePreset {
    id: string
    label: string
    description: string
    themeId: ThemeId
    accentColor: string
    taskbarEdge: TaskbarEdge
    colors: { desktop: string; window: string; titlebar: string; taskbar: string; accent: string }
    taskbarAtTop: boolean
    gradientDesktop?: string
    gradientTitlebar?: string
    gradientTaskbar?: string
  }

  const themePresets: ThemePreset[] = [
    {
      id: 'default', label: 'Default', description: 'Windows 11',
      themeId: 'default', accentColor: '#3584e4', taskbarEdge: 'bottom',
      colors: { desktop: '#1a1a1a', window: '#202020', titlebar: '#1f1f1f', taskbar: '#282828', accent: '#3584e4' },
      taskbarAtTop: false,
    },
    {
      id: 'midnight', label: 'Midnight', description: 'Deep dark',
      themeId: 'midnight', accentColor: '#3584e4', taskbarEdge: 'bottom',
      colors: { desktop: '#08080f', window: '#12121f', titlebar: '#0e0e1c', taskbar: '#09091a', accent: '#3584e4' },
      taskbarAtTop: false,
    },
    {
      id: 'linux', label: 'Linux', description: 'GNOME style',
      themeId: 'linux', accentColor: '#E95420', taskbarEdge: 'top',
      colors: { desktop: '#1e1e1e', window: '#2d2d2d', titlebar: '#323232', taskbar: '#1a1a1a', accent: '#E95420' },
      taskbarAtTop: true,
    },
    {
      id: 'hacker', label: 'Hacker', description: 'Terminal mode',
      themeId: 'hacker', accentColor: '#00ff41', taskbarEdge: 'bottom',
      colors: { desktop: '#050505', window: '#0a0f0a', titlebar: '#0a100a', taskbar: '#020602', accent: '#00ff41' },
      taskbarAtTop: false,
    },
    {
      id: 'aislop', label: '✨ AI Slop', description: 'Gradient everything',
      themeId: 'aislop', accentColor: '#a855f7', taskbarEdge: 'bottom',
      colors: { desktop: '#0d0520', window: '#150d30', titlebar: '#7c3aed', taskbar: '#4f46e5', accent: '#a855f7' },
      gradientDesktop: 'linear-gradient(135deg, #0d0520, #060d25)',
      gradientTitlebar: 'linear-gradient(90deg, #7c3aed, #2563eb, #db2777)',
      gradientTaskbar:  'linear-gradient(90deg, #4f46e5, #7c3aed, #db2777)',
      taskbarAtTop: false,
    },
  ]

  function applyTheme(p: ThemePreset) {
    settings.patch({ themeId: p.themeId, accentColor: p.accentColor, taskbarEdge: p.taskbarEdge })
  }

  function isPresetActive(p: ThemePreset) {
    return $settings.themeId === p.themeId
  }

  // ── Accent swatches ───────────────────────────────────────────────
  const accentColors = [
    { label: 'Blue',    value: '#3584e4' },
    { label: 'Purple',  value: '#9b59b6' },
    { label: 'Green',   value: '#27ae60' },
    { label: 'Orange',  value: '#e67e22' },
    { label: 'Red',     value: '#e74c3c' },
    { label: 'Pink',    value: '#e84393' },
    { label: 'Cyan',    value: '#17a2b8' },
    { label: 'Yellow',  value: '#f39c12' },
  ]

  // ── Taskbar positions ─────────────────────────────────────────────
  const taskbarPositions: { edge: TaskbarEdge; label: string }[] = [
    { edge: 'bottom', label: 'Bottom' },
    { edge: 'top',    label: 'Top'    },
    { edge: 'left',   label: 'Left'   },
    { edge: 'right',  label: 'Right'  },
  ]

  // ── Data ──────────────────────────────────────────────────────────
  let exporting = false
  let importing = false

  async function exportSave() {
    exporting = true
    try {
      const backup = await exportBackup()
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `wos_backup_${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally { exporting = false }
  }

  function importSave() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      importing = true
      try {
        const text = await file.text()
        const backup = JSON.parse(text) as WOSBackup
        if (backup.version === 2 && backup.localStorage) {
          await importBackup(backup); window.location.reload()
        } else {
          if (!settings.importSave(text)) alert('Invalid backup file')
        }
      } catch { alert('Invalid backup file'); importing = false }
    }
    input.click()
  }

  let confirmReset = false
  function resetSave() {
    if (!confirmReset) { confirmReset = true; return }
    settings.reset(); confirmReset = false
  }
</script>

<div class="settings">
  <!-- Sidebar -->
  <nav class="sidebar">
    <div class="sidebar-title">Settings</div>
    {#each [
      { id: 'appearance', label: 'Appearance', Icon: Palette  },
      { id: 'desktop',    label: 'Desktop',    Icon: Monitor  },
      { id: 'privacy',    label: 'Privacy',    Icon: Shield   },
      { id: 'data',       label: 'Data',       Icon: Database },
      { id: 'about',      label: 'About',      Icon: Info     },
    ] as item (item.id)}
      <button
        class="nav-item"
        class:active={activeSection === item.id}
        on:click={() => activeSection = item.id as Section}
      >
        <svelte:component this={item.Icon} size={15} />
        {item.label}
      </button>
    {/each}
  </nav>

  <!-- Panel -->
  <div class="panel">

    {#if activeSection === 'appearance'}

      <!-- Theme presets -->
      <section>
        <h2>Theme</h2>
        <div class="preset-grid">
          {#each themePresets as p (p.id)}
            <button
              class="preset-card"
              class:active={isPresetActive(p)}
              title={p.description}
              on:click={() => applyTheme(p)}
            >
              <!-- Mini desktop preview -->
              <div class="prev-desktop" style="{p.gradientDesktop ? `background:${p.gradientDesktop}` : `background:${p.colors.desktop}`}">
                {#if p.taskbarAtTop}
                  <div class="prev-taskbar prev-taskbar-top" style="{p.gradientTaskbar ? `background:${p.gradientTaskbar}` : `background:${p.colors.taskbar}`}">
                    <div class="prev-tb-dot" style="background:{p.colors.accent}"></div>
                  </div>
                {/if}
                <div class="prev-window" style="border-color:{p.gradientDesktop ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}">
                  <div class="prev-titlebar" style="{p.gradientTitlebar ? `background:${p.gradientTitlebar}` : `background:${p.colors.titlebar}`}">
                    <div class="prev-btn" style="background:{p.colors.accent}"></div>
                  </div>
                  <div class="prev-body" style="background:{p.colors.window}"></div>
                </div>
                {#if !p.taskbarAtTop}
                  <div class="prev-taskbar prev-taskbar-bottom" style="{p.gradientTaskbar ? `background:${p.gradientTaskbar}` : `background:${p.colors.taskbar}`}">
                    <div class="prev-tb-dot" style="background:{p.colors.accent}"></div>
                  </div>
                {/if}
              </div>
              <div class="prev-label">
                <span class="prev-name">{p.label}</span>
                <span class="prev-desc">{p.description}</span>
              </div>
              {#if isPresetActive(p)}
                <div class="preset-check"></div>
              {/if}
            </button>
          {/each}
        </div>
      </section>

      <!-- Accent color -->
      <section>
        <h2>Accent Color</h2>
        <div class="accent-row">
          {#each accentColors as c (c.value)}
            <button
              class="accent-swatch"
              class:sel={$settings.accentColor === c.value}
              style="background:{c.value}"
              title={c.label}
              on:click={() => settings.patch({ accentColor: c.value })}
            ></button>
          {/each}
          <input
            type="color"
            class="color-picker"
            value={$settings.accentColor}
            title="Custom"
            on:input={(e) => settings.patch({ accentColor: e.currentTarget.value })}
          />
        </div>
      </section>

      <!-- Wallpaper -->
      <section>
        <h2>Wallpaper</h2>
        <div class="wallpaper-grid">
          {#each wallpapers as wp (wp)}
            <button
              class="wp-thumb"
              class:sel={$settings.wallpaper === wp}
              style="background-image:url({wp})"
              on:click={() => settings.patch({ wallpaper: wp })}
            ></button>
          {/each}
          {#if wallpapers.length === 0}
            <p class="hint">No wallpapers — add images to <code>public/wallpapers/</code></p>
          {/if}
        </div>
      </section>

    {:else if activeSection === 'desktop'}

      <!-- Taskbar position -->
      <section>
        <h2>Taskbar Position</h2>
        <div class="pos-grid">
          {#each taskbarPositions as pos (pos.edge)}
            <button
              class="pos-btn"
              class:active={$settings.taskbarEdge === pos.edge}
              on:click={() => settings.patch({ taskbarEdge: pos.edge })}
            >
              <div class="pos-preview">
                <div class="pos-screen">
                  <div class="pos-bar pos-bar-{pos.edge}"></div>
                </div>
              </div>
              <span class="pos-label">{pos.label}</span>
            </button>
          {/each}
        </div>
      </section>

    {:else if activeSection === 'privacy'}

      <section>
        <h2>Will Mode</h2>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="toggle-card" on:click={() => settings.patch({ willMode: !$settings.willMode })}>
          <div>
            <div class="toggle-title">Bitch ass will mode</div>
            <p class="hint">Changes the tab title to "Google Classroom"</p>
          </div>
          <div class="toggle-track" class:on={$settings.willMode}>
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="shortcut-card">
          <span class="shortcut-label">Panic shortcut</span>
          <div class="shortcut-keys">
            <kbd>4</kbd><kbd>9</kbd><kbd>Space</kbd>
          </div>
          <p class="hint">Replaces this tab with Google Docs instantly</p>
        </div>
      </section>

    {:else if activeSection === 'data'}

      <section>
        <h2>Backup</h2>
        <p class="hint">Exports everything — settings, EaglerCraft world saves &amp; username, icon positions, cookies. Email it to yourself to restore on any machine.</p>
        <div class="btn-row">
          <button class="action-btn" on:click={exportSave} disabled={exporting}>
            <Download size={14} />{exporting ? 'Exporting…' : 'Export backup'}
          </button>
          <button class="action-btn" on:click={importSave} disabled={importing}>
            <Upload size={14} />{importing ? 'Importing…' : 'Import backup'}
          </button>
        </div>
      </section>

      <section>
        <h2>Reset</h2>
        <p class="hint">Wipes all WOS settings back to defaults. Does not touch EaglerCraft saves.</p>
        <button class="action-btn danger" on:click={resetSave}>
          <RotateCcw size={14} />{confirmReset ? 'Click again to confirm' : 'Reset everything'}
        </button>
      </section>

    {:else if activeSection === 'about'}

      <section>
        <h2>WOS</h2>
        <div class="about-card">
          <div class="about-version">v2.0</div>
          <p class="hint">Browser-based desktop OS. Built with Svelte + Vite + Cloudflare Workers.</p>
          <div class="about-features">
            <span>Browser</span><span>Music</span><span>Games</span>
            <span>VS Code</span><span>Paint</span><span>Notepad</span>
            <span>Terminal</span><span>EaglerCraft</span>
          </div>
        </div>
      </section>

    {/if}
  </div>
</div>

<style>
  .settings {
    display: flex;
    height: 100%;
    background: var(--window-bg);
    color: var(--text-primary);
    font-family: inherit;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 172px;
    flex-shrink: 0;
    background: var(--window-titlebar-focus);
    border-right: 1px solid var(--window-border);
    display: flex;
    flex-direction: column;
    padding: 14px 8px;
    gap: 2px;
  }

  .sidebar-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 2px 12px 12px;
    opacity: 0.6;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 12px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 13px;
    text-align: left;
    width: 100%;
    transition: background 0.12s, color 0.12s;
  }

  .nav-item:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
  .nav-item.active { background: rgba(255,255,255,0.08); color: var(--accent); }

  /* ── Panel ── */
  .panel {
    flex: 1;
    overflow-y: auto;
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  section { display: flex; flex-direction: column; gap: 12px; }

  h2 {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.7;
  }

  /* ── Theme preset cards ── */
  .preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .preset-card {
    position: relative;
    border-radius: 10px;
    border: 2px solid rgba(255,255,255,0.07);
    background: transparent;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
    display: flex;
    flex-direction: column;
    transition: border-color 0.15s, transform 0.1s;
    text-align: left;
  }

  .preset-card:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
  .preset-card.active { border-color: var(--accent); }

  /* Mini desktop preview */
  .prev-desktop {
    height: 80px;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .prev-window {
    position: absolute;
    top: 14px; left: 10px; right: 10px; bottom: 14px;
    border-radius: 3px;
    border: 1px solid;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .prev-titlebar {
    height: 10px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 0 4px;
    gap: 2px;
  }

  .prev-btn {
    width: 5px; height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-left: auto;
  }

  .prev-body { flex: 1; }

  .prev-taskbar {
    height: 12px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 0 5px;
  }

  .prev-taskbar-bottom { position: absolute; bottom: 0; left: 0; right: 0; }
  .prev-taskbar-top    { position: absolute; top: 0; left: 0; right: 0; }

  .prev-tb-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
  }

  .prev-label {
    padding: 8px 10px;
    background: var(--window-titlebar-bg);
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .prev-name {
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .prev-desc {
    font-size: 10px;
    color: var(--text-secondary);
    opacity: 0.7;
  }

  .preset-check {
    position: absolute;
    top: 6px; right: 6px;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--accent);
  }

  /* ── Accent ── */
  .accent-row {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
  }

  .accent-swatch {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.12s, border-color 0.12s;
  }

  .accent-swatch:hover { transform: scale(1.15); }
  .accent-swatch.sel { border-color: #fff; }

  .color-picker {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.18);
    cursor: pointer;
    padding: 0;
    background: none;
  }

  /* ── Wallpaper ── */
  .wallpaper-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 8px;
  }

  .wp-thumb {
    height: 70px;
    border-radius: 9px;
    background-size: cover;
    background-position: center;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color 0.12s, transform 0.1s;
  }

  .wp-thumb:hover { transform: scale(1.03); }
  .wp-thumb.sel { border-color: var(--accent); }

  /* ── Taskbar position editor ── */
  .pos-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .pos-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 8px 10px;
    border-radius: 10px;
    border: 2px solid rgba(255,255,255,0.07);
    background: transparent;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.1s;
  }

  .pos-btn:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
  .pos-btn.active { border-color: var(--accent); }

  .pos-preview {
    width: 52px; height: 40px;
  }

  .pos-screen {
    width: 100%;
    height: 100%;
    background: var(--window-titlebar-bg);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
  }

  .pos-bar {
    background: #555;
    position: absolute;
  }

  .pos-bar-bottom { bottom: 0; left: 0; right: 0; height: 7px; }
  .pos-bar-top    { top: 0;    left: 0; right: 0; height: 7px; }
  .pos-bar-left   { top: 0; left: 0; bottom: 0; width: 7px; }
  .pos-bar-right  { top: 0; right: 0; bottom: 0; width: 7px; }

  .pos-btn.active .pos-bar { background: var(--accent); }

  .pos-label {
    font-size: 11px;
    color: rgba(255,255,255,0.55);
    text-transform: capitalize;
  }

  .pos-btn.active .pos-label { color: var(--accent); }

  /* ── Toggle ── */
  .toggle-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid var(--window-border);
    background: rgba(255,255,255,0.03);
    cursor: pointer;
    transition: background 0.12s;
  }

  .toggle-card:hover { background: rgba(255,255,255,0.06); }

  .toggle-title {
    font-size: 13px;
    color: var(--text-primary);
    margin-bottom: 3px;
  }

  .toggle-track {
    width: 42px; height: 24px;
    border-radius: 12px;
    background: rgba(255,255,255,0.14);
    position: relative;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .toggle-track.on { background: var(--accent); }

  .toggle-thumb {
    position: absolute;
    top: 3px; left: 3px;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    transition: left 0.2s;
  }

  .toggle-track.on .toggle-thumb { left: 21px; }

  /* ── Shortcut ── */
  .shortcut-card {
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid var(--window-border);
    background: rgba(255,255,255,0.02);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shortcut-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .shortcut-keys { display: flex; align-items: center; gap: 6px; }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.14);
    font-size: 12px;
    font-family: inherit;
    color: rgba(255,255,255,0.8);
    min-width: 30px;
  }

  /* ── Data ── */
  .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }

  .action-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 16px;
    border-radius: 8px;
    border: 1px solid var(--window-border);
    background: rgba(255,255,255,0.05);
    color: var(--text-primary);
    cursor: pointer;
    font-size: 13px;
    transition: background 0.12s;
  }

  .action-btn:hover { background: rgba(255,255,255,0.1); }
  .action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .action-btn.danger:hover { background: rgba(231,76,60,0.15); border-color: rgba(231,76,60,0.4); color: #e74c3c; }

  /* ── About ── */
  .about-card {
    padding: 22px;
    border-radius: 10px;
    border: 1px solid var(--window-border);
    background: rgba(255,255,255,0.02);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .about-version {
    font-size: 36px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: -0.02em;
  }

  .about-features {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }

  .about-features span {
    padding: 3px 10px;
    border-radius: 20px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    font-size: 11px;
    color: rgba(255,255,255,0.55);
  }

  /* ── Shared ── */
  .hint {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.55;
    margin: 0;
    opacity: 0.8;
  }

  code {
    background: rgba(255,255,255,0.08);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 11px;
  }
</style>
