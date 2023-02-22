<script lang="ts">
    import type { Image } from "../model";
    import type { Attempt, DecodedPng, SizeInfo } from "./index";
    import {fromURL} from 'png-es6'
    import { onDestroy, onMount } from "svelte";

    export let images: readonly Image[]; // TODO ensure dataURL not null via types

    let canvas: HTMLCanvasElement;
    let error: string;
    let animationFrameId: number;
    
    interface MatchedImage {
        element: HTMLImageElement; // not sure if width/height is okay to use from here, but should be...
        // size: SizeInfo; 
        // baseXOffset: number; // depends on image above
        lastAttempt?: Attempt;
        bestAttempt?: Attempt;
    }

    let matchingAttempts: MatchedImage[] = [];
    let workers: Worker[] = [];
    $:loading = error === undefined && (workers.length === 0 || matchingAttempts.length === 0)


    interface DrawnImage {
        element: HTMLImageElement; 
        top: number;
        left: number;
    }

    const minMatchingLines = 30; // TODO configurable or something?

    const matchingStateToDrawnImage = (attempts: MatchedImage[]): DrawnImage[] => {
        
        return attempts.reduce<DrawnImage[]>((acc, img, idx) => {
            let baseX: number, baseY: number;
            if(idx === 0) {
                // TODO this can and should be cashed...
                const widest = Math.max(...attempts.map(res => res.element.width));
                baseX = (widest - img.element.width) / 2;
                baseY = 0;
            } else {
                const prevDrawn = acc[idx - 1];
                baseX = prevDrawn.left + ((prevDrawn.element.width - img.element.width) / 2);
                baseY = prevDrawn.top + prevDrawn.element.height;
            }

            // TODO 30 configurable
            const attemptToDraw: Attempt = (img.bestAttempt !== undefined && img.bestAttempt.lines >= 30) ? img.bestAttempt : (
                img.lastAttempt !== undefined ? { ...img.lastAttempt, xOffset: 0 } : ({ xOffset: 0, yOffset: 0, lines: 0 })
            );

            const newlyDrawnImg: DrawnImage = {
                element: img.element,
                left: baseX + attemptToDraw.xOffset,
                top: baseY - attemptToDraw.yOffset
            };

            return [...acc, newlyDrawnImg]
        }, []);
        // TODO - maybe only update when there are real changes and only then call the draw-fn? Or is that not really relevant?
    }

    $: imagesToDraw = matchingStateToDrawnImage(matchingAttempts);

    function draw(canvasWidth: number,
                  canvasHeight: number,
                  ctx: CanvasRenderingContext2D) { 

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.globalAlpha = 1;
        
        imagesToDraw.forEach(({element, top, left}, idx) => {
            ctx.drawImage(element, left, top);
        })

        const complete: boolean = false; // TODO reactive?
        if(!complete) {
            animationFrameId = requestAnimationFrame(() => draw(canvasWidth, canvasHeight, ctx));
        } else {
            animationFrameId = undefined;
        }
    }

    onMount(() => {
        const decode = (img: Image): Promise<[Image, DecodedPng]> => fromURL(img.dataUrl).then(decoded => [img, decoded]);

        // for now, we decode the dataURLs into PNG data here
        Promise
            .all(images.map(decode))
            .then(results => {
                const hmmm: MatchedImage[] = [];

                // post a match request for all 2-image-pairs.
                results.forEach(([imgOriginal, imageDecoded], idx, all) => {
                    const element = new Image;
                    element.src = imgOriginal.dataUrl;
                    if(idx === 0) {
                        hmmm.push({element});
                    } else {
                        const imageAbove = all[idx - 1][1]; // TODO is all correct?
                        const worker = new Worker(new URL('./matcher', import.meta.url));
                        const matchedImage: MatchedImage = { element };
                        hmmm.push(matchedImage);

                        worker.postMessage({
                            type: 'MatchRequest',
                            top: {
                                width: imageAbove.width,
                                height: imageAbove.height,
                                pixels: imageAbove.pixels
                            },
                            bottom: {
                                width: imageDecoded.width,
                                height: imageDecoded.height,
                                pixels: imageDecoded.pixels
                            },
                            config: {
                                provisionalMatchWidthFactor: 0.1,
                                minMatchingLines,
                                maxAttemptedHorizontalOffset: 300,
                                maxYOffsetFactor: 0.75
                            }
                        });


                        worker.onmessage = (event) => {
                            if(event.data.type === 'attempt') {
                                const attempt = event.data as Attempt;

                                // trigger change in matchingAttempts.
                                matchingAttempts = matchingAttempts.map((a,i) => {
                                    if(i !== idx) { return a; }
                                    else return {
                                        ...a,
                                        lastAttempt: attempt,
                                        bestAttempt: a.bestAttempt === undefined || (attempt.lines > a.bestAttempt.lines) ? attempt : a.bestAttempt
                                    };
                                })
                            }
                        };

                        workers.push(worker);
                    }
                });

                matchingAttempts = hmmm;

                // TODO this might need to be more dynamic... due to element movement
                const canvasWidth = Math.max(...results.map(r => r[1].width));
                const canvasHeight = results.map(r => r[1].height).reduce((a, b) => a + b);
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                const ctx = canvas.getContext('2d');
                draw(canvasWidth, canvasHeight, ctx);

                console.log(matchingAttempts);
            })
            .catch(err => {
                console.error(err);
                error = `Error decoding images: ${JSON.stringify(err)}`
            })
    });

    onDestroy(() => {
        workers.forEach(w => w.terminate());

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
    <canvas bind:this={canvas}></canvas>
</div>

<style>
    canvas {
        max-width: 100%;
    }
</style>