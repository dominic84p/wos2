<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { vfs } from '../../stores/filesystem'
  import { windows } from '../../stores/windows'
  import { RotateCcw } from 'lucide-svelte'

  export let windowId: string = ''

  let filePath = ''
  let srcDoc = ''
  let frameKey = 0

  onMount(() => {
    const win = get(windows).find(w => w.id === windowId)
    if (win?.filePath) {
      filePath = win.filePath
      reload()
    }
  })

  function reload() {
    if (filePath && vfs.exists(filePath)) {
      srcDoc = vfs.readFile(filePath)
      frameKey++
    }
  }

  $: filename = filePath ? filePath.split('/').pop() ?? 'preview' : 'preview'
</script>

<div class="preview-wrap">
  <div class="toolbar">
    <span class="filename">{filename}</span>
    <button class="refresh-btn" on:click={reload} title="Reload">
      <RotateCcw size={13} />
      Reload
    </button>
  </div>
  {#if srcDoc}
    {#key frameKey}
      <iframe
        class="frame"
        srcdoc={srcDoc}
        title={filename}
        sandbox="allow-scripts allow-same-origin"
      ></iframe>
    {/key}
  {:else}
    <div class="empty">No file loaded</div>
  {/if}
</div>

<style>
  .preview-wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 10px;
    background: #f3f3f3;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
    font-size: 12px;
    color: #444;
  }

  .filename {
    font-family: monospace;
    font-size: 12px;
    color: #333;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    border: 1px solid #ccc;
    background: #fff;
    border-radius: 4px;
    padding: 3px 9px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    color: #444;
    transition: background 0.1s;
  }

  .refresh-btn:hover { background: #e8e8e8; }

  .frame {
    flex: 1;
    border: none;
    width: 100%;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #aaa;
    font-size: 13px;
  }
</style>
