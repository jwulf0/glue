export interface ImageReference {
    id: number;
    originalFilename: string;
}

export interface Image extends ImageReference {
    dataUrl: string | null;
}

export enum OrderChange {
    Top,
    Up,
    Down,
    Bottom
};