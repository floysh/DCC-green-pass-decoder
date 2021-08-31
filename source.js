const jsqr = require('jsqr');
const base45 = require('base45');
const pako = require('pako');
const cbor = require('cbor');

console.log("😃✔️👍")


const valueSets = {
	"test-manf" : {
		abbr: "ma",
		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/test-manf.json",
		json: null
	},
	"country-codes": {
		abbr: "co",
		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/country-2-codes.json",
		json: null
	},
	"disease-agent-targeted": {
		abbr: "tg",
		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/disease-agent-targeted.json",
		json: null
	},
	"test-result": {
		abbr: "tr",
		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/test-result.json",
		json: null
	},
	"test-type": {
		abbr: "tt",
		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/test-type.json",
		json: null
	},
	"vaccine-mah-manf": {
		abbr: "ma",
		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/vaccine-mah-manf.json",
		json: null
	},
	"vaccine-medicinal-product": {
		abbr: "mp",
		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/vaccine-medicinal-product.json",
		json: null
	},
	"vaccine-prophilaxis": {
		abbr: "vp",
		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/vaccine-prophylaxis.json",
		json: null
	}
}

let valueSetsLoaded = false;

function decodeValue(valueType, id) {
	const valueSet = valueSets[valueType].json;
	if (!valueSet) {
		console.warn("ValueSets not loaded for: "+id)
		return id;
	}
	else {
		return (valueSet.valueSetValues[id]) ? valueSet.valueSetValues[id].display : id;
	}
}

function loadValueSets() {
	// Load the valuesets
	const promises = []
	Object.keys(valueSets).forEach( k => {
		const elem = valueSets[k];
		promises.push(
			fetch(elem.url)
			.then(res => res.json())
			.then(json => elem.json = json)
		)
		//console.log(elem.url)
	})

	Promise.all(promises).then(() => {
		//console.log(valueSets);
		//console.log(decodeValue("test-manf","8545"))
		valueSetsLoaded = true;
	})
}

window.addEventListener("load", loadValueSets());




// new FileReader object
let reader = new FileReader();

// event fired when file reading failed
reader.addEventListener('error', () => {
	alert('Error : Failed to read file');
});


// event fired when file reading finished
reader.addEventListener('load', async (e) => {
   // contents of the file
	let file = e.target.result;
	//console.log(e.target.result)
	
	//console.log(file)
	document.querySelector("#contents").textContent = file;

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
	//console.log(img)
	//document.querySelector('#qr-preview').src = file
	//console.log(width+" "+height)
	
	// Now we use a canvas to convert the dataurl image into an ImageData structure
	// This is needed to decode the QR code with jsQR 
	const canvas = document.querySelector("#qr-canvas")
	//const canvas = document.createElement("canvas")
	canvas.width = img.width;
	canvas.height = img.height;
	const context = canvas.getContext('2d')
	
	try {
		const imgdata = await imageDataUrlToImageData(img, context)
		let json = await dgcDecodeQR(imgdata);
		//console.log(json)
		//console.log(json)
		const text = JSON.stringify(json, null, 2)
		document.querySelector("#contents").textContent = text
		
		
		const jsonHR= dgcHumanReadable(json);
		const textHR = JSON.stringify(jsonHR, null, 2)
		document.querySelector("#hr-contents").textContent = textHR.replace(/"",/g, "(not specified)").replace(/",/g, "").replace(/"/g, "")
	}
	catch(err) {
		console.warn("NOT A DGC: "+err)
		//console.log(typeof e)
		//console.log(e)
		// Show error message
		const errtext = "This is not a Digital Green Certificate\nError: "+err;
		document.querySelector("#contents").textContent = errtext;
		document.querySelector("#hr-contents").textContent = errtext;
	}
});


document.querySelector("#file-selector").addEventListener('change', event => {
	// Load the image as a dataurl to get the correct image size.
	// The ImageData constructor requires width and height
	reader.readAsDataURL(event.target.files[0]);
});


// TOGGLE
document.querySelector("#dgcHumanReadable").addEventListener("click", () => {
	const toggle = document.querySelector("#dgcHumanReadable");
	if (toggle.checked) {
		document.querySelector("#hr-contents").hidden = false;
		document.querySelector("#contents").hidden = true;
	}
	else {
		document.querySelector("#hr-contents").hidden = true;
		document.querySelector("#contents").hidden = false;
	}
})



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
  //console.log(fileList);
  reader.readAsDataURL(fileList[0]);
});





