<script lang="ts">
    import type { Image } from "../model";
    import type { Attempt, DecodedPng, SizeInfo } from "./index";
    import {fromURL} from 'png-es6'
    import { onDestroy, onMount } from "svelte";

    export let images: readonly Image[]; // TODO ensure dataURL not null via types TODO when these change, chaos ensues in combination with the MatchedImage-array...
    
    const maxParallel = 2;

    let canvas: HTMLCanvasElement;
    let error: string;
    let animationFrameId: number;
    
    interface MatchedImage {
        element: HTMLImageElement; // not sure if width/height is okay to use from here, but should be...
        decoded: DecodedPng;
        lastAttempt?: Attempt;
        bestAttempt?: Attempt;
        worker?: Worker;
        complete: boolean;
    }

    let matchingAttempts: MatchedImage[] = [];

    $:loading = error === undefined && matchingAttempts.length === 0

    interface DrawnImage {
        element: HTMLImageElement; 
        top: number;
        left: number;
    }

    let attemptsReceivedFromWorkers: number = 0;
    let attemptsWithMoreThanOneLine: number = 0;

    const decode = (img: Image): Promise<[Image, DecodedPng]> => fromURL(img.dataUrl).then(decoded => [img, decoded]);

    const startMatching = (bottomImgIndex: number) => {
        if(bottomImgIndex < 1) { return; } // should not happen

        const decodedTop = matchingAttempts[bottomImgIndex - 1].decoded;
        const decodedBottom = matchingAttempts[bottomImgIndex].decoded;

        const worker = new Worker(new URL('./matcher', import.meta.url));
                
        matchingUpdate(bottomImgIndex, a => ({...a, worker}));

        worker.postMessage({
            type: 'MatchRequest',
            top: {
                width: decodedTop.width,
                height: decodedTop.height,
                pixels: decodedTop.pixels
            },
            bottom: {
                width: decodedBottom.width,
                height: decodedBottom.height,
                pixels: decodedBottom.pixels
            },
            config: {
                provisionalMatchWidthFactor: 0.2,
                minMatchingLines,
                maxAttemptedHorizontalOffset: 300,
                maxYOffsetFactor: 0.75
            }
        });

        worker.onmessage = (event) => {
            if(event.data.type === 'attempt') {
                attemptsReceivedFromWorkers = attemptsReceivedFromWorkers + 1;
                const attempt = event.data as Attempt;
                if(attempt.lines > 1) {
                    attemptsWithMoreThanOneLine = attemptsWithMoreThanOneLine + 1;
                }

                matchingUpdate(bottomImgIndex, a => ({
                    ...a,
                    lastAttempt: attempt,
                    bestAttempt: a.bestAttempt === undefined || (attempt.lines > a.bestAttempt.lines) ? attempt : a.bestAttempt
                }));
            } else if (event.data.type === 'exhausted') {
                console.log('got EXHAUSTED  for idx ' + bottomImgIndex);
                matchingUpdate(bottomImgIndex, a => ({...a, worker: undefined, complete: true}));
                worker.terminate();
            }
        };
    };

    const isOpen = (a: MatchedImage): boolean => (a.worker === undefined) && (!a.complete);

    $: numOpen = matchingAttempts.filter((a, i) => i > 0 && isOpen(a)).length;
    $: numRunning = matchingAttempts.filter(a => a.worker !== undefined).length;

    const matchNextOpen = () => {
        console.log(`Will start matching the next images!`);
        matchingAttempts
                .map<[MatchedImage, number]>((a, idx) => [a, idx])
                .filter(([a, idx]) => idx > 0 && isOpen(a))
                .slice(0, 1)
                .forEach(([_, idx]) => startMatching(idx));
    }

    $: {
        console.log(`numOpen updated to ${numOpen}`);
        if(numOpen > 0 && numRunning < maxParallel) {
            matchNextOpen()
        }
    }

    /**
     * Updates the State of a MatchedImage, identified by index; triggers a "svelte reactivity" update via new assignment; does not check for equality beforehand.
     */
    const matchingUpdate = (idx: number, fn: (_: MatchedImage) => MatchedImage) => {
        // trigger change in matchingAttempts.
        matchingAttempts = matchingAttempts.map((a,i) => i !== idx ? a : fn(a));
    };

    const minMatchingLines = 30; // TODO configurable or something?

    const matchingStateToDrawnImage = (attempts: MatchedImage[]): DrawnImage[] => {
        
        return attempts.reduce<DrawnImage[]>((acc, img, idx) => {
            let baseX: number, baseY: number;
            if(idx === 0) {
                // TODO this can and should be cached...
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
        // for now, we decode the dataURLs into PNG data here
        Promise
            .all(images.map(decode))
            .then(results => {
                matchingAttempts = results.map(([imgOriginal, decoded], idx, all) => {
                    const element = new Image;
                    element.src = imgOriginal.dataUrl;

                    if(idx === 0) {
                        return {element, decoded, worker: undefined, complete: true}
                    } else {
                        return { element, decoded, worker: undefined, complete: false }
                    }
                });

                const canvasWidth = Math.max(...matchingAttempts.map(a => a.decoded.width));
                const canvasHeight = matchingAttempts.map(a => a.decoded.height).reduce((a, b) => a + b);
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                const ctx = canvas.getContext('2d');
                draw(canvasWidth, canvasHeight, ctx);
            })
            .catch(err => {
                console.error(err);
                error = `Error decoding images: ${JSON.stringify(err)}`
            })
    });

    onDestroy(() => {
        matchingAttempts.forEach(({worker}) => { if(worker !== undefined) worker.terminate });

        if(animationFrameId !== undefined) {
            cancelAnimationFrame(animationFrameId);
        }
    });
</script>

<div class="matcher">
    <h1>{attemptsReceivedFromWorkers} / {attemptsWithMoreThanOneLine}</h1>
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