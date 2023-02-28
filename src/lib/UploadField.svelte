<script lang="ts">
    import {images} from './imagesStore';
    import type { DecodedPng, Image } from './model';
    import {fromURL} from 'png-es6'

    let files: FileList;
    let error: string | undefined;

    const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);

        try {
            reader.readAsDataURL(file);
        } catch (err) {
            reject(err);
        }
    });

    const dataUrlToDecodedPng = (dataUrl: string): Promise<DecodedPng> =>
        fromURL(dataUrl)
        .then(({width, height, pixels}) => ({
            width: width as number,
            height: height as number,
            pixels: pixels as Uint8Array
        }));

    const handleFile = (id: number, file: File): Promise<Image> => 
        fileToDataUrl(file)
            .then(dataUrl => 
                dataUrlToDecodedPng(dataUrl)
                .then(decoded => ({id, originalFilename: file.name, dataUrl, decoded}))
            )
        .catch(err => {
            throw `Error handling file ${file.name}: ${JSON.stringify(err)}`;
        });

    
    $: {
        if(files && files.length > 0) {
            const filesAsArray = [...files];
            const allResults = filesAsArray.map((file, idx) => handleFile(idx, file));
            Promise
                .all(allResults)
                .then(results => images.init(results))
                .catch(err => error = err);
        }
    };
</script>

{#if error !== undefined}
    <div class="error">
        <p>{error}</p>
        <p>Note that for now only PNG images are supported.</p>
    </div>
{/if}
<input type="file" multiple accept="image/png" bind:files />
