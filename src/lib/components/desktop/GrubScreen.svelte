<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { vfs } from '../../stores/filesystem'
  import { restoreSystem } from '../../stores/system'

  const lines = [
    '',
    '                             GNU GRUB  version 2.06',
    '',
    ' Minimal BASH-like line editing is supported. For the first word, TAB',
    ' lists possible command completions. Anywhere else TAB lists possible',
    ' device or file completions.',
    '',
    'error: file \'/usr/wos/system.elf\' not found.',
    'error: file \'/usr/wos/kernel/wos.ko\' not found.',
    'error: you need to load the kernel first.',
    '',
    'Entering rescue mode...',
    'grub rescue> ',
  ]

  let displayed: string[] = []
  let done = false
  let typed = ''
  let blink = true

  let blinkTimer: ReturnType<typeof setInterval>
  let lineTimer: ReturnType<typeof setTimeout>

  function showNext(idx: number) {
    if (idx >= lines.length) { done = true; return }
    displayed = [...displayed, lines[idx]]
    const delay = idx === 0 ? 800 : idx < 7 ? 18 : idx < 10 ? 400 : 200
    lineTimer = setTimeout(() => showNext(idx + 1), delay)
  }

  const held = new Set<string>()

  function onKeydown(e: KeyboardEvent) {
    held.add(e.key)
    if (held.has('Control') && held.has('l') && held.has('i')) {
      e.preventDefault()
      recover()
      return
    }
    if (!done) return
    if (e.key === 'Backspace') { typed = typed.slice(0, -1); return }
    if (e.key === 'Enter') { typed = ''; return }
    if (e.key.length === 1) typed += e.key
  }

  function onKeyup(e: KeyboardEvent) {
    held.delete(e.key)
  }

  function recover() {
    vfs.mkdir('/usr/wos')
    vfs.mkdir('/usr/wos/kernel')
    vfs.mkdir('/usr/wos/modules')
    vfs.writeFile('/usr/wos/system.elf', 'ELF x86_64 LSB executable\n[WOS System Core v1.0 - CRITICAL SYSTEM FILE]')
    vfs.writeFile('/usr/wos/kernel/wos.ko', '[WOS Kernel Module - Core]')
    vfs.writeFile('/usr/wos/modules/init.so', '[WOS Init Module]')
    restoreSystem()
  }

  onMount(() => {
    showNext(0)
    blinkTimer = setInterval(() => blink = !blink, 530)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('keyup', onKeyup)
  })

  onDestroy(() => {
    clearInterval(blinkTimer)
    clearTimeout(lineTimer)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('keyup', onKeyup)
  })
</script>

<div class="grub">
  <div class="screen">
    {#each displayed as line, i}
      {#if i < displayed.length - 1}
        <div class="line">{line}</div>
      {:else}
        <div class="line prompt">
          {line}{typed}<span class="cursor" class:vis={blink}>█</span>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .grub {
    position: fixed; inset: 0; z-index: 99999;
    background: #000;
    display: flex; align-items: flex-start; justify-content: flex-start;
    padding: 12px 16px;
    cursor: default;
    user-select: none;
  }

  .screen {
    font-family: 'Courier New', 'Lucida Console', monospace;
    font-size: 14px;
    line-height: 1.4;
    color: #d4d4d4;
    white-space: pre;
  }

  .line { min-height: 1.4em; }
  .prompt { color: #d4d4d4; }
  .cursor { color: #d4d4d4; }
  .cursor:not(.vis) { visibility: hidden; }
</style>
