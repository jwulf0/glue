<script lang="ts">
    import type { Image } from "../model";
    import type { Attempt, DecodedPng, SizeInfo } from "./index";
    import {fromURL} from 'png-es6'
    import { onDestroy, onMount } from "svelte";

    export let topImg: Image;
    export let bottomImg: Image;

    let top: SizeInfo;
    let bottom: SizeInfo;

    let canvas: HTMLCanvasElement;
    let error: string;
    let worker: Worker
    let animationFrameId: number;
    $:loading = error === undefined && worker === undefined

    const decodeTop: Promise<DecodedPng> = fromURL(topImg.dataUrl);
    const decodeBottom: Promise<DecodedPng> = fromURL(bottomImg.dataUrl);

    const minMatchingLines = 30; // TODO configurable or something?

    let xOffset: number = 0;
    let yOffset: number = 0;
    let bestAttempt: Attempt;
    
    function draw(canvasWidth: number,
                  canvasHeight: number,
                  topImage: HTMLImageElement,
                  bottomImage: HTMLImageElement,
                  bottomBaseXOffset: number,
                  lastDrawnYOffset: number,
                  ctx: CanvasRenderingContext2D) {  
        const drawBestAttempts: boolean = true;

        if(bestAttempt !== undefined && bestAttempt.lines >= minMatchingLines && drawBestAttempts) {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(topImage, 0, 0);
            ctx.drawImage(bottomImage, bottomBaseXOffset + bestAttempt.xOffset, top.height - bestAttempt.yOffset);
        } else {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(topImage, 0, 0);
            ctx.globalAlpha = 0.75;
            ctx.drawImage(bottomImage, bottomBaseXOffset, top.height - yOffset);
            ctx.globalAlpha = 1; 
            
        }
        animationFrameId = requestAnimationFrame(() => draw(canvasWidth, canvasHeight, topImage, bottomImage, bottomBaseXOffset, lastDrawnYOffset, ctx))
    }

    onMount(() => {
        const ctx = canvas.getContext('2d');

        Promise.all([decodeTop, decodeBottom])
            .then(([topRes, bottomRes]) => {
                top = {width: topRes.width, height: topRes.height};
                bottom = {width: bottomRes.width, height: bottomRes.height};
                
                worker = new Worker(new URL('./matcher', import.meta.url));
                worker.postMessage({
                    type: 'MatchRequest',
                    top: {
                        width: topRes.width,
                        height: topRes.height,
                        pixels: topRes.pixels
                    },
                    bottom: {
                        width: bottomRes.width,
                        height: bottomRes.height,
                        pixels: bottomRes.pixels
                    },
                    config: {
                        provisionalMatchWidthFactor: 0.1,
                        minMatchingLines,
                        maxAttemptedHorizontalOffset: 300,
                        maxYOffsetFactor: 0.75
                    }
                });

                const canvasWidth = Math.max(top.width, bottom.width);
                const canvasHeight = top.height + bottom.height;
                const topI = new Image;
                topI.src = topImg.dataUrl;
                const bottomI = new Image;
                bottomI.src = bottomImg.dataUrl;
                const bottomBaseXOffset = Math.ceil((top.width - bottom.width) / 2)

                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                animationFrameId = requestAnimationFrame(() => draw(canvasWidth, canvasHeight, topI, bottomI, bottomBaseXOffset, -1, ctx));

                worker.onmessage = (event) => {
                    if(event.data.type === 'attempt') {
                        const attempt = event.data as Attempt;

                        if(attempt.yOffset != yOffset) {
                            yOffset = attempt.yOffset
                        }
                        if(attempt.xOffset != xOffset) {
                            xOffset = attempt.xOffset
                        }
                        if(!bestAttempt || attempt.lines > bestAttempt.lines) { bestAttempt = {...attempt}; }
                    }
                }
            })
            .catch(err => {
                console.error(err);
                error = `Error decoding images: ${JSON.stringify(err)}`
            })
    });

    onDestroy(() => {
        if (worker !== undefined) {
            worker.terminate();
        }
        if(animationFrameId !== undefined) {
            cancelAnimationFrame(animationFrameId);
        }
    });
</script>

<div class="matcher">
    {#if error !== undefined}
        <p class="error">{error}</p>
    {:else if loading}
        <p>Preparing images...</p>
    {/if}
    <pre>{JSON.stringify(bestAttempt)}</pre>
    <p>{yOffset}</p>
    <canvas bind:this={canvas}></canvas>
</div>

<style>
    canvas {
        max-width: 100%;
    }
</style>