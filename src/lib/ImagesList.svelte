<script lang="ts">
    import {images, sort} from './imagesStore'; 
    import type { OrderChange } from './model';
    import RenderedImage from './RenderedImage.svelte';

    const triggerSort = (id: number) => (e: CustomEvent<OrderChange>) => sort(id, e.detail);
    const triggerRemove = (id: number) => () => images.remove(id);
</script>

<div class="images-list">
    {#if $images && $images.length > 0}
        {#each $images as image (image.id)}
            <RenderedImage image={image} sortable={true}
                on:sort={triggerSort(image.id)}
                on:remove={triggerRemove(image.id)}
            />
        {/each}
    {/if}
</div>

