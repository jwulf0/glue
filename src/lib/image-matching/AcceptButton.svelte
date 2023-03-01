<script lang="ts">
    import { createEventDispatcher } from "svelte";
    export let relativeTop: number;

    const dispatch = createEventDispatcher<{
        accept: void;   
    }>();
</script>

<div class="accept" style="position: absolute; top: {relativeTop * 100}%">
    <a href="#accept" on:click|preventDefault={() => dispatch('accept')}>Accept</a>
</div>

<style lang="css">
    .accept a {
        background-color: rgba(200, 200, 200, 0.75);
        border-radius: 0.25rem;
    }
</style>