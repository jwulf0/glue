<script lang="ts">
    import {images, sort} from './imagesStore'; 
    import type { OrderChange } from './model';
    import RenderedImage from './RenderedImage.svelte';

    const triggerSort = (id: number) => (orderChange: OrderChange) => sort(id, orderChange);

    const triggerRemove = (id: number) => () => images.remove(id);

</script>

<div class="images-list">
    {#if $images && $images.length > 0}
        {#each $images as image (image.id)}
            <RenderedImage image={image} sortable={true}
                onSort={triggerSort(image.id)} onRemove={triggerRemove(image.id)} />
        {/each}
    {/if}
</div>

