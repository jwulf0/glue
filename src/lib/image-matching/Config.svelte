<script lang="ts">
    import type { MatchingConfig } from ".";

    export let config: MatchingConfig;
    export let maxParallel: number;
    export let numImages: number;
</script>


<div class="matching-config">
    <h3>Configuration</h3>
        <div>
            <label>Matching Width Factor: {config.provisionalMatchWidthFactor}
                <input type="range" bind:value={config.provisionalMatchWidthFactor} min={0.05} max={1} step={0.05} id="match-width" />
            </label>
        </div>
        <div>
            <label>Min Matching Lines: {config.minMatchingLines}
                <input type="range" bind:value={config.minMatchingLines} min={5} max={100} step={1} id="min-lines" />
            </label>
        </div>
        <div>
            <label>Max X Offset Factor: {config.maxXOffsetFactor}
                <input type="range" bind:value={config.maxXOffsetFactor} min={0.01} max={0.5} step={0.01} id="max-x-offset" />
            </label>
        </div>
        <div>
            <label>Max Y Offset Factor: {config.maxYOffsetFactor}
                <input type="range" bind:value={config.maxYOffsetFactor} min={0.05} max={0.8} step={0.05} id="max-y-offset" />
            </label>
        </div>
        <div>
            <label>Max Parallel Workers: {maxParallel}
                <input type="range" bind:value={maxParallel} min={1} max={Math.min(navigator.hardwareConcurrency, numImages)} step={1} id="max-parallel" />
            </label>
        </div>
</div>
