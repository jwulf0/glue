<script lang="ts">
    import {images} from './imagesStore'; 
</script>

<div class="images-list">
    {#if $images && $images.length > 0}
        {#each $images as image (image.id)}
            {#if image.dataUrl}
            <div class="img">
                <img src={image.dataUrl} alt={image.originalFilename} />
            </div>
            {:else}
                <p>{image.originalFilename}</p>
            {/if}
        {/each}
    {/if}
</div>

<style lang="css">
    .images-list img {
        max-height: 50vh;
        max-width: 80vw;;
    }
</style>