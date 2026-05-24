<script lang="ts">
  import Desktop from './lib/components/desktop/Desktop.svelte'
  import GrubScreen from './lib/components/desktop/GrubScreen.svelte'
  import { settings } from './lib/stores/settings'
  import { bricked } from './lib/stores/system'

  $: document.documentElement.style.setProperty('--accent', $settings.accentColor)
</script>

{#if $bricked}
  <GrubScreen />
{:else}
  <Desktop />
{/if}
