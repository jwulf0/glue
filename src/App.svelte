<script lang="ts">
  import svelteLogo from './assets/svelte.svg'
  import UploadField from './lib/UploadField.svelte';
  import ImagesList from './lib/ImagesList.svelte';
  import {images} from './lib/imagesStore'; 
</script>

<main>
  <h1>Glue</h1>

  <div class="card">
    {#if $images && $images.length > 0}
      <ImagesList />
    {:else}
      <p>Step 1: Choose the Images to be glued together</p>
      <UploadField />
    {/if}
  </div>

</main>
<footer>
  <p>made with</p>
  <a href="https://vitejs.dev" target="_blank" rel="noreferrer"> 
    <img src="/vite.svg" class="logo" alt="Vite Logo" />
  </a>
  <a href="https://svelte.dev" target="_blank" rel="noreferrer"> 
    <img src={svelteLogo} class="logo svelte" alt="Svelte Logo" />
  </a>
</footer>

<style>
  .logo {
    height: 2em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
</style>