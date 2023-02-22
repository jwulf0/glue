<script lang="ts">
  import svelteLogo from './assets/svelte.svg'
  import UploadField from './lib/UploadField.svelte';
  import ImagesList from './lib/ImagesList.svelte';
  import {images} from './lib/imagesStore';
  import { writable } from 'svelte/store';
  import {fromURL} from 'png-es6'
  import Matcher from './lib/image-matching/Matcher.svelte';


  const glueing = writable<boolean>(false);

  $: canGlue = !$glueing && $images.length > 1;

  $: {
    if($glueing) {
      const first = $images[0];
      fromURL(first.dataUrl)
        .then(data => console.log(data))
        .catch(err => console.error(err));
    }
  };
</script>

<main>
  <h1>Glue</h1>

  <div>
    {#if $images && $images.length > 0}
      {#if $glueing}
      <Matcher images={$images} />
      {:else}
      <p>Step 2: Order the images. When finished, click the Glue-Button.</p>
      <button on:click={() => glueing.set(true)} disabled={!canGlue}>Glue!</button>
      <ImagesList />
      {/if}
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