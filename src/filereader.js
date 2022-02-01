import * as UI from './UI'
import { loadDGCFromFile } from './source';

/* DRAG & DROP */
const dropArea = document.getElementById('drop-area');

dropArea.addEventListener('dragover', (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.dataTransfer.dropEffect = 'copy';
});

dropArea.addEventListener('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    const fileList = event.dataTransfer.files;
    reader.readAsDataURL(fileList[0]);
});


/* FILE SELECTOR */
let reader = new FileReader();

// Repeat computation when user re-selects the same file
document.querySelector("#file-selector").addEventListener('click', event => {
    event.target.value = null;
});

// Load the image as a dataurl to get the correct image size.
// The ImageData constructor requires width and height
document.querySelector("#file-selector").addEventListener('change', event => {
	reader.readAsDataURL(event.target.files[0]);
});

// event fired when file reading failed
reader.addEventListener('error', () => {
	UI.showErrorMessage(err)
});

// event fired when file reading finished
reader.addEventListener('load', async event => {
	UI.reset();
	UI.setProgressText("Processing image")

	let file = event.target.result;

    loadDGCFromFile(file)
    .catch(err => {
        UI.showErrorMessage(err,"This is not an EU Digital COVID Certificate")
    })
	
});


