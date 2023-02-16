import { writable } from 'svelte/store';
import type { Image, ImageReference } from './model';

const {subscribe, set, update} = writable<readonly (Image | null)[]>([]); 

/**
 * Initialize the store with some references to uploaded images. 
 * 
 * The id properties need to be unique. Calls to other exposed methods of this store need this ID to identify an image.
 * 
 * @param files Filenames and  of the uploaded images.
 */
const init = (files: ImageReference[]) => {
    // ensure unique IDs
    const numUniqueIds: number = new Set(files.map(f => f.id)).size
    if(numUniqueIds !== files.length) {
        throw new Error('IDs of Images not unique!');
    }

    set(files.map(({id, originalFilename}) => ({id, originalFilename,  dataUrl: null })));
};

/**
 * To be called when a fileReader has read the contents of one of the uploaded files as data URL (https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
 * 
 * @param id ID of the image to update
 * @param dataUrl file data as dataURL
 */
const updateFileContents = (id: number, dataUrl: string) => {
    update(images => 
        images.map((img) => {
            if(img.id !== id) return img;
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