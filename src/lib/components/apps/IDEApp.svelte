<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { Play, Save, RotateCcw, ChevronDown, Terminal } from 'lucide-svelte'
  import { ripple } from '../../actions/ripple'
  import { vfs } from '../../stores/filesystem'
  import { windows } from '../../stores/windows'

  import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
  import { EditorState, Compartment } from '@codemirror/state'
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
  import { bracketMatching, foldGutter, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
  import { closeBrackets } from '@codemirror/autocomplete'
  import { oneDark } from '@codemirror/theme-one-dark'
  import { javascript } from '@codemirror/lang-javascript'
  import { python } from '@codemirror/lang-python'
  import { cpp } from '@codemirror/lang-cpp'
  import { java } from '@codemirror/lang-java'
  import { rust } from '@codemirror/lang-rust'
  import { go } from '@codemirror/lang-go'
  import { css } from '@codemirror/lang-css'
  import { json } from '@codemirror/lang-json'
  import { php } from '@codemirror/lang-php'

  export let windowId: string = ''

  // ── Language definitions ──────────────────────────────────
  interface Lang {
    id: string
    label: string
    wandbox?: string      // Wandbox compiler ID; absent = browser-side execution
    wandboxOpts?: string  // extra Wandbox compiler options
    ext: string
    ext2?: string
    support: () => any
    defaultCode: string
  }

  const LANGS: Lang[] = [
    {
      id: 'python', label: 'Python 3', wandbox: 'cpython-3.12.7', ext: 'py',
      support: python,
      defaultCode: 'print("Hello, World!")\n',
    },
    {
      id: 'javascript', label: 'JavaScript', ext: 'js',
      support: () => javascript({ jsx: false }),
      defaultCode: 'console.log("Hello, World!");\n',
    },
    {
      id: 'typescript', label: 'TypeScript', ext: 'ts',
      support: () => javascript({ typescript: true }),
      defaultCode: 'const greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet("World"));\n',
    },
    {
      id: 'cpp', label: 'C++', wandbox: 'gcc-head', wandboxOpts: 'warning,c++20', ext: 'cpp',
      support: cpp,
      defaultCode: '#include <iostream>\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
    },
    {
      id: 'c', label: 'C', wandbox: 'gcc-head', wandboxOpts: 'warning,-x c', ext: 'c',
      support: cpp,
      defaultCode: '#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
    },
    {
      id: 'java', label: 'Java', wandbox: 'openjdk-jdk-21+35', ext: 'java',
      support: java,
      defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
    },
    {
      id: 'rust', label: 'Rust', wandbox: 'rust-1.73.0', ext: 'rs',
      support: rust,
      defaultCode: 'fn main() {\n    println!("Hello, World!");\n}\n',
    },
    {
      id: 'go', label: 'Go', wandbox: 'go-1.21.5', ext: 'go',
      support: go,
      defaultCode: 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
    },
    {
      id: 'php', label: 'PHP', wandbox: 'php-8.3.2', ext: 'php',
      support: php,
      defaultCode: '<?php\necho "Hello, World!\\n";\n',
    },
    {
      id: 'css', label: 'CSS', ext: 'css',
      support: css,
      defaultCode: 'body {\n  background: #1a1a1a;\n  color: white;\n}\n',
    },
    {
      id: 'json', label: 'JSON', ext: 'json',
      support: json,
      defaultCode: '{\n  "message": "Hello, World!"\n}\n',
    },
    {
      id: 'bash', label: 'Bash', wandbox: 'bash', ext: 'sh',
      support: () => [],
      defaultCode: '#!/bin/bash\necho "Hello, World!"\n',
    },
    {
      id: 'ruby', label: 'Ruby', wandbox: 'ruby-3.3.0', ext: 'rb',
      support: () => [],
      defaultCode: 'puts "Hello, World!"\n',
    },
    {
      id: 'lua', label: 'Lua', wandbox: 'lua-5.3.6', ext: 'lua',
      support: () => [],
      defaultCode: 'print("Hello, World!")\n',
    },
    {
      id: 'csharp', label: 'C#', wandbox: 'mono-6.12.0.0', ext: 'cs',
      support: () => [],
      defaultCode: 'using System;\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}\n',
    },
  ]

  // ── VFS paths ─────────────────────────────────────────────
  const LANG_VFS_PATH: Record<string, string> = {
    python: '/Code/main.py', javascript: '/Code/main.js', typescript: '/Code/main.ts',
    cpp: '/Code/main.cpp', c: '/Code/main.c', java: '/Code/Main.java',
    rust: '/Code/main.rs', go: '/Code/main.go', php: '/Code/main.php',
    css: '/Code/style.css', json: '/Code/data.json',
    bash: '/Code/script.sh', ruby: '/Code/script.rb', lua: '/Code/script.lua',
    csharp: '/Code/Program.cs',
  }

  function vfsPath(langId: string): string {
    return LANG_VFS_PATH[langId] ?? `/Code/main.${LANGS.find(l => l.id === langId)?.ext ?? 'txt'}`
  }

  // ── State ─────────────────────────────────────────────────
  let selectedLangId = 'python'
  $: selectedLang = LANGS.find(l => l.id === selectedLangId)!

  let stdin = ''
  let output = ''
  let compileErr = ''
  let running = false
  let exitCode: number | null = null
  let saved = false

  // ── CodeMirror ────────────────────────────────────────────
  let editorEl: HTMLElement
  let view: EditorView
  const langCompartment = new Compartment()

  function buildExtensions(lang: Lang) {
    return [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      foldGutter(),
      bracketMatching(),
      closeBrackets(),
      oneDark,
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      langCompartment.of(lang.support()),
      EditorView.theme({
        '&': { height: '100%', fontSize: '13.5px' },
        '.cm-scroller': { fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace", overflow: 'auto' },
        '.cm-content': { padding: '8px 0' },
      }),
    ]
  }

  onMount(() => {
    const winState = get(windows).find(w => w.id === windowId)
    if (winState?.filePath) {
      const ext = winState.filePath.split('.').pop()?.toLowerCase() ?? ''
      const matched = LANGS.find(l => l.ext === ext || l.ext2 === ext)
      if (matched) selectedLangId = matched.id
    }

    const path = vfsPath(selectedLangId)
    const savedCode = vfs.exists(path) ? vfs.readFile(path) : selectedLang.defaultCode

    view = new EditorView({
      state: EditorState.create({
        doc: savedCode,
        extensions: buildExtensions(selectedLang),
      }),
      parent: editorEl,
    })
  })

  onDestroy(() => view?.destroy())

  function switchLang(id: string) {
    if (!view) return
    saveCode()
    selectedLangId = id
    const lang = LANGS.find(l => l.id === id)!
    const path = vfsPath(id)
    const restored = vfs.exists(path) ? vfs.readFile(path) : lang.defaultCode

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: restored },
      effects: langCompartment.reconfigure(lang.support()),
    })
  }

  function saveCode() {
    if (!view) return
    vfs.writeFile(vfsPath(selectedLangId), view.state.doc.toString())
    saved = true
    setTimeout(() => saved = false, 1500)
  }

  function resetCode() {
    if (!view) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: selectedLang.defaultCode } })
  }

  // ── Run ───────────────────────────────────────────────────
  const WANDBOX = 'https://wandbox.org/api/compile.json'

  function runBrowserJS(code: string, isTS: boolean) {
    const logs: string[] = []
    const _log = console.log, _err = console.error, _warn = console.warn
    console.log  = (...a: any[]) => { logs.push(a.map(String).join(' ')); _log(...a) }
    console.error = (...a: any[]) => { logs.push('[stderr] ' + a.map(String).join(' ')); _err(...a) }
    console.warn  = (...a: any[]) => { logs.push('[warn] '  + a.map(String).join(' ')); _warn(...a) }

    let evalCode = code
    if (isTS) {
      // Strip common TS-only syntax so the browser can eval it
      evalCode = code
        .replace(/:\s*[A-Z][A-Za-z<>\[\]|&, ]+(?=[,)=;\n])/g, '')
        .replace(/interface\s+\w+[^{]*\{[^}]*\}/gs, '')
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
        .replace(/<[A-Z]\w*>/g, '')
    }

    try {
      // eslint-disable-next-line no-eval
      eval(evalCode)
      output = logs.join('\n') || '(no output)'
      exitCode = 0
    } catch (e: any) {
      compileErr = e.toString()
      exitCode = 1
    } finally {
      console.log = _log; console.error = _err; console.warn = _warn
    }
    running = false
  }

  async function runCode() {
    if (running) return
    running = true
    output = ''
    compileErr = ''
    exitCode = null
    saveCode()

    const code = view?.state.doc.toString() ?? ''

    if (selectedLangId === 'javascript') { runBrowserJS(code, false); return }
    if (selectedLangId === 'typescript') { runBrowserJS(code, true);  return }

    if (selectedLangId === 'json') {
      try { JSON.parse(code); output = 'Valid JSON ✓'; exitCode = 0 }
      catch (e: any) { compileErr = e.message; exitCode = 1 }
      running = false
      return
    }

    if (selectedLangId === 'css') {
      output = 'you fucking idiot'
      exitCode = 0
      running = false
      return
    }

    if (!selectedLang.wandbox) {
      output = `${selectedLang.label} is not supported by the compiler.`
      exitCode = -1
      running = false
      return
    }

    try {
      const resp = await fetch(WANDBOX, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler: selectedLang.wandbox,
          code,
          options: selectedLang.wandboxOpts ?? '',
          stdin,
        }),
      })

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()

      if (data.compiler_error) {
        compileErr = data.compiler_error
        exitCode = 1
      } else {
        output = data.program_output ?? ''
        if (data.program_error) output += (output ? '\n' : '') + data.program_error
        exitCode = parseInt(data.status ?? '0', 10)
      }
    } catch (e: any) {
      output = `Could not reach Wandbox compiler API.\n\n${e.message}`
      exitCode = -1
    }

    running = false
  }

  // Ctrl+Enter to run
  function onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      runCode()
    }
  }

  let langDropOpen = false
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="ide" on:keydown={onKeydown}>
  <!-- Toolbar -->
  <div class="toolbar">
    <div class="lang-picker">
      <button
        class="lang-btn"
        on:click={() => langDropOpen = !langDropOpen}
        use:ripple
      >
        <span class="lang-dot" style="background:{getLangColor(selectedLangId)}"></span>
        {selectedLang.label}
        <ChevronDown size={13} />
      </button>

      {#if langDropOpen}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="lang-backdrop" on:click={() => langDropOpen = false}></div>
        <div class="lang-dropdown">
          {#each LANGS as lang}
            <button
              class="lang-opt"
              class:active={lang.id === selectedLangId}
              on:click={() => { switchLang(lang.id); langDropOpen = false }}
            >
              <span class="lang-dot" style="background:{getLangColor(lang.id)}"></span>
              {lang.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="toolbar-actions">
      <button class="tool-btn secondary" use:ripple on:click={resetCode} title="Reset to default">
        <RotateCcw size={14} />
      </button>
      <button class="tool-btn secondary" use:ripple on:click={saveCode} title="Save (Ctrl+S)">
        <Save size={14} />
        {saved ? 'Saved' : 'Save'}
      </button>
      <button class="tool-btn run" use:ripple on:click={runCode} disabled={running} title="Run (Ctrl+Enter)">
        <Play size={15} fill="currentColor" />
        {running ? 'Running…' : 'Run'}
      </button>
    </div>
  </div>

  <!-- Split pane -->
  <div class="split">
    <!-- Editor -->
    <div class="editor-pane" bind:this={editorEl}></div>

    <!-- Output -->
    <div class="output-pane">
      <div class="output-header">
        <Terminal size={13} />
        <span>Output</span>
        {#if exitCode !== null}
          <span class="exit-badge" class:exit-ok={exitCode === 0} class:exit-err={exitCode !== 0}>
            exit {exitCode}
          </span>
        {/if}
        {#if output || compileErr}
          <button class="clear-btn" on:click={() => { output = ''; compileErr = ''; exitCode = null }}>clear</button>
        {/if}
      </div>

      <div class="output-scroll">
        {#if running}
          <span class="running-indicator">⠋ Running…</span>
        {:else if compileErr}
          <pre class="output-text compile-err">{compileErr}</pre>
        {:else if output}
          <pre class="output-text">{output}</pre>
        {:else}
          <span class="output-placeholder">Press <kbd>Ctrl+Enter</kbd> or click Run</span>
        {/if}
      </div>

      <!-- stdin -->
      <div class="stdin-area">
        <label class="stdin-label" for="stdin-input">stdin</label>
        <textarea
          id="stdin-input"
          bind:value={stdin}
          placeholder="Input for your program (optional)..."
          rows="3"
          spellcheck="false"
        ></textarea>
      </div>
    </div>
  </div>
</div>

<script context="module" lang="ts">
  function getLangColor(id: string): string {
    const colors: Record<string, string> = {
      python: '#3572A5',
      javascript: '#f1e05a',
      typescript: '#3178c6',
      cpp: '#f34b7d',
      c: '#555555',
      java: '#b07219',
      rust: '#dea584',
      go: '#00ADD8',
      php: '#4F5D95',
      html: '#e34c26',
      css: '#563d7c',
      json: '#292929',
      bash: '#89e051',
      ruby: '#701516',
      lua: '#000080',
      csharp: '#178600',
    }
    return colors[id] ?? '#aaa'
  }
</script>

<style>
  .ide {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1e1e1e;
    overflow: hidden;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    background: #2d2d2d;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }

  .lang-picker { position: relative; }

  .lang-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 10px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    color: #d4d4d4;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.1s;
  }

  .lang-btn:hover { background: rgba(255,255,255,0.12); }

  .lang-dot {
    width: 9px; height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .lang-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
  }

  .lang-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 51;
    background: #252526;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 4px;
    min-width: 160px;
    max-height: 280px;
    overflow-y: auto;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }

  .lang-opt {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 10px;
    background: transparent;
    border: none;
    color: #ccc;
    font-size: 13px;
    font-family: inherit;
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.1s;
  }

  .lang-opt:hover { background: rgba(255,255,255,0.08); }
  .lang-opt.active { background: rgba(53,132,228,0.2); color: #fff; }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.1s, transform 0.08s;
  }

  .tool-btn:active { transform: scale(0.95); }

  .secondary {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    color: #ccc;
  }

  .secondary:hover { background: rgba(255,255,255,0.12); color: #fff; }

  .run {
    background: #28a745;
    color: #fff;
  }

  .run:hover { background: #218838; }
  .run:disabled { opacity: 0.55; cursor: default; }

  /* ── Split pane ── */
  .split {
    display: grid;
    grid-template-columns: 3fr 2fr;
    flex: 1;
    overflow: hidden;
  }

  /* ── Editor ── */
  .editor-pane {
    height: 100%;
    overflow: hidden;
    border-right: 1px solid rgba(255,255,255,0.06);
  }

  :global(.editor-pane .cm-editor) {
    height: 100%;
  }

  :global(.editor-pane .cm-editor.cm-focused) {
    outline: none;
  }

  /* ── Output pane ── */
  .output-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: #1a1a1a;
  }

  .output-header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px;
    background: #252526;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .exit-badge {
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
  }

  .exit-ok  { background: rgba(40,167,69,0.2);  color: #28a745; }
  .exit-err { background: rgba(220,53,69,0.2);   color: #dc3545; }

  .clear-btn {
    margin-left: auto;
    border: none; background: transparent;
    color: rgba(255,255,255,0.3);
    font-size: 11px; cursor: pointer;
    text-transform: none; letter-spacing: 0;
    transition: color 0.1s;
  }

  .clear-btn:hover { color: rgba(255,255,255,0.7); }

  .output-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 10px 12px;
  }

  .output-text {
    font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    font-size: 12.5px;
    color: #d4d4d4;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.55;
    margin: 0;
  }

  .compile-err { color: #f14c4c; }

  .output-placeholder {
    font-size: 12px;
    color: rgba(255,255,255,0.2);
    font-style: italic;
  }

  .running-indicator {
    font-family: monospace;
    font-size: 12px;
    color: #4ec9b0;
    animation: blink 0.9s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

  kbd {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 11px;
    font-family: monospace;
  }

  /* ── stdin ── */
  .stdin-area {
    flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 8px 12px;
  }

  .stdin-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255,255,255,0.3);
    display: block;
    margin-bottom: 5px;
  }

  .stdin-area textarea {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 5px;
    padding: 6px 8px;
    color: #ccc;
    font-size: 12px;
    font-family: 'Fira Code', monospace;
    outline: none;
    resize: none;
    transition: border-color 0.15s;
  }

  .stdin-area textarea:focus {
    border-color: rgba(53,132,228,0.5);
  }
</style>
