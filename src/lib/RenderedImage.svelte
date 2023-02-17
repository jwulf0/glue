<script lang="ts">
    import {OrderChange, type Image} from './model';

    import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
        sort: OrderChange,
        remove: void
    }>();

    export let image: Image;
    export let sortable: boolean;

    const triggerSort = (orderChange: OrderChange) => () => dispatch('sort', orderChange)
    const triggerRemove = () => dispatch('remove')
</script>

{#if image.dataUrl}
<div class="img">
    {#if sortable}
    <div class="controls">
        <a href="#to-top" on:click|preventDefault={triggerSort(OrderChange.Top)}>↑</a>
        <a href="#up" on:click|preventDefault={triggerSort(OrderChange.Up)}>▲</a>
        <a href="#down" on:click|preventDefault={triggerSort(OrderChange.Down)}>▼  </a>
        <a href="#to-bottom" on:click|preventDefault={triggerSort(OrderChange.Bottom)}>↓</a>
        <a href="#remove" on:click|preventDefault={triggerRemove}>⌧</a>
    </div>
    {/if}
    <img src={image.dataUrl} alt={image.originalFilename} />
</div>
{:else}
    <p>{image.originalFilename}</p>
{/if}

<style lang="css">
    .img {
        position: relative;
    }

    .controls {
        position: absolute;
        right: 0.25rem;
        top: 0.25rem;
        font-size: 3rem;
        background-color: rgba(180, 180, 180, .3);
        border-radius: 0.25rem;
        opacity: 0.5;
    }

    .img:hover .controls {
        opacity: 1;
    }

    .controls a {
        color: #fff;
        text-shadow: 2px 2px 0.25rem #000;
        padding: 0.1rem 0.35rem;
    }

    img {
        max-height: 50vh;
        max-width: 80vw;;
    }
</style>