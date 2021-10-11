import jsqr from 'jsqr';
import * as base45 from 'base45';
import * as zlib from 'pako';
import * as cbor from 'cbor';
import QRCode from "qrcode";
import QrScanner from "qr-scanner";

import {decodeValue, decodeDGCValues} from './valuedecoder'
import * as signature from './signature'
import * as UI from './UI'

console.log("😃✔️👍")



// UI FUNCTIONS


// DRAG & DROP
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


// FILE SELECTOR
// Repeat computation when user re-selects the same file
document.querySelector("#file-selector").addEventListener('click', event => {
	event.target.value = null;
});

// Load the image as a dataurl to get the correct image size.
// The ImageData constructor requires width and height
document.querySelector("#file-selector").addEventListener('change', event => {
	reader.readAsDataURL(event.target.files[0]);
});

// new FileReader object
let reader = new FileReader();

// event fired when file reading failed
reader.addEventListener('error', () => {
	alert('Error : Failed to read file');
});

// event fired when file reading finished
reader.addEventListener('load', async (e) => {
	UI.reset();

    // Read the file content
	let file = e.target.result;
	if (file.substr(0,10) != "data:image") return UI.showErrorMessage(Error("file is not an image"), "Cannot load this file")
	
	// Decode the DCC QR-code and process it
	//UI.scanner.hidden = true	
	let rawstring = null; 
	try {
		rawstring = await decodeQR(file)
		console.log(rawstring)
		
		// Decode the DGC and display its content
		loadDGCFromString(rawstring)
		.catch(err => {
			UI.showErrorMessage(err,"This is not an EU Digital COVID Certificate")
		});
	}
	catch(err) {
		UI.hideQRCanvas();
		UI.showErrorMessage(err, "This file doesn't contain a valid QR-code")
	}
	
});

async function loadDGCFromString(rawstring) {
	UI.showDecodedText(rawstring)
	const canvas = UI.getQRCanvas()
	beautifyQR(rawstring, canvas)
	UI.showQRCanvas();

	if (!rawstring) throw Error()
	if (rawstring.substring(0,4) !== "HC1:") throw Error("missing HC1 header")

	let decoded = await dgcDecode(rawstring);
	let json = decoded.json;


	// Signature Verification!
	let isAuthentic = await signature.verify(decoded.raw, decoded.kid)
	UI.displaySignatureResult(isAuthentic);


	// Display the Certificate content
	const text = JSON.stringify(json, null, 2)
	UI.displayRawHCERT(text)
	const hrDGC = decodeDGCValues(json)
	UI.displayDecodedHCERT(hrDGC);
}



// QR SCANNER
QrScanner.WORKER_PATH = 'qr-scanner-worker.min.js';
const qrScanner = new QrScanner(UI.scannerVideo, rawstring => {
	qrScanner.stop();
	navigator.vibrate(200);
	UI.scanner.hidden = true;
	
	// Decode the DGC and display its content
	console.log(rawstring)
	loadDGCFromString(rawstring)
	.catch(err => {
		UI.showErrorMessage(err,"This is not an EU Digital COVID Certificate")
	});
});

document.getElementById("start-scan").addEventListener("click", event => {
	UI.reset();
	UI.hideQRCanvas();
	UI.scanner.hidden = false;
	qrScanner.start()
	.catch(err => alert(err+"\nThe camera stream is only available on HTTPS"))
})


// FUNCTIONS


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

// QR DECODER
//
// uses 2 libs for better detection
// as QrScanner is faster than jsqr but can't detect some barcodes
// like rotated and logoed qr-codes
async function decodeQR(imageDataUrl) {
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

//
// Green Pass decoding
//

function dgcDecode(greenpassStr) {

	// Digital Covid Certificate structure:
	// [JSON Schema] ==> CBOR serialization ==> {headers; CBOR; COSE signature} => 
	// => zlib compression => base45 encoding => QR
	//
	// For more details, see Section 3 of:
	// https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_v1_en.pdf


	// Remove the "HC1:" heading
	const greenpassBody = greenpassStr.substr(4);

	// Decode the base45 representation
	const decodedData = base45.decode(greenpassBody);

	// Decompression (zlib)
	const cwt = zlib.inflate(decodedData);

	// Now we have the COSE message
	const results = cbor.decodeAllSync(cwt);
	const [protected_header, unprotected_header, cbor_data, signature] = results[0].value;

	// Extract the signature key identifier (KID) for signature validation
	let kid = cbor.decode(protected_header).get(4)
	if (kid) {
		kid = kid.reduce ( (str, v) => str + String.fromCharCode(v), "") //uint8array -> bstr
		kid = btoa(kid) //bstr -> base64
	}

	// Finally, we can decode the CBOR
	const hcert = cbor.decodeAllSync(cbor_data);
	const out = hcert[0].get(-260).get(1);

	return {raw: cwt, json: out, kid: kid};
}



// Redraw QR 
function beautifyQR(str, canvas) {
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
