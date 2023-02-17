import { writable } from 'svelte/store';
import { OrderChange, type Image, type ImageReference } from './model';

const {subscribe, set, update} = writable<readonly Image[]>([]); 

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

/**
 * Remove an image from the list of images to be glued.
 * 
 * @param id ID of the image to remove
 */
export const remove = (id: number) => {
    update(images => images.filter(img => img.id !== id))
};

export const sort = (id: number, orderChange: OrderChange) => {

    update(images => {
        const currentIdx = images.findIndex(img => img.id === id);
        const img = images[currentIdx];

        if(currentIdx < 0) {
            console.error(`Invalid call sort(${id}, ${orderChange}) - ID not found.`);
            return images;
        }

        const maxIdx = images.length - 1;

        switch (orderChange) {
            case OrderChange.Top:
                if (currentIdx === 0) { return images; }
                return [img, ...images.filter(i => i.id !== id)];
            case OrderChange.Up:
                if (currentIdx === 0) { return images; }

                const imgBeforeToSwapWith = images[currentIdx - 1];

                return [
                    ...images.slice(0, currentIdx - 1),
                    img,
                    imgBeforeToSwapWith,
                    ...images.slice(currentIdx + 1)
                ];
            case OrderChange.Down:
                if (currentIdx === maxIdx) { return images; }

                const imgAfterToSwapWith = images[currentIdx + 1];

                return [
                    ...images.slice(0, currentIdx),
                    imgAfterToSwapWith,
                    img,
                    ...images.slice(currentIdx + 2)
                ];
            case OrderChange.Bottom:
                if (currentIdx === maxIdx) { return images; }
                return [...images.filter(i => i.id !== id), img];
        }
    })
}

export const images = {
    subscribe,
    init,
    updateFileContents,
    remove
}