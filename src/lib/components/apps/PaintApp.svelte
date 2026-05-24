<script lang="ts">
  import { onMount } from 'svelte'
  import { Pencil, Eraser, Minus, Square, Circle, Droplet, Crosshair, Download, Undo2, Redo2, RotateCcw } from 'lucide-svelte'

  export let windowId: string = ''

  type Tool = 'pencil' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'fill' | 'picker'

  let tool: Tool = 'pencil'
  let color = '#000000'
  let brushSize = 3
  let filled = false
  let openMenu: string | null = null

  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  const W = 800, H = 600

  let drawing = false
  let lastX = 0, lastY = 0, startX = 0, startY = 0
  let savedImg: ImageData | null = null

  let undoStack: ImageData[] = []
  let redoStack: ImageData[] = []

  const PALETTE = [
    '#000000','#404040','#808080','#c0c0c0','#ffffff','#800000',
    '#c00000','#ff0000','#ff8040','#ff8000','#ffc000','#ffff00',
    '#80ff00','#00c000','#008000','#004000','#00ffff','#0080ff',
    '#0000ff','#000080','#8000ff','#ff00ff','#ff0080','#800040',
    '#804000','#ff80c0','#ffdfbf','#ffffbf',
  ]

  const SIZES = [1, 2, 4, 8, 16]

  onMount(() => {
    ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
  })

  function getPos(e: MouseEvent) {
    const r = canvas.getBoundingClientRect()
    return {
      x: Math.round((e.clientX - r.left) * (W / r.width)),
      y: Math.round((e.clientY - r.top)  * (H / r.height)),
    }
  }

  function saveUndo() {
    undoStack = [...undoStack.slice(-19), ctx.getImageData(0, 0, W, H)]
    redoStack = []
  }

  function undo() {
    if (!undoStack.length) return
    redoStack = [...redoStack, ctx.getImageData(0, 0, W, H)]
    ctx.putImageData(undoStack[undoStack.length - 1], 0, 0)
    undoStack = undoStack.slice(0, -1)
  }

  function redo() {
    if (!redoStack.length) return
    undoStack = [...undoStack, ctx.getImageData(0, 0, W, H)]
    ctx.putImageData(redoStack[redoStack.length - 1], 0, 0)
    redoStack = redoStack.slice(0, -1)
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0 && e.button !== 2) return
    e.preventDefault()
    const {x, y} = getPos(e)
    const c = e.button === 2 ? '#ffffff' : color
    saveUndo()
    drawing = true
    lastX = x; lastY = y; startX = x; startY = y

    if (tool === 'fill') {
      floodFill(x, y, c); drawing = false
    } else if (tool === 'picker') {
      const d = ctx.getImageData(x, y, 1, 1).data
      color = '#' + [d[0],d[1],d[2]].map(v => v.toString(16).padStart(2,'0')).join('')
      tool = 'pencil'; drawing = false
    } else if (tool === 'line' || tool === 'rect' || tool === 'ellipse') {
      savedImg = ctx.getImageData(0, 0, W, H)
    } else {
      dot(x, y, c)
    }
  }

  function dot(x: number, y: number, c: string) {
    ctx.beginPath()
    ctx.arc(x, y, Math.max(brushSize / 2, 0.5), 0, Math.PI * 2)
    ctx.fillStyle = c
    ctx.fill()
  }

  function onMouseMove(e: MouseEvent) {
    if (!drawing) return
    const {x, y} = getPos(e)
    const c = (e.buttons & 2) ? '#ffffff' : color

    if (tool === 'pencil' || tool === 'eraser') {
      ctx.beginPath()
      ctx.moveTo(lastX, lastY)
      ctx.lineTo(x, y)
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : c
      ctx.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      lastX = x; lastY = y
    } else if (savedImg) {
      ctx.putImageData(savedImg, 0, 0)
      drawShape(startX, startY, x, y, c)
    }
  }

  function onMouseUp(e: MouseEvent) {
    if (!drawing) return
    const {x, y} = getPos(e)
    if (savedImg) {
      ctx.putImageData(savedImg, 0, 0)
      drawShape(startX, startY, x, y, color)
      savedImg = null
    }
    drawing = false
  }

  function drawShape(x1: number, y1: number, x2: number, y2: number, c: string) {
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = brushSize
    ctx.lineJoin = 'miter'
    if (tool === 'line') {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    } else if (tool === 'rect') {
      if (filled) ctx.fillRect(x1, y1, x2-x1, y2-y1)
      else ctx.strokeRect(x1, y1, x2-x1, y2-y1)
    } else if (tool === 'ellipse') {
      if (Math.abs(x2-x1) < 1 || Math.abs(y2-y1) < 1) return
      ctx.beginPath()
      ctx.ellipse((x1+x2)/2,(y1+y2)/2,Math.abs(x2-x1)/2,Math.abs(y2-y1)/2,0,0,Math.PI*2)
      if (filled) ctx.fill(); else ctx.stroke()
    }
  }

  function floodFill(sx: number, sy: number, fc: string) {
    const img = ctx.getImageData(0, 0, W, H)
    const d = img.data
    const si = (sy * W + sx) * 4
    const tr = d[si], tg = d[si+1], tb = d[si+2], ta = d[si+3]
    const fv = parseInt(fc.replace('#',''), 16)
    const fr = (fv >> 16) & 255, fg = (fv >> 8) & 255, fb = fv & 255
    if (tr === fr && tg === fg && tb === fb) return
    const stk: number[] = [sx, sy]
    const vis = new Uint8Array(W * H)
    while (stk.length) {
      const y = stk.pop()!, x = stk.pop()!
      if (x < 0 || x >= W || y < 0 || y >= H) continue
      if (vis[y*W+x]) continue
      const i = (y*W+x)*4
      if (d[i]!==tr||d[i+1]!==tg||d[i+2]!==tb||d[i+3]!==ta) continue
      vis[y*W+x]=1; d[i]=fr; d[i+1]=fg; d[i+2]=fb; d[i+3]=255
      stk.push(x+1,y,x-1,y,x,y+1,x,y-1)
    }
    ctx.putImageData(img, 0, 0)
  }

  function newCanvas() {
    if (!confirm('Clear canvas?')) return
    saveUndo(); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H)
    openMenu = null
  }

  function download() {
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'canvas.png'; a.click()
    openMenu = null
  }

  const TOOLS: { id: Tool; label: string }[] = [
    { id: 'pencil',  label: 'Pencil (P)'  },
    { id: 'eraser',  label: 'Eraser (E)'  },
    { id: 'fill',    label: 'Fill (F)'    },
    { id: 'picker',  label: 'Picker (K)'  },
    { id: 'line',    label: 'Line (L)'    },
    { id: 'rect',    label: 'Rectangle (R)'},
    { id: 'ellipse', label: 'Ellipse (O)' },
  ]

  function onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (e.ctrlKey && e.key === 'z') { undo(); return }
    if (e.ctrlKey && e.key === 'y') { redo(); return }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); download(); return }
    const map: Record<string, Tool> = {p:'pencil',e:'eraser',f:'fill',k:'picker',l:'line',r:'rect',o:'ellipse'}
    if (map[e.key.toLowerCase()]) tool = map[e.key.toLowerCase()]
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="paint" on:click={() => openMenu=null} on:keydown={onKey} tabindex="-1">

  <div class="menubar" on:click|stopPropagation>
    <div class="mw">
      <button class="mb" class:active={openMenu==='file'} on:click={() => openMenu=openMenu==='file'?null:'file'}>File</button>
      {#if openMenu === 'file'}
        <div class="drop">
          <button class="di" on:click={newCanvas}>New</button>
          <div class="ds"></div>
          <button class="di" on:click={download}>Save as PNG<span class="sc">Ctrl+S</span></button>
        </div>
      {/if}
    </div>
    <div class="mw">
      <button class="mb" class:active={openMenu==='edit'} on:click={() => openMenu=openMenu==='edit'?null:'edit'}>Edit</button>
      {#if openMenu === 'edit'}
        <div class="drop">
          <button class="di" on:click={() => { undo(); openMenu=null }} class:dimmed={!undoStack.length}>Undo<span class="sc">Ctrl+Z</span></button>
          <button class="di" on:click={() => { redo(); openMenu=null }} class:dimmed={!redoStack.length}>Redo<span class="sc">Ctrl+Y</span></button>
          <div class="ds"></div>
          <button class="di" on:click={newCanvas}>Clear Canvas</button>
        </div>
      {/if}
    </div>
  </div>

  <div class="workspace">
    <div class="toolpanel">
      <div class="tool-group">
        {#each TOOLS as t}
          <button class="tbtn" class:sel={tool===t.id} title={t.label} on:click={() => tool=t.id}>
            {#if t.id==='pencil'}<Pencil size={16} />
            {:else if t.id==='eraser'}<Eraser size={16} />
            {:else if t.id==='line'}<Minus size={16} />
            {:else if t.id==='rect'}<Square size={16} />
            {:else if t.id==='ellipse'}<Circle size={16} />
            {:else if t.id==='fill'}<Droplet size={16} />
            {:else if t.id==='picker'}<Crosshair size={16} />
            {/if}
          </button>
        {/each}
      </div>

      {#if tool === 'rect' || tool === 'ellipse'}
        <div class="sep"></div>
        <div class="opt-row">
          <button class="obtn" class:sel={!filled} title="Outline" on:click={() => filled=false}>□</button>
          <button class="obtn" class:sel={filled}  title="Filled"  on:click={() => filled=true}>■</button>
        </div>
      {/if}

      <div class="sep"></div>

      <div class="sizes">
        {#each SIZES as s}
          <button class="sbtn" class:sel={brushSize===s} title="{s}px" on:click={() => brushSize=s}>
            <div class="sdot" style="width:{Math.min(s*2,22)}px;height:{Math.min(s*2,22)}px"></div>
          </button>
        {/each}
      </div>

      <div class="sep"></div>

      <button class="tbtn" title="Undo (Ctrl+Z)" on:click={undo} disabled={!undoStack.length}><Undo2 size={14} /></button>
      <button class="tbtn" title="Redo (Ctrl+Y)" on:click={redo} disabled={!redoStack.length}><Redo2 size={14} /></button>
      <button class="tbtn" title="Clear" on:click={newCanvas}><RotateCcw size={14} /></button>

      <div class="sep"></div>

      <button class="tbtn" title="Save as PNG" on:click={download}><Download size={14} /></button>
    </div>

    <div class="canvas-wrap">
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <canvas
        bind:this={canvas}
        width={W} height={H}
        class="canvas"
        style="cursor:{tool==='picker'?'cell':'crosshair'}"
        on:mousedown={onMouseDown}
        on:mousemove={onMouseMove}
        on:mouseup={onMouseUp}
        on:mouseleave={() => { if (drawing && !savedImg) drawing=false }}
        on:contextmenu|preventDefault
        role="img"
        aria-label="Paint canvas"
      ></canvas>
    </div>
  </div>

  <div class="palette-bar">
    <div class="cur-color" style="background:{color}" title="Current color"></div>
    <div class="pal-grid">
      {#each PALETTE as c}
        <button class="pc" style="background:{c}" class:sel={color===c} title={c} on:click={() => color=c}></button>
      {/each}
    </div>
    <label class="custom-wrap" title="Custom color">
      <input type="color" bind:value={color} class="cpick" />
    </label>
  </div>
</div>

<style>
  .paint {
    display: flex; flex-direction: column;
    height: 100%; background: #1e1e1e; color: #d4d4d4;
    font-size: 13px; position: relative; overflow: hidden;
    outline: none;
  }

  .menubar {
    display: flex; align-items: center;
    padding: 0 4px; background: #2a2a2a;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0; height: 30px; user-select: none;
  }
  .mw { position: relative; }
  .mb {
    padding: 4px 10px; border: none; background: transparent;
    color: rgba(255,255,255,0.8); font-size: 13px; font-family: inherit;
    cursor: pointer; border-radius: 3px; transition: background 0.08s;
  }
  .mb:hover,.mb.active { background: rgba(255,255,255,0.1); }
  .drop {
    position: absolute; top: 100%; left: 0;
    background: #2d2d2d; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 4px; padding: 3px 0; min-width: 190px;
    z-index: 9999; box-shadow: 0 6px 20px rgba(0,0,0,0.6);
  }
  .di {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 5px 14px;
    border: none; background: transparent;
    color: rgba(255,255,255,0.8); font-size: 13px; font-family: inherit;
    cursor: pointer; text-align: left; transition: background 0.07s;
  }
  .di:hover { background: rgba(0,120,212,0.35); color: #fff; }
  .di.dimmed { opacity: 0.4; pointer-events: none; }
  .ds { height: 1px; background: rgba(255,255,255,0.1); margin: 3px 0; }
  .sc { font-size: 11px; color: rgba(255,255,255,0.35); }

  .workspace { display: flex; flex: 1; min-height: 0; }

  .toolpanel {
    width: 44px; flex-shrink: 0;
    background: #252525;
    border-right: 1px solid rgba(255,255,255,0.07);
    display: flex; flex-direction: column; align-items: center;
    padding: 6px 4px; gap: 3px; overflow-y: auto;
  }
  .tool-group { display: flex; flex-direction: column; gap: 2px; width: 100%; }
  .tbtn {
    width: 36px; height: 32px;
    border: none; border-radius: 4px; background: transparent;
    color: rgba(255,255,255,0.55); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.08s, color 0.08s;
  }
  .tbtn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .tbtn.sel { background: rgba(0,120,212,0.3); color: #4cc2ff; }
  .tbtn:disabled { opacity: 0.3; cursor: default; }

  .sep { width: 80%; height: 1px; background: rgba(255,255,255,0.1); margin: 3px 0; flex-shrink: 0; }

  .opt-row { display: flex; gap: 2px; width: 100%; }
  .obtn {
    flex: 1; height: 28px; border: none; border-radius: 4px;
    background: transparent; color: rgba(255,255,255,0.55);
    font-size: 14px; cursor: pointer; transition: background 0.08s;
  }
  .obtn:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .obtn.sel { background: rgba(0,120,212,0.25); color: #4cc2ff; }

  .sizes { display: flex; flex-direction: column; gap: 4px; align-items: center; width: 100%; }
  .sbtn {
    width: 36px; height: 28px;
    border: none; border-radius: 4px; background: transparent;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.08s;
  }
  .sbtn:hover { background: rgba(255,255,255,0.08); }
  .sbtn.sel { background: rgba(0,120,212,0.25); }
  .sdot { border-radius: 50%; background: #d4d4d4; min-width: 2px; min-height: 2px; }

  .canvas-wrap {
    flex: 1; overflow: auto;
    background-color: #3a3a3a;
    background-image:
      linear-gradient(45deg, #323232 25%, transparent 25%),
      linear-gradient(-45deg, #323232 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #323232 75%),
      linear-gradient(-45deg, transparent 75%, #323232 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    padding: 16px;
  }
  .canvas {
    display: block;
    box-shadow: 0 4px 28px rgba(0,0,0,0.6);
    image-rendering: pixelated;
  }

  .palette-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 5px 10px;
    background: #252525;
    border-top: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }
  .cur-color {
    width: 30px; height: 30px;
    border: 2px solid rgba(255,255,255,0.25); border-radius: 4px; flex-shrink: 0;
  }
  .pal-grid { display: flex; flex-wrap: wrap; gap: 2px; flex: 1; max-height: 44px; }
  .pc {
    width: 18px; height: 18px;
    border: 1px solid rgba(0,0,0,0.4); border-radius: 2px;
    cursor: pointer; flex-shrink: 0;
    transition: transform 0.07s, border-color 0.07s;
  }
  .pc:hover { transform: scale(1.25); border-color: rgba(255,255,255,0.7); }
  .pc.sel { border: 2px solid #fff; transform: scale(1.2); }
  .custom-wrap { flex-shrink: 0; cursor: pointer; }
  .cpick { width: 30px; height: 30px; border: none; padding: 0; background: none; cursor: pointer; border-radius: 4px; }
</style>
