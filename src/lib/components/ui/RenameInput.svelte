<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  export let name: string
  export let isFile = false
  const dispatch = createEventDispatcher()
  let input: HTMLInputElement
  let value = name
  let finished = false
  function finish(cancel = false) {
    if (finished) return
    finished = true
    const next = value.trim()
    if (cancel || !next || next === name || /[\\/]/.test(next) || next === '.' || next === '..') dispatch('cancel')
    else dispatch('save', next)
  }
  onMount(() => {
    input.focus()
    const dot = isFile ? name.lastIndexOf('.') : -1
    input.setSelectionRange(0, dot > 0 ? dot : name.length)
  })
</script>

<input bind:this={input} bind:value on:pointerdown|stopPropagation on:mousedown|stopPropagation
  on:click|stopPropagation on:dblclick|stopPropagation on:blur={() => finish()}
  on:keydown|stopPropagation={(e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish() }
    if (e.key === 'Escape') { e.preventDefault(); finish(true) }
  }} aria-label="Rename" />

<style>
  input { box-sizing: border-box; width: 100%; min-width: 0; padding: 1px 2px; border: 1px solid #0078d4; outline: 1px solid white; background: white; color: #111; font: 11px 'Segoe UI', sans-serif; text-align: center; }
</style>
