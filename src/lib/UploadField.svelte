<script lang="ts">
    import {images} from './imagesStore';

    let files: FileList;

    const handleFile = (file: File, idx: number) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            images.updateFileContents(idx, reader.result as string);
        };
        reader.readAsDataURL(file);
    };
    
    $: {
        if(files && files.length > 0) {
            const filesAsArray = [...files];
            images.init(filesAsArray.map(f => f.name));
            filesAsArray.forEach((file, idx) => {
                handleFile(file, idx);
            });
        }
    };
</script>

<input type="file" multiple bind:files />