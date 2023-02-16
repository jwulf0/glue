import { writable } from 'svelte/store';
import type { Image } from './model';

const {subscribe, set, update} = writable<Image[]>([]);

/**
 * All subsequent calls to other store methods are assumed to reference the same indexes as in this array.
 * 
 * @param filenames Filenames of the uploaded images.
 */
const init = (filenames: string[]) => {
    set(filenames.map(originalFilename => ({dataUrl: null, originalFilename})));
};

/**
 * To be called when a fileReader has read the contents of one of the uploaded files as data URL (https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
 * 
 * @param idx index of the image to update
 * @param dataUrl file data as dataURL
 */
const updateFileContents = (idx: number, dataUrl: string) => {
    update(images => 
        images.map((img, i) => {
            if(i !== idx) return img;
            return {
                ...img,
                dataUrl
            }
        })
    );
};

export const images = {
    subscribe,
    init,
    updateFileContents
}