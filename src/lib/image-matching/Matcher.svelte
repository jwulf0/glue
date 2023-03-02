<script lang="ts">
    import type { Image } from "../model";
    import type { Attempt, MatchRequest } from "./index";
    import { onDestroy, onMount } from "svelte";
    import AcceptButton from "./AcceptButton.svelte";

    export let images: readonly Image[];      // images to match
    export let maxParallel: number = 2;       // how many workers to spawn at most in parallel
    export let minMatchingLines: number = 30; // how many lines are required at least for a match to count

    let canvas: HTMLCanvasElement;
    let error: string;
    let animationFrameId: number;

    // -- MATCHING --
    interface MatchedImage {
        element: HTMLImageElement; // not sure if width/height is okay to use from here, but should be...
        exhausted: boolean;
        lastAttempt?: Attempt;
        bestAttempt?: Attempt;
        worker?: Worker;
        accepted?: Attempt;
    };

    let matchingAttempts: MatchedImage[] = [];

    /**
     * Updates the State of a MatchedImage, identified by index; triggers a "svelte reactivity" update via new assignment
     */
     const matchingUpdate = (idx: number, fn: (_: MatchedImage) => MatchedImage) => {
        matchingAttempts = matchingAttempts.map((a,i) => i !== idx ? a : fn(a));
    };

    // Starts matching the image with the given index to the image above 
    const startMatching = (bottomImgIndex: number) => {
        if(bottomImgIndex < 1) { return; } // should not happen

        const decodedTop = images[bottomImgIndex - 1].decoded;
        const decodedBottom = images[bottomImgIndex].decoded;

        const worker = new Worker(new URL('./matcher', import.meta.url));
                
        matchingUpdate(bottomImgIndex, a => ({...a, worker}));

        const request: MatchRequest = {
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
                provisionalMatchWidthFactor: 0.5,
                minMatchingLines,
                maxXOffsetFactor: 0.1,
                maxYOffsetFactor: 0.75
            }
        };

        worker.postMessage(request);

        worker.onmessage = (event) => {
            if(event.data.type === 'attempt') {
                const attempt = event.data as Attempt;

                matchingUpdate(bottomImgIndex, a => ({
                    ...a,
                    lastAttempt: attempt,
                    bestAttempt: a.bestAttempt === undefined || (attempt.lines > a.bestAttempt.lines) ? attempt : a.bestAttempt
                }));
            } else if (event.data.type === 'exhausted') {
                matchingUpdate(bottomImgIndex, a => ({...a, worker: undefined, exhausted: true}));
                worker.terminate();
            }
        };
    };

    const isOpen = (a: MatchedImage): boolean => (a.worker === undefined) && (!a.exhausted) && (!a.accepted);

    $: numOpen = matchingAttempts.filter((a, i) => i > 0 && isOpen(a)).length;
    $: numRunning = matchingAttempts.filter(a => a.worker !== undefined).length;
    $: numComplete = matchingAttempts.filter(a => a.exhausted || a.accepted).length;

    const matchNextOpen = () => {
        matchingAttempts
                .map<[MatchedImage, number]>((a, idx) => [a, idx])
                .filter(([a, idx]) => idx > 0 && isOpen(a))
                .slice(0, 1)
                .forEach(([_, idx]) => startMatching(idx));
    }

    $: {
        if(numOpen > 0 && numRunning < maxParallel) {
            matchNextOpen()
        }
    }

    // -- VISUALIZATION --
    // map the images being matched to drawing instructions for the canvas
    interface DrawnImage {
        element: HTMLImageElement; 
        top: number;
        left: number;
        attemptRec?: {
            top: number;
            height: number;
        };
    };

    const matchingStateToDrawnImages = (attempts: MatchedImage[]): DrawnImage[] => {
        const widest = Math.max(...attempts.map(res => res.element.width));

        return attempts.reduce<DrawnImage[]>((acc, img, idx) => {
            let baseX: number, baseY: number;
            if(idx === 0) {
                baseX = (widest - img.element.width) / 2;
                baseY = 0;
            } else {
                const prevDrawn = acc[idx - 1];
                baseX = prevDrawn.left + ((prevDrawn.element.width - img.element.width) / 2);
                baseY = prevDrawn.top + prevDrawn.element.height;
            }

            const attemptToDraw = img.accepted ? img.accepted : (
                    (img.bestAttempt !== undefined && img.bestAttempt.lines >= minMatchingLines) ? img.bestAttempt :  (
                    img.lastAttempt !== undefined ? { ...img.lastAttempt, xOffset: 0 } : ({ xOffset: 0, yOffset: 0, lines: 0 })
                )
            );

            const newlyDrawnImg: DrawnImage = {
                element: img.element,
                left: baseX + attemptToDraw.xOffset,
                top: baseY - attemptToDraw.yOffset,
                attemptRec: ((img.lastAttempt === undefined) || img.exhausted || img.accepted) ? undefined : {
                    top: baseY - img.lastAttempt.yOffset,
                    height: img.lastAttempt.lines
                }
            };

            return [...acc, newlyDrawnImg]
        }, []);
    }

    let imagesToDraw: DrawnImage[] = [];
    let imagesToDrawUpdated: boolean = false;
    $: {
        imagesToDraw = matchingStateToDrawnImages(matchingAttempts);
        imagesToDrawUpdated = true;
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        if(imagesToDrawUpdated && imagesToDraw.length > 0) {
            const last = imagesToDraw[imagesToDraw.length - 1];
            canvas.height = last.top + last.element.height;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
            
            imagesToDraw.forEach(({element, top, left, attemptRec}) => {
                ctx.drawImage(element, left, top);
                if(attemptRec !== undefined) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(30, 220, 30, 0.9)';
                    ctx.rect(0, attemptRec.top, canvas.width, attemptRec.height);
                    ctx.stroke();
                }
            });

            imagesToDrawUpdated = false;
        }

        const complete: boolean = numComplete > 0 && (numOpen === 0) && (numRunning === 0);
        if(!complete) {
            animationFrameId = requestAnimationFrame(() => draw(ctx));
        } else {
            animationFrameId = undefined;
        }
    }

    // -- INTERACTION/USER SUPPORT --
    // Map matching attempts to suggestions which the user can accept in order to stop workers early, reducing the overall workload
    interface Suggestion {
        idx: number;         // matched image index (bottom)
        attempt: Attempt;    // the attempt to be accepted (TODO or rejected)
        relativeTop: number; // where the suggested match is on the y axis, relative to (theoretical) canvas height
    };
    let suggestions: Suggestion[];
    $:suggestions = matchingAttempts 
        .map<[MatchedImage, number]>((a, idx) => [a, idx])
        .filter(([a, idx]) => !a.accepted && a.bestAttempt && a.bestAttempt.lines > minMatchingLines && imagesToDraw[idx])
        .map(([a, idx]) => ({
            idx,
            attempt: a.bestAttempt,
            relativeTop: imagesToDraw[idx].top / canvas.height
        }));
    const onAccept = (s: Suggestion) => {
        if(matchingAttempts[s.idx].worker !== undefined) {
            matchingAttempts[s.idx].worker.terminate();
        }
        matchingUpdate(s.idx, a => ({
            ...a,
            worker: undefined,
            accepted: s.attempt
        }));
    };

    // -- LIFECYCLE --
    // These lifecycle callbacks start/stop the matching and animation on the canvas;
    // the onMount are necessary because we can't start before the canvas is available
    onMount(() => {
        matchingAttempts = images.map((img, idx) => {
            const element = new Image;
            element.src = img.dataUrl;

            if(idx === 0) {
                return {element, worker: undefined, exhausted: true}
            } else {
                return { element, worker: undefined, exhausted: false }
            }
        });

        const canvasWidth = Math.max(...images.map(a => a.decoded.width));
        const canvasHeight = images.map(a => a.decoded.height).reduce((a, b) => a + b);
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext('2d');
        draw(ctx);
    });

    onDestroy(() => {
        matchingAttempts.forEach(({worker}) => { if(worker !== undefined) worker.terminate });

        if(animationFrameId !== undefined) {
            cancelAnimationFrame(animationFrameId);
        }
    });


    $:loading = error === undefined && matchingAttempts.length === 0
</script>

<div class="matcher">
    {#if error !== undefined}
        <p class="error">{error}</p>
    {:else if loading}
        <p>Preparing images...</p>
    {/if}
    <div style="position: relative;">
        <canvas bind:this={canvas}></canvas>
        {#each suggestions as s}
            <AcceptButton relativeTop={s.relativeTop} on:accept={() => onAccept(s)} />
        {/each}
    </div>
</div>

<style>
    canvas {
        max-width: 100%;
    }
</style>