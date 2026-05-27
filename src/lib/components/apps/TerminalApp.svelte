<script lang="ts">
  import { onMount, tick } from 'svelte'
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

  // ── Output helpers ────────────────────────────────────────────────
  type LineType = 'cmd' | 'out' | 'err' | 'info' | 'dir'
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

      default:
        return err(`${cmd}: command not found`)
    }
  }

  // ── Input ─────────────────────────────────────────────────────────
  async function submit() {
    const raw = input.trim()
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
      lines = [...lines, { type: 'cmd', text: `${promptDisplay} ${input}^C` }]
      input = ''
      histIdx = -1
      return
    }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); lines = [] }
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
