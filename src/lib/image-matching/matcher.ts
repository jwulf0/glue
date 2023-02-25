// for now: Some types for now copied from the model since having the webworker as module is causing some issues;
// hence we stuff everything (types, matching logic, ipc into this file.)

// SHARED
interface DecodedPng {
    width: number;
    height: number;
    pixels: number[];
}

interface MatchingConfig {
    provisionalMatchWidthFactor: number; // a proportion to match lines in the "provisional matching" phase; is taken from the lower width of the two images
    minMatchingLines: number; // how many consecutively matching lines count as a match
    maxAttemptedHorizontalOffset: number; // how far the images are moved on the x axis for a potential match (is applied to both sides, left and right)
    maxYOffsetFactor: number; // how far up the bottom is tried in the overlay at most; relative to top image size (?)
}

interface Attempt {
    yOffset: number; // offset of the bottom image - will always be negative since the bottom image can't move further to the bottom for a match
    xOffset: number; // offset of the bottom image - can be positive and negative.
    lines: number; // number of lines that have matched so far.
}

// matcher-INTERNAL
interface OverlayContext {
    xOffset: number; // x-offset of the bottom image, relative to a position where the images are centered (using the centeringOffset-helper)
    yOffset: number; // upward(!) y-offset of the bottom image.
}

const tryMatching = (top: DecodedPng, bottom: DecodedPng, config: MatchingConfig, attemptCb: (_: Attempt) => void) => {
    let bestAttemptLines = 0;

    // prepare the matching context
    const matchingWidth = Math.min(
        Math.ceil(config.provisionalMatchWidthFactor * Math.min(top.width, bottom.width)),
        top.width,
        bottom.width
    );
    const maxAbsXOffset = Math.abs(Math.min(config.maxAttemptedHorizontalOffset, (bottom.width - matchingWidth) / 2));
    const maxYOffset = Math.min(top.height, Math.ceil(config.maxYOffsetFactor * top.height));
    

    const isLineMatch = (o: OverlayContext, line: number): boolean => {
        const topStartRow = top.height - o.yOffset + line;
        const topStartCol = Math.ceil(top.width / 2) - Math.ceil(matchingWidth / 2);

        const botStartRow = line;
        const botStartCol = Math.ceil(bottom.width / 2) - Math.ceil(matchingWidth / 2) - o.xOffset;

        const topStartIdx = topStartRow * 4 * top.width + topStartCol * 4;
        const botStartIdx = botStartRow * 4 * bottom.width + botStartCol * 4;

        for(let i = 0; i < 4 * matchingWidth; i++) {
            if(top.pixels[topStartIdx + i] !== bottom.pixels[botStartIdx + i]) {
                return false;
            }
        }

        return true;
    }

    const attemptOverlay = (o: OverlayContext): void => {
        attemptCb({...o, lines: 0 });
        const linesToBeat = Math.max(config.minMatchingLines - 1, bestAttemptLines);

        // first check current line and minMatchingLines further down
        if(isLineMatch(o, 0) && isLineMatch(o, linesToBeat)) {
            let lines: number = 1; // lines matching with this context so far - we checked line 1 first.
            let failed: boolean = false;
            while(!failed && lines < o.yOffset) {
                attemptCb({...o, lines});
                const isMatch = isLineMatch(o, lines);
                if(isMatch) { lines++ };
                failed = !isMatch;
            }
            if(lines > bestAttemptLines) {
                bestAttemptLines = lines;
            }
        }
    };

    // returns the max number of lines possible for this y offset (with any x offset - it will remain unknown for now)
    const tryYOffset = (yOffset:number): void => {
        for(let xAbs = 0; xAbs < maxAbsXOffset; xAbs++) {
            [-1, 1].forEach(sign => {
                if(sign === -1 && xAbs === 0) {
                    return;
                }
                const xOffset = xAbs * sign;
                const overlayContext: OverlayContext = { xOffset, yOffset };
                attemptOverlay(overlayContext);
            });
        }
    }

    // iterate through all relevant OverlayContexts we want to try:
    for(let y = 0; y < maxYOffset; y++) {
        tryYOffset(y);
    }

    postMessage({type: 'exhausted'});
}

// IPC
interface MatchRequest {
    type: 'MatchRequest';
    top: DecodedPng;
    bottom: DecodedPng;
    config: MatchingConfig;
}

addEventListener('message', (event) => {
    const request = event.data as MatchRequest;
    tryMatching(request.top, request.bottom, request.config, (a: Attempt) => {
        postMessage({type: 'attempt', ...a})
    });
});

export type {} // for now, to satisfy --isolatedModules