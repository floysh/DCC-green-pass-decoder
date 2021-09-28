import jsqr from 'jsqr';
import * as base45 from 'base45';
import * as zlib from 'pako';
import * as cbor from 'cbor';
import QRCode from "qrcode";

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

   // contents of the file
	let file = e.target.result;
	if (file.substr(0,10) != "data:image") return UI.showErrorMessage(new Error("file is not an image"), "Cannot load this file")

	// create an image structure to get the image size (width, height)
	async function createImage(file) {
		return new Promise( (resolve, reject) => {
			if (!file) reject();
			let img = new Image()
			img.src = file;
			resolve(img) ;
		})
	}
	
	const img = await createImage(file);
	
	// Now we use a canvas to convert the dataurl image into an ImageData structure
	// This is needed to decode the QR code with jsQR 
	
	const canvas = UI.getQRCanvas()
	canvas.width = img.width;
	canvas.height = img.height;
	
	const context = canvas.getContext('2d')
	const imgdata = await imageDataUrlToImageData(img, context)
	
	// Decode the DCC Image to a JSON Schema
	try {
		let rawstring = await decodeQR(imgdata);
		
		if (rawstring.substring(0,4) !== "HC1:") throw Error("missing header in decoded text")
		console.log(rawstring)

		let decoded = await dgcDecode(rawstring);
		let json = decoded.json;


		beautifyQR(rawstring, canvas)
		UI.showQRCanvas();


		// Signature Verification!
		let isAuthentic = await signature.verify(decoded.raw, decoded.kid)
		UI.displaySignatureResult(isAuthentic);


		// Display the Certificate content
		const text = JSON.stringify(json, null, 2)
		UI.displayRawHCERT(text)
		const hrDGC = decodeDGCValues(json)
		UI.displayDecodedHCERT(hrDGC);

	}
	catch(err) {
		UI.showErrorMessage(err,"This is not an EU Digital COVID Certificate")
	}

});




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


//
// Green Pass decoding
//
async function decodeQR(greenpassImageData) {
	// Decode QR
	// BarcodeDetector is currently supported only by Chrome mobile and Samsung browser
	
	if (!('BarcodeDetector' in window)) {		
		const greenpass = jsqr(greenpassImageData.data, greenpassImageData.width, greenpassImageData.height);
		
		if(greenpass === null) throw Error("no QR code detected")

		return greenpass.data;
	} 
	else {
		const barcodeDetector = new BarcodeDetector({formats: ['qr_code']});
		
		const barcodes = await barcodeDetector.detect(greenpassImageData);
		
		if(barcodes.length < 1) throw Error("no QR code detected")
		console.log(barcodes[0])

		return ""+barcodes[0].rawValue;
	}
}

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
