import { writable } from 'svelte/store';
import { OrderChange, type Image } from './model';

const {subscribe, set, update} = writable<readonly Image[]>([]); 

/**
 * Initialize the store with uploaded images. They are stored as dataURL and in "decoded PNG format" which does not
 * make this a masterpice in memory efficiency but that's okay for now.
 * 
 * The id properties need to be unique. Calls to other exposed methods of this store need this ID to identify an image.
 * 
 * @param images Filenames and of the uploaded images.
 */
const init = (images: Image[]) => {
    // ensure unique IDs
    const numUniqueIds: number = new Set(images.map(f => f.id)).size
    if(numUniqueIds !== images.length) {
        throw new Error('IDs of Images not unique!');
    }
    set(images)
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
    remove
}