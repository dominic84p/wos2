<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'
  import { windows } from '../../stores/windows'
  import type { AppId } from '../../types'

  export let windowId: string

  // ── Virtual filesystem ────────────────────────────────────────────
  const FS_KEY = 'wos-vfs'
  type FSNode = { [k: string]: FSNode | string }

  function defaultFS(): FSNode {
    return {
      home: {
        user: {
          'welcome.txt': 'Welcome to WOS Terminal!\nType "help" for commands.\nType "ls" to list files, "cd <dir>" to navigate.',
        }
      },
      code: {},
      games: { 'readme.txt': 'Run "open games" to browse the games folder.' },
      desktop: {},
    }
  }

  function loadFS(): FSNode {
    try { return JSON.parse(localStorage.getItem(FS_KEY) ?? 'null') ?? defaultFS() }
    catch { return defaultFS() }
  }
  function saveFS() { localStorage.setItem(FS_KEY, JSON.stringify(fs)) }

  let fs = loadFS()
  let cwd = '/home/user'

  // ── Case-insensitive path resolution ──────────────────────────────
  function lookupKey(dir: FSNode, key: string): string | null {
    if (key in dir) return key
    const lower = key.toLowerCase()
    for (const k of Object.keys(dir)) {
      if (k.toLowerCase() === lower) return k
    }
    return null
  }

  function normPath(p: string): string {
    if (!p || p === '~') return '/home/user'
    let abs = p.startsWith('/') ? p : `${cwd}/${p}`
    const parts = abs.split('/').filter(Boolean)
    const out: string[] = []
    for (const seg of parts) {
      if (seg === '..') out.pop()
      else if (seg !== '.') out.push(seg)
    }
    return '/' + out.join('/')
  }

  // Returns the node AND the actual correctly-cased path
  function resolveNode(path: string): { node: FSNode | string; actualPath: string } | null {
    const parts = normPath(path).split('/').filter(Boolean)
    let cur: FSNode | string = fs
    const actual: string[] = []
    for (const p of parts) {
      if (typeof cur === 'string') return null
      const key = lookupKey(cur as FSNode, p)
      if (key === null) return null
      actual.push(key)
      cur = (cur as FSNode)[key]
    }
    return { node: cur, actualPath: '/' + actual.join('/') }
  }

  function getNode(path: string): FSNode | string | null {
    return resolveNode(path)?.node ?? null
  }

  function setNode(path: string, value: FSNode | string): boolean {
    const parts = normPath(path).split('/').filter(Boolean)
    if (parts.length === 0) return false
    let cur: FSNode = fs
    for (let i = 0; i < parts.length - 1; i++) {
      const key = lookupKey(cur, parts[i]) ?? parts[i]
      if (typeof cur[key] === 'string') return false
      if (!cur[key]) cur[key] = {}
      cur = cur[key] as FSNode
    }
    cur[parts[parts.length - 1]] = value
    fs = { ...fs }
    saveFS()
    return true
  }

  function removeNode(path: string) {
    const res = resolveNode(path)
    if (!res) return
    const parts = res.actualPath.split('/').filter(Boolean)
    if (parts.length === 0) return
    let cur: FSNode = fs
    for (let i = 0; i < parts.length - 1; i++) {
      const key = lookupKey(cur, parts[i])
      if (!key || typeof cur[key] === 'string') return
      cur = cur[key] as FSNode
    }
    delete cur[parts[parts.length - 1]]
    fs = { ...fs }
    saveFS()
  }

  // ── App map ───────────────────────────────────────────────────────
  const APP_MAP: Record<string, { appId: AppId; title: string }> = {
    browser:     { appId: 'browser',     title: 'Browser' },
    music:       { appId: 'music',       title: 'Music' },
    settings:    { appId: 'settings',    title: 'Settings' },
    vscode:      { appId: 'vscode',      title: 'VS Code' },
    notepad:     { appId: 'notepad',     title: 'Notepad' },
    paint:       { appId: 'paint',       title: 'Paint' },
    files:       { appId: 'files',       title: 'Files' },
    discover:    { appId: 'discover',    title: 'App Store' },
    eaglercraft: { appId: 'eaglercraft', title: 'EaglerCraft' },
    games:       { appId: 'gamesfolder', title: 'Homework' },
    homework:    { appId: 'gamesfolder', title: 'Homework' },
  }

  // ── Animation & Stream Handlers ───────────────────────────────────
  let activeInterval: ReturnType<typeof setInterval> | null = null
  let activeTimeouts: ReturnType<typeof setTimeout>[] = []

  function stopActiveAnimation() {
    if (activeInterval) {
      clearInterval(activeInterval)
      activeInterval = null
    }
    for (const t of activeTimeouts) {
      clearTimeout(t)
    }
    activeTimeouts = []
  }

  onDestroy(() => {
    stopActiveAnimation()
  })

  // ── Output helpers ────────────────────────────────────────────────
  type LineType = 'cmd' | 'out' | 'err' | 'info' | 'dir' | 'hack' | 'larp'
  interface Line { type: LineType; text: string }

  function out(texts: string[]): Line[] { return texts.map(text => ({ type: 'out' as LineType, text })) }
  function err(msg: string): Line[]     { return [{ type: 'err',  text: msg }] }
  function info(msg: string): Line[]    { return [{ type: 'info', text: msg }] }
  function dir(name: string): Line      { return { type: 'dir', text: name } }

  let lines: Line[] = [
    { type: 'info', text: '╔══════════════════════════╗' },
    { type: 'info', text: '║   WOS Terminal  v1.0     ║' },
    { type: 'info', text: '╚══════════════════════════╝' },
    { type: 'out',  text: 'Type "help" for commands.' },
    { type: 'out',  text: '' },
  ]

  let input = ''
  let cmdHistory: string[] = []
  let histIdx = -1
  let inputEl: HTMLInputElement
  let scrollEl: HTMLDivElement

  $: promptDisplay = `user@wos:${cwd}$`

  // ── Fake Hacking & LARP Stream Logic ─────────────────────────────
  function startHackSequence(target: string) {
    stopActiveAnimation()
    const ip = `${Math.floor(Math.random() * 150 + 50)}.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 250 + 1)}`
    
    const steps = [
      // Phase 1: Reconnaissance
      { text: `[!] Initializing QuantumExploit Framework v4.2.0-release...`, delay: 80, type: 'info' as LineType },
      { text: `[*] Target host acquired: '${target}' [IP: ${ip}]`, delay: 300, type: 'out' as LineType },
      { text: `[*] Initiating SYN stealth scan on 65535 ports...`, delay: 600, type: 'out' as LineType },
      { text: `[DEBUG] Packet sent to ${target}:80 (SYN)  -> Received (SYN/ACK)`, delay: 850, type: 'out' as LineType },
      { text: `[DEBUG] Packet sent to ${target}:443 (SYN) -> Received (SYN/ACK)`, delay: 1000, type: 'out' as LineType },
      { text: `[DEBUG] Packet sent to ${target}:22 (SYN)  -> Received (SYN/ACK)`, delay: 1150, type: 'out' as LineType },
      { text: `[DEBUG] Packet sent to ${target}:8080 (SYN)-> Received (SYN/ACK)`, delay: 1300, type: 'out' as LineType },
      { text: `[+] Port 22/tcp   OPEN   OpenSSH 8.9p1 Ubuntu`, delay: 1500, type: 'dir' as LineType },
      { text: `[+] Port 80/tcp   OPEN   nginx/1.18.0 (reverse proxy)`, delay: 1650, type: 'dir' as LineType },
      { text: `[+] Port 443/tcp  OPEN   nginx/1.18.0 (TLS v1.3)`, delay: 1800, type: 'dir' as LineType },
      { text: `[+] Port 8080/tcp OPEN   Apache Tomcat 9.0.50 (VULNERABLE)`, delay: 1950, type: 'dir' as LineType },

      // Phase 2: Vulnerability Analysis
      { text: `[*] Probing Apache Tomcat on ${target}:8080 for CVE-2024-9102...`, delay: 2300, type: 'info' as LineType },
      { text: `[!] VULNERABILITY DETECTED: Unauthenticated deserialization leak!`, delay: 2700, type: 'err' as LineType },
      { text: `[*] Generating x86_64 ROP chain (Return-Oriented Programming)...`, delay: 3100, type: 'hack' as LineType },
      { text: `[DEBUG] Gadget #1: 0x00000000004011d3 : pop rdi ; ret`, delay: 3350, type: 'out' as LineType },
      { text: `[DEBUG] Gadget #2: 0x00000000004011d4 : pop rsi ; pop r15 ; ret`, delay: 3550, type: 'out' as LineType },
      { text: `[DEBUG] Gadget #3: 0x00000000004011d7 : syscall`, delay: 3750, type: 'out' as LineType },
      { text: `[+] Assembling payload buffer (size: 1024 bytes)...`, delay: 4000, type: 'hack' as LineType },

      // Phase 3: Exploitation & Memory Override
      { text: `[+] Transmitting exploit payload to ${target}:8080/api/v1/session...`, delay: 4400, type: 'hack' as LineType },
      { text: `[DEBUG] Raw Payload: \\x7fELF\\x02\\x01\\x01\\x00\\x3e\\x00\\x01\\x00...`, delay: 4650, type: 'out' as LineType },
      { text: `[*] Overwriting target instruction pointer [RIP] @ 0x7FFF88F02000...`, delay: 4950, type: 'hack' as LineType },
      { text: `[+] ASLR bypass verified! Kernel base address at 0xffffffff81000000`, delay: 5250, type: 'hack' as LineType },
      { text: `[+] Disabling SELinux & AppArmor enforcement policies...`, delay: 5600, type: 'hack' as LineType },

      // Phase 4: Hash Cracking & Root Escalation
      { text: `[*] Dumping /etc/shadow password hashes from memory pool...`, delay: 6000, type: 'info' as LineType },
      { text: `[DEBUG] Hash: root:$6$qx9K$3bZ7h901x...:19120:0:99999:7::`, delay: 6250, type: 'out' as LineType },
      { text: `[*] Brute-forcing root hash via CUDA GPU Cluster...`, delay: 6550, type: 'hack' as LineType },
      { text: `[HASH] 12,500,000 hashes/sec [Dictionary Progress: 34%] ...`, delay: 6800, type: 'out' as LineType },
      { text: `[HASH] 28,900,000 hashes/sec [Dictionary Progress: 89%] ...`, delay: 7050, type: 'out' as LineType },
      { text: `[✓] PASSWORD FOUND: 'P@ssw0rd2026!'`, delay: 7350, type: 'hack' as LineType },
      { text: `[+] Escalating privileges: uid=1000(guest) -> uid=0(root)`, delay: 7700, type: 'hack' as LineType },

      // Phase 5: Shell & Clean-up
      { text: `[✓] SUCCESS: Connected to remote root shell on '${target}'!`, delay: 8100, type: 'hack' as LineType },
      { text: `[✓] Scrubbing /var/log/auth.log and clearing wtmp entries... DONE`, delay: 8500, type: 'cmd' as LineType },
      { text: `[✓] Systemd backdoor persistence established at /etc/systemd/system/wosd.service`, delay: 8900, type: 'cmd' as LineType },
      { text: `[!] Host '${target}' is now fully compromised. Root access unlocked.`, delay: 9300, type: 'info' as LineType },
    ]

    for (const step of steps) {
      const timer = setTimeout(() => {
        lines = [...lines, { type: step.type, text: step.text }]
        tick().then(() => scrollEl?.scrollTo({ top: scrollEl.scrollHeight }))
      }, step.delay)
      activeTimeouts.push(timer)
    }
  }

  function generateLarpLine(): string {
    const hex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
    const modules = ['kernel', 'crypto', 'mmu', 'network', 'vfs', 'compiler', 'gpu', 'syscall', 'quantum']
    const files = ['vm.cpp', 'matrix.rs', 'buffer.c', 'cipher.go', 'vector.asm', 'allocator.h']
    
    const templates = [
      () => `0x7FF${hex(5).toUpperCase()}  ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)} ${hex(2)}  |${hex(4)}.${hex(4)}|`,
      () => `[BUILD] src/${modules[randInt(0, modules.length - 1)]}/${files[randInt(0, files.length - 1)]} -> compile step ${randInt(10, 99)}% ... DONE (${randInt(2, 45)}ms)`,
      () => `[NET] TX 192.168.${randInt(1, 254)}.${randInt(1, 254)}:443 -> 10.0.${randInt(0, 255)}.${randInt(1, 254)} [SEQ=${randInt(10000, 99999)} ACK=${randInt(100000, 999999)}]`,
      () => `[MMU] Allocating page block frame at 0x${hex(8).toUpperCase()} ... [OK]`,
      () => `[HASH] calc SHA-512 (${hex(16)}...) -> diff 0.000${randInt(100, 999)}`,
      () => `>>> INJECTING SHADOW STACK OVERFLOW INTO SUBROUTINE 0x${hex(4).toUpperCase()}`,
      () => `[SYS] syscall_${randInt(1, 300)}(0x${hex(4)}, 0x${hex(4)}) returns 0x0 [STATUS_SUCCESS]`,
      () => `[QUANTUM] Decrypting node lattice block #${randInt(1000, 9999)} ... OK`,
    ]
    const idx = randInt(0, templates.length - 1)
    return templates[idx]()
  }

  function startLarpStream() {
    stopActiveAnimation()
    lines = [...lines, { type: 'info', text: '>>> STARTING RAPID CODE & SYSTEM LOG STREAM (Press Ctrl+C to stop) <<<' }]
    activeInterval = setInterval(() => {
      const newLines: Line[] = []
      const count = Math.floor(Math.random() * 2) + 2
      for (let i = 0; i < count; i++) {
        newLines.push({ type: 'larp', text: generateLarpLine() })
      }
      lines = [...lines, ...newLines]
      if (lines.length > 500) {
        lines = lines.slice(-400)
      }
      scrollEl?.scrollTo({ top: scrollEl.scrollHeight })
    }, 40)
  }

  // ── Commands ──────────────────────────────────────────────────────
  function run(raw: string): Line[] {
    const [cmd, ...args] = raw.trim().split(/\s+/)
    if (!cmd) return []

    switch (cmd) {
      case 'help':
        return out([
          'Commands:',
          '  ls [path]           list directory (dirs shown in cyan)',
          '  cd <path>           change directory  (~ = home)',
          '  pwd                 print working directory',
          '  mkdir <name>        create directory',
          '  touch <name>        create file',
          '  rm <name>           remove file or empty dir',
          '  cat <file>          read file',
          '  echo <text>         print text',
          '  echo <text> > <f>   write to file',
          '  clear  /  Ctrl+L    clear screen',
          '  open <app>          open a WOS app',
          '  open <file.html>    preview HTML in browser',
          '  hack <target>       simulate Hollywood hacking sequence',
          '  larp                infinite rapid cyber code stream (Ctrl+C to stop)',
          '',
          'Apps: browser, music, vscode, notepad, paint,',
          '      files, discover, eaglercraft, games',
          '',
          'Example workflow:',
          '  cd code',
          '  touch myapp.html',
          '  echo <h1>Hello</h1> > myapp.html',
          '  open myapp.html',
        ])

      case 'pwd':
        return out([cwd])

      case 'ls': {
        const target = args[0] ? normPath(args[0]) : cwd
        const res = resolveNode(target)
        if (!res) return err(`ls: ${args[0] ?? cwd}: No such file or directory`)
        if (typeof res.node === 'string') return out([target.split('/').pop() ?? target])

        const entries = Object.entries(res.node as FSNode)
        if (entries.length === 0) return out(['(empty)'])

        const dirs  = entries.filter(([, v]) => typeof v !== 'string')
        const files = entries.filter(([, v]) => typeof v === 'string')
        const result: Line[] = []
        for (const [k] of dirs)  result.push(dir(k + '/'))
        for (const [k] of files) result.push({ type: 'out', text: k })
        return result
      }

      case 'cd': {
        const target = normPath(args[0] ?? '~')
        const res = resolveNode(target)
        if (!res) return err(`cd: ${args[0]}: No such file or directory`)
        if (typeof res.node === 'string') return err(`cd: ${args[0]}: Not a directory`)
        cwd = res.actualPath || '/'
        return []
      }

      case 'mkdir': {
        if (!args[0]) return err('mkdir: missing operand')
        const target = normPath(args[0])
        if (getNode(target) !== null) return err(`mkdir: '${args[0]}': Already exists`)
        if (!setNode(target, {})) return err(`mkdir: '${args[0]}': No such parent directory`)
        return []
      }

      case 'touch': {
        if (!args[0]) return err('touch: missing operand')
        const target = normPath(args[0])
        if (getNode(target) === null) {
          if (!setNode(target, '')) return err(`touch: cannot create '${args[0]}'`)
        }
        return []
      }

      case 'rm': {
        if (!args[0]) return err('rm: missing operand')
        const res = resolveNode(normPath(args[0]))
        if (!res) return err(`rm: '${args[0]}': No such file or directory`)
        if (typeof res.node !== 'string' && Object.keys(res.node).length > 0)
          return err(`rm: '${args[0]}': Directory not empty`)
        removeNode(normPath(args[0]))
        return []
      }

      case 'cat': {
        if (!args[0]) return err('cat: missing operand')
        const node = getNode(normPath(args[0]))
        if (node === null) return err(`cat: ${args[0]}: No such file or directory`)
        if (typeof node !== 'string') return err(`cat: ${args[0]}: Is a directory`)
        return out(node ? node.split('\n') : ['(empty)'])
      }

      case 'echo': {
        const gtIdx = args.indexOf('>')
        if (gtIdx !== -1) {
          const text = args.slice(0, gtIdx).join(' ')
          const file = args[gtIdx + 1]
          if (!file) return err('echo: missing filename after >')
          setNode(normPath(file), text)
          return []
        }
        return out([args.join(' ')])
      }

      case 'clear':
        stopActiveAnimation()
        lines = []
        return []

      case 'open': {
        if (!args[0]) return err('open: missing argument')
        const name = args[0].toLowerCase()
        const app = APP_MAP[name]
        if (app) {
          windows.open(app.appId, app.title)
          return info(`Opening ${app.title}…`)
        }
        // Check for file in current dir
        const filePath = normPath(args[0])
        const node = getNode(filePath)
        if (node !== null && typeof node === 'string') {
          if (args[0].endsWith('.html')) {
            const blob = new Blob([node], { type: 'text/html' })
            windows.open('browser', args[0], { initialPath: URL.createObjectURL(blob) })
            return info(`Opening ${args[0]} in browser…`)
          }
          return err(`open: '${args[0]}': Use 'cat' to read text files`)
        }
        return err(`open: '${name}': No such app or file`)
      }

      case 'hack': {
        const target = args.join(' ').trim() || 'mainframe'
        startHackSequence(target)
        return []
      }

      case 'larp': {
        startLarpStream()
        return []
      }

      default:
        return err(`${cmd}: command not found`)
    }
  }

  // ── Input ─────────────────────────────────────────────────────────
  async function submit() {
    const raw = input.trim()
    stopActiveAnimation()
    lines = [...lines, { type: 'cmd', text: `${promptDisplay} ${raw}` }]
    if (raw) {
      cmdHistory = [raw, ...cmdHistory.slice(0, 99)]
      lines = [...lines, ...run(raw)]
    }
    histIdx = -1
    input = ''
    await tick()
    scrollEl?.scrollTo({ top: scrollEl.scrollHeight })
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); return }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (histIdx < cmdHistory.length - 1) { histIdx++; input = cmdHistory[histIdx] }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx > 0) { histIdx--; input = cmdHistory[histIdx] }
      else { histIdx = -1; input = '' }
      return
    }
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault()
      stopActiveAnimation()
      lines = [...lines, { type: 'cmd', text: `${promptDisplay} ${input}^C` }]
      input = ''
      histIdx = -1
      return
    }
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault()
      stopActiveAnimation()
      lines = []
    }
  }

  onMount(() => inputEl?.focus())
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="terminal" bind:this={scrollEl} on:click={() => inputEl?.focus()}>
  {#each lines as line, i (i)}
    <div class="line {line.type}">{line.text}</div>
  {/each}

  <div class="input-row">
    <span class="prompt">{promptDisplay}</span>
    <input
      bind:this={inputEl}
      bind:value={input}
      on:keydown={onKeydown}
      autocomplete="off"
      spellcheck={false}
      class="term-input"
    />
  </div>
</div>

<style>
  .terminal {
    width: 100%;
    height: 100%;
    background: var(--term-bg, #0c0c0c);
    font-family: 'Courier New', 'Lucida Console', monospace;
    font-size: 13px;
    line-height: 1.55;
    color: var(--term-out, #d4d4d4);
    padding: 12px 16px;
    overflow-y: auto;
    cursor: text;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  .line {
    white-space: pre-wrap;
    word-break: break-all;
    min-height: 1.55em;
  }

  /* dirs get cyan/teal, files get normal, errors red, cmds green, info blue */
  .line.cmd  { color: var(--term-cmd,    #88d498); }
  .line.err  { color: var(--term-err,    #f48771); }
  .line.out  { color: var(--term-out,    #d4d4d4); }
  .line.info { color: var(--term-info,   #569cd6); }
  .line.dir  { color: var(--term-dir,    #4ec9b0); font-weight: 600; }
  .line.hack { color: #00ff66; font-weight: 600; }
  .line.larp { color: #40c4ff; }

  .input-row {
    display: flex;
    align-items: center;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .prompt {
    color: var(--term-prompt, #88d498);
    white-space: nowrap;
    margin-right: 6px;
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
  }

  .term-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--term-out, #d4d4d4);
    font: inherit;
    caret-color: var(--term-cmd, #88d498);
    user-select: text;
    -webkit-user-select: text;
    padding: 0;
    min-width: 0;
  }
</style>
