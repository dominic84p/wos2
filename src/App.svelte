<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import Desktop from './lib/components/desktop/Desktop.svelte'
  import GrubScreen from './lib/components/desktop/GrubScreen.svelte'
  import { settings } from './lib/stores/settings'
  import { bricked } from './lib/stores/system'

  // ── Theme + accent ────────────────────────────────────────────────
  $: {
    document.documentElement.setAttribute('data-theme', $settings.themeId ?? 'default')
    document.documentElement.style.setProperty('--accent', $settings.accentColor)
  }

  // ── Tab title ─────────────────────────────────────────────────────
  $: document.title = $settings.willMode ? 'Google Classroom' : 'WOS'

  // ── Taskbar edge CSS vars ─────────────────────────────────────────
  $: {
    const edge = $settings.taskbarEdge ?? 'bottom'
    const sz = 'var(--taskbar-height)'
    document.documentElement.style.setProperty('--tb-top',    edge === 'top'    ? sz : '0px')
    document.documentElement.style.setProperty('--tb-bottom', edge === 'bottom' ? sz : '0px')
    document.documentElement.style.setProperty('--tb-left',   edge === 'left'   ? sz : '0px')
    document.documentElement.style.setProperty('--tb-right',  edge === 'right'  ? sz : '0px')
  }

  // ── Panic shortcut ────────────────────────────────────────────────
  const held = new Set<string>()

  function doPanic() { window.location.replace('https://docs.google.com') }

  function onKeydown(e: KeyboardEvent) {
    held.add(e.key)
    if (held.has('4') && held.has('9') && held.has(' ')) doPanic()
  }
  function onKeyup(e: KeyboardEvent) { held.delete(e.key) }

  // ── iframe panic (only when willMode is on) ───────────────────────
  type IframeEntry = { win: Window; kd: (e: KeyboardEvent) => void; ku: (e: KeyboardEvent) => void }
  let iframeListeners: IframeEntry[] = []

  function attachIframePanic(iframe: HTMLIFrameElement) {
    try {
      const win = iframe.contentWindow
      if (!win) return
      win.document // throws if cross-origin
      if (iframeListeners.some(e => e.win === win)) return
      const kd = (e: KeyboardEvent) => { held.add(e.key); if (held.has('4') && held.has('9') && held.has(' ')) doPanic() }
      const ku = (e: KeyboardEvent) => held.delete(e.key)
      win.addEventListener('keydown', kd)
      win.addEventListener('keyup', ku)
      iframeListeners.push({ win, kd, ku })
    } catch { /* cross-origin */ }
  }

  function detachIframePanic() {
    for (const { win, kd, ku } of iframeListeners) {
      try { win.removeEventListener('keydown', kd); win.removeEventListener('keyup', ku) } catch {}
    }
    iframeListeners = []
  }

  function onWindowBlur() {
    held.clear()
    if (!$settings.willMode) return
    const el = document.activeElement
    if (el?.tagName === 'IFRAME') attachIframePanic(el as HTMLIFrameElement)
  }

  $: if (!$settings.willMode) detachIframePanic()

  onMount(() => {
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('keyup', onKeyup)
    window.addEventListener('blur', onWindowBlur)
  })
  onDestroy(() => {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('keyup', onKeyup)
    window.removeEventListener('blur', onWindowBlur)
    detachIframePanic()
  })
</script>

{#if $bricked}
  <GrubScreen />
{:else}
  <Desktop />
{/if}
