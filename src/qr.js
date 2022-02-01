import * as UI from './UI';
import { loadDGCFromString } from './source';

import jsqr from 'jsqr';
import QRCode from "qrcode";
import QrScanner from "qr-scanner";

export {decode, beautify, scanner}


// Initialize QrScanner
QrScanner.WORKER_PATH = 'qr-scanner-worker.min.js';
const scanner = new QrScanner(UI.scannerVideo, rawstring => {
	scanner.stop();

	// Do not attempt to vibrate on successful scan if the browser
	// lacks support for navigator.vibrate (e.g Safari)
	if ("vibrate" in navigator) {
		try {
			navigator.vibrate(200);
		}
		catch { 
			// There's nothing we can do if it fails ¯\_(ツ)_/¯
		}
	}

	UI.scanner.hidden = true;
	
	// Decode the DGC and display its content
	console.log(rawstring)
	loadDGCFromString(rawstring)
	.catch(err => {
		UI.showErrorMessage(err,"This is not an EU Digital COVID Certificate")
		UI.hideQRCanvas()
	});
});


// QR DECODER
//
// uses 2 libs for a better detection
// as QrScanner is faster than jsqr but can't detect some barcodes
// (mostly rotated and logoed qr-codes)
async function decode(imageDataUrl) {
	let decoded = null;
	// TODO: Experiment with a Promise.any() based fallback instead of try-catch
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
	try {
		decoded = await QrScanner.scanImage(imageDataUrl)
		return decoded;
	}
	catch { //fallback to the old qr decoder procedure if QrScanner fails
		console.info("QrScanner detection failed, falling back to jsqr")
		// create an image structure to get the image size (width, height)
		async function createImage(file) {
			return new Promise( (resolve, reject) => {
				if (!file) reject();
				let img = new Image()
				img.src = file;
				resolve(img) ;
			})
		}

		const img = await createImage(imageDataUrl);

		// Now we use a canvas to convert the dataurl image into an ImageData structure
		// This is needed to decode the QR code with jsQR 

		const canvas = UI.getQRCanvas()
		canvas.width = img.width;
		canvas.height = img.height;

		const context = canvas.getContext('2d')
		const imgdata = await imageDataUrlToImageData(img, context)

		decoded = jsqr(imgdata.data, imgdata.width, imgdata.height);
		
		if(decoded) return decoded.data;
		else throw Error("no QR-code detected")
	}
}


// Redraw QR 
function beautify(str, canvas) {
	const SIZE = 600;
	canvas.width = SIZE; 
	canvas.height = SIZE;

	// see https://github.com/soldair/node-qrcode

	const config = {
		errorCorrectionLevel: 'H',
		type: "image/png"
	}

	QRCode.toDataURL(str, config)
		.then(qr => {
			const img = new Image();
			img.src = qr;
			img.onload = () => {
				canvas.width = img.width;
				canvas.height = img.height;
				const context = canvas.getContext("2d");
				context.drawImage(img, 0, 0)
			}
		})
		.catch(err => {
			console.error("qr-code beautify",err)
		})

}






// Convert a Data URL image into an ImageData structure via the Canvas API
// See https://stackoverflow.com/questions/51869520/image-to-uint8array-in-javascript
async function imageDataUrlToImageData(image, context) {
	return new Promise((resolve, reject) => {
		context.width = image.width;
		context.height = image.height;
		context.drawImage(image, 0, 0);

		if (!context.width) {
			canvas.width = 300;
			canvas.height = 300;
			reject("not a valid image file");
			}

		resolve(context.getImageData(0,0,context.width, context.height));
	});
}
