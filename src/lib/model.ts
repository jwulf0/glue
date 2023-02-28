// part of the output of png-es6
export interface DecodedPng {
    width: number;
    height: number;
    pixels: Uint8Array;
}

export interface Image {
    id: number;
    originalFilename: string;
    dataUrl: string;
    decoded: DecodedPng
}

export enum OrderChange {
    Top,
    Up,
    Down,
    Bottom
};