<script lang="ts">
    import {images} from './imagesStore';

    let files: FileList;

    const handleFile = (file: File, idx: number) => {
        const reader = new FileReader();
        reader.onload = () => {
            images.updateFileContents(idx, reader.result as string);
        };
        reader.readAsDataURL(file);
    };
    
    $: {
        if(files && files.length > 0) {
            const filesAsArray = [...files];
            images.init(filesAsArray.map((f, idx) => ({ id: idx, originalFilename: f.name })));
            filesAsArray.forEach((file, idx) => {
                handleFile(file, idx);
            });
        }
    };
</script>

<input type="file" multiple accept="image/png" bind:files />