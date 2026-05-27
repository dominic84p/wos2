<script lang="ts">
  import { settings } from '../../stores/settings'
  import { exportBackup, importBackup, type WOSBackup } from '../../utils/backup'
  import { Download, Upload, RotateCcw } from 'lucide-svelte'

  export const windowId: string = ''

  // Wallpapers pulled from /public/wallpapers/
  // Names are discovered at build time — add files to public/wallpapers/ and list here
  let wallpapers: string[] = []

  async function loadWallpapers() {
    // Fetch manifest if present, else fall back to defaults
    try {
      const res = await fetch('/wallpapers/manifest.json')
      if (res.ok) {
        const list = await res.json() as string[]
        wallpapers = list.map(f => `/wallpapers/${f}`)
      }
    } catch {
      wallpapers = ['/wallpapers/cool space.jpg']
    }
  }
  loadWallpapers()

  const accentColors = [
    { label: 'Blue',   value: '#3584e4' },
    { label: 'Purple', value: '#9b59b6' },
    { label: 'Green',  value: '#27ae60' },
    { label: 'Orange', value: '#e67e22' },
    { label: 'Red',    value: '#e74c3c' },
    { label: 'Pink',   value: '#e84393' },
  ]

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
    } finally {
      exporting = false
    }
  }

  function importSave() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      importing = true
      try {
        const text = await file.text()
        const backup = JSON.parse(text) as WOSBackup
        if (backup.version === 2 && backup.localStorage) {
          await importBackup(backup)
          window.location.reload()
        } else {
          // legacy v1 settings-only
          const ok = settings.importSave(text)
          if (!ok) alert('Invalid backup file')
        }
      } catch {
        alert('Invalid backup file')
        importing = false
      }
    }
    input.click()
  }

  let confirmReset = false
  function resetSave() {
    if (!confirmReset) { confirmReset = true; return }
    settings.reset()
    confirmReset = false
  }
</script>

<div class="settings">
  <nav class="sidebar">
    <span class="active">Appearance</span>
    <span>Save Data</span>
  </nav>

  <div class="panel">
    <section>
      <h2>Wallpaper</h2>
      <div class="wallpaper-grid">
        {#each wallpapers as wp}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="wp-thumb"
            class:selected={$settings.wallpaper === wp}
            style="background-image: url({wp})"
            on:click={() => settings.patch({ wallpaper: wp })}
          ></div>
        {/each}
        {#if wallpapers.length === 0}
          <p class="hint">No wallpapers found — add images to <code>public/wallpapers/</code></p>
        {/if}
      </div>
    </section>

    <section>
      <h2>Accent Color</h2>
      <div class="accent-row">
        {#each accentColors as c}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="accent-swatch"
            class:selected={$settings.accentColor === c.value}
            style="background:{c.value}"
            title={c.label}
            on:click={() => settings.patch({ accentColor: c.value })}
          ></div>
        {/each}
        <input
          type="color"
          value={$settings.accentColor}
          on:input={(e) => settings.patch({ accentColor: e.currentTarget.value })}
          title="Custom color"
        />
      </div>
    </section>

    <section>
      <h2>Theme</h2>
      <div class="theme-row">
        {#each ['dark', 'light'] as t}
          <button
            class="theme-btn"
            class:active={$settings.theme === t}
            on:click={() => settings.patch({ theme: t as 'dark' | 'light' })}
          >{t}</button>
        {/each}
      </div>
    </section>

    <section>
      <h2>Save Data</h2>
      <p class="hint">Backs up everything — WOS settings, EaglerCraft username &amp; world saves, icon positions, cookies. Download it and email it to yourself so you can restore it on any machine.</p>
      <div class="save-row">
        <button class="action-btn" on:click={exportSave} disabled={exporting}>
          <Download size={14} /> {exporting ? 'Exporting…' : 'Export backup'}
        </button>
        <button class="action-btn" on:click={importSave} disabled={importing}>
          <Upload size={14} /> {importing ? 'Importing…' : 'Import backup'}
        </button>
        <button class="action-btn danger" on:click={resetSave}>
          <RotateCcw size={14} />
          {confirmReset ? 'Click again to confirm' : 'Reset everything'}
        </button>
      </div>
    </section>
  </div>
</div>

<style>
  .settings {
    display: flex;
    height: 100%;
    background: #1a1a1a;
  }

  .sidebar {
    width: 160px;
    background: #222;
    border-right: 1px solid rgba(255,255,255,0.06);
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
  }

  .sidebar span {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.1s;
  }

  .sidebar span:hover { background: rgba(255,255,255,0.06); }
  .sidebar span.active { background: rgba(53,132,228,0.18); color: var(--accent); }

  .panel {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  section { display: flex; flex-direction: column; gap: 12px; }

  h2 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .wallpaper-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }

  .wp-thumb {
    height: 70px;
    border-radius: 8px;
    background-size: cover;
    background-position: center;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color 0.12s, transform 0.1s;
  }

  .wp-thumb:hover { transform: scale(1.03); }
  .wp-thumb.selected { border-color: var(--accent); }

  .accent-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .accent-swatch {
    width: 28px; height: 28px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.1s;
  }

  .accent-swatch:hover { transform: scale(1.15); }
  .accent-swatch.selected { border-color: #fff; }

  .accent-row input[type=color] {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    padding: 0;
    background: none;
  }

  .theme-row { display: flex; gap: 8px; }

  .theme-btn {
    padding: 6px 18px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.12);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 13px;
    text-transform: capitalize;
    transition: background 0.1s, color 0.1s;
  }

  .theme-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .theme-btn.active { background: var(--accent); color: #fff; border-color: transparent; }

  .hint {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  code {
    background: rgba(255,255,255,0.08);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 11px;
  }

  .save-row { display: flex; gap: 8px; flex-wrap: wrap; }

  .action-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: var(--text-primary);
    cursor: pointer;
    font-size: 13px;
    transition: background 0.1s;
  }

  .action-btn:hover { background: rgba(255,255,255,0.1); }
  .action-btn.danger:hover { background: rgba(231,76,60,0.15); border-color: rgba(231,76,60,0.4); color: #e74c3c; }
</style>