// FUNCTIONS


// Convert a Data URL image into an ImageData structure via the Canvas API
// See https://stackoverflow.com/questions/51869520/image-to-uint8array-in-javascript
function imageDataUrlToImageData(image) {
	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d");
	return imageDataUrlToImageData(image, context);
			  }

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
		
		/* context.canvas.toBlob(blob => blob.arrayBuffer()
		.then(buffer => resolve(new Uint8ClampedArray(buffer))).catch(reject)
		) */
});
	}


//
// Green Pass decoding
//
async function dgcDecodeQR(greenpassImageData) {
	// Decode QR
	// BarcodeDetector is currently supported only by Chrome mobile and Samsung browser
	
	if (!('BarcodeDetector' in window)) {
		console.log('Barcode Detector is not supported by this browser.');
		
		const greenpass = jsqr(greenpassImageData.data, greenpassImageData.width, greenpassImageData.height);
		
		if(greenpass === null) throw "no QR code detected"
		if (greenpass.data.substr(0,4) !== "HC1:") throw `the decoded string\n"${greenpass.data}"\nis missing the HC1 header`

		return dgcDecode(greenpass.data);
	} 
	else {
		console.log('Barcode Detector supported!');

		const barcodeDetector = new BarcodeDetector({formats: ['qr_code']});
		
		const barcodes = await barcodeDetector.detect(greenpassImageData);

		
		if(barcodes.length < 1) throw "no QR code detected"
		console.log(barcodes[0])

		return dgcDecode(""+barcodes[0].rawValue);
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
	const output = pako.inflate(decodedData);

	// Finally, we can decode the CBOR
	const results = cbor.decodeAllSync(output);
	//console.log(results);

	[headers1, headers2, cbor_data, cose_signature] = results[0].value;
	/* console.log(headers1);
	console.log(headers2);
	console.log(cbor_data);
	console.log(cose_signature); */

	const greenpassJSON = cbor.decodeAllSync(cbor_data);

	//console.log(greenpassJSON);

	let out = greenpassJSON[0].get(-260).get(1);
	//console.log(out);
	return out;
}




//
// Replace the DGC fields and minified keys with
// their actual meaning
//
function dgcHumanReadable(greenpassJSON) {
	// see 
	// https://github.com/ehn-dcc-development/ehn-dcc-schema

	const vaccineSchema = {
		v: [
				{
				dn : "Dose number",
				ma : "Manufacturer",
				vp : "Vaccine or prophilaxis",
				dt : "Date of Vaccination",
				co : "Country of vaccination",
				ci : "Unique Certificate Identifier",
				mp : "Vaccine medicinal product",
				is : "Certificate Issuer",
				sd : "Total Series of Doses",
				tg : "Disease or Agent Targeted"
				}
			],
		nam : {
			fnt : "Standardized surname(s)",
			fn : "Surname(s)",
			gnt : "Standardized name(s)",
			gn : "Name(s)"
			},
		ver : "Schema Version",
		dob : "Date of Birth"
	};
	const recoverySchema = {
		r: [
			{
				du : "Certificate Valid Until",
				co : "Country of Test",
				ci : "Unique Certificate Identifier",
				is : "Certficate Issuer",
				tg : "Disease or Agent Targeted",
				df : "Certificate Valid From",
				fr : "Date of First positive NAA test result"
		}
		],
		nam : {
			fnt : "Standardized surname(s)",
			fn : "Surname(s)",
			gnt : "Standardized name(s)",
			gn : "Name(s)"
		},
		ver : "Schema Version",
		dob : "Date of Birth"
	};
	const testSchema = {
		t: [
				{
				sc : "Date/Time of Sample Collection",
				ma : "RAT Test name and manufacturer",
				dr : "Date of Result",
				tt : "Type of Test",
				nm : "NAA Test Name",
				co : "Country of Test",
				tc : "Testing Centre",
				ci : "Unique Certificate Identifier",
				is : "Certificate Issuer",
				tg : "Disease or Agent Targeted",
				tr : "Test Result",
				}
			],
		nam : {
			fnt : "Standardized surname(s)",
			fn : "Surname(s)",
			gnt : "Standardized name(s)",
			gn : "Name(s)"
			},
		ver : "Schema Version",
		dob : "Date of Birth"
	};

	let schema = null;
	if (greenpassJSON["v"]) {
		//Vaccine
		schema = vaccineSchema;
		}
	else if (greenpassJSON["r"]) {
		// Recovery
		schema = recoverySchema;
	}
	else if (greenpassJSON["t"]) {
		// Test
		schema = testSchema;
	}

	// if(schema === null) throw "invalid schema"

	// Decode the keys
	// See: https://github.com/ehn-dcc-development/ehn-dcc-schema
	const HR = {};
	//console.log(greenpassJSON)
	for (p of Object.keys(greenpassJSON)) {
		//console.log(p)

		switch(p) {
			case "v":
				HR.Vaccine = [{}];
				for (pp of Object.keys(greenpassJSON.v[0])) {
					//console.log("\t"+pp+": "+schema.v[0][pp])
					HR.Vaccine[0][schema.v[0][pp]] = greenpassJSON.v[0][pp]
				}
				break;
			case "r":
				HR.Recovery = [{}];
				for (pp of Object.keys(greenpassJSON.r[0])) {
					HR.Recovery[0][schema.r[0][pp]] = greenpassJSON.r[0][pp]
				}
				break;
			case "t":
				HR.Test = [{}];
				for (pp of Object.keys(greenpassJSON.t[0])) {
					HR.Test[0][schema.t[0][pp]] = greenpassJSON.t[0][pp]
				}
				break;

			case "nam":
				HR.Name = {};
				for (pp of Object.keys(greenpassJSON.nam))
					HR.Name[schema.nam[pp]] = greenpassJSON.nam[pp]
				break;
			case "ver":
				HR[schema[p]] = greenpassJSON[p]
				break;
			case "dob":
				HR[schema[p]] = greenpassJSON[p]
				break;
			default:
				console.warn(p);
				//throw "Invalid field: "+p
				break;
				}
		}


	// Decode the values
	// https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_dt-specifications_en.pdf
	let fields = [];
	for (p of Object.keys(HR)) {
		switch (p) {
			case("Vaccine"):
				//const obj = HR.Vaccine[0]
				fields = schema.v[0]
				HR.Vaccine[0][fields["co"]] = decodeValue("country-codes", HR.Vaccine[0][fields["co"]]);
				HR.Vaccine[0][fields["tg"]] = decodeValue("disease-agent-targeted", HR.Vaccine[0][fields["tg"]]);
				
				HR.Vaccine[0][fields["mp"]] = decodeValue("vaccine-medicinal-product", HR.Vaccine[0][fields["mp"]]);
				HR.Vaccine[0][fields["ma"]] = decodeValue("vaccine-mah-manf", HR.Vaccine[0][fields["ma"]]);
				HR.Vaccine[0][fields["vp"]] = decodeValue("vaccine-prophilaxis", HR.Vaccine[0][fields["vp"]]);

				break;
			
			case("Recovery"):
				fields = schema.r[0];
				HR.Recovery[0][fields["co"]] = decodeValue("country-codes", HR.Recovery[0][fields["co"]]);
				HR.Recovery[0][fields["tg"]] = decodeValue("disease-agent-targeted", HR.Recovery[0][fields["tg"]]);

				break;
			
			case("Test"):
				fields = schema.t[0];
				HR.Test[0][fields["co"]] = decodeValue("country-codes", HR.Test[0][fields["co"]]);
				HR.Test[0][fields["tg"]] = decodeValue("disease-agent-targeted", HR.Test[0][fields["tg"]]);
				
				HR.Test[0][fields["ma"]] = decodeValue("test-manf", HR.Test[0][fields["ma"]]);
				HR.Test[0][fields["tt"]] = decodeValue("test-type", HR.Test[0][fields["tt"]]);
				HR.Test[0][fields["tr"]] = decodeValue("test-result", HR.Test[0][fields["tr"]]);

				// Dates
				HR.Test[0][fields["sc"]] = dateFormat(HR.Test[0][fields["sc"]]);
				HR.Test[0][fields["dr"]] = dateFormat(HR.Test[0][fields["dr"]]);
				
				break;
		
			default: break;
		}
	}

	return HR;
}


function dateFormat(dateStr) {
	const locale = (navigator.language) ? navigator.language : "en";

	const date = new Date(dateStr);
	return Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'long' }).format(date);
}