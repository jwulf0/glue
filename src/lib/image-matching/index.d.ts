
export interface MatchingConfig {
    provisionalMatchWidthFactor: number; // a proportion to match lines in the "provisional matching" phase; is taken from the lower width of the two images
    minMatchingLines: number; // how many consecutively matching lines count as a match
    maxAttemptedHorizontalOffset: number; // how far the images are moved on the x axis for a potential match (is applied to both sides, left and right)
    maxYOffsetFactor: number; // how far up the bottom is tried in the overlay at most; relative to top image size (?)
}

export interface Attempt {
    yOffset: number; // offset of the bottom image - will always be negative since the bottom image can't move further to the bottom for a match
    xOffset: number; // offset of the bottom image - can be positive and negative.
    lines: number; // number of lines that have matched so far.
}

// IPC
interface MatchRequest {
    type: 'MatchRequest';
    top: DecodedPng;
    bottom: DecodedPng;
    config: MatchingConfig;
}
