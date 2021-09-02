const jsqr = require('jsqr');
const base45 = require('base45');
const pako = require('pako');
const cbor = require('cbor');

console.log("😃✔️👍")

/* UI FUNCTIONS */

window.addEventListener("load", () => {
	const toggle = document.querySelector("#dgcHumanReadable");
	document.querySelector("#dgc-code").hidden = toggle.checked;
	document.querySelector("#dgc-hr").hidden = !(toggle.checked);
});


function resetUI() {
	const dgcform = document.getElementsByClassName("dgc input");
	for (elem of dgcform) elem.value = null;

	document.getElementById("dgc-json").innerText = "";
	document.getElementById("error-bar").hidden = true;
	document.getElementById("qr-decoded-content").innerText = "";

	document.getElementById("cert-type").innerText = "";
	document.getElementById("vaccination-group").hidden = true;
	document.getElementById("recovery-group").hidden = true;
	document.getElementById("test-group").hidden = true;

}


// new FileReader object
let reader = new FileReader();

// event fired when file reading failed
reader.addEventListener('error', () => {
	alert('Error : Failed to read file');
});


// event fired when file reading finished
reader.addEventListener('load', async (e) => {
	resetUI();

   // contents of the file
	let file = e.target.result;
	
	if(file.substr(0,10) != "data:image") return errorHandler("not an image", "Cannot load this file")

	document.querySelector("#dgc-json").textContent = file;

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
	
	const canvas = document.querySelector("#qr-canvas")
	canvas.width = img.width;
	canvas.height = img.height;
	
	const context = canvas.getContext('2d')
	const imgdata = await imageDataUrlToImageData(img, context)
	
	// Decode the DCC Image to a JSON Schema
	try {
		let rawstring = await decodeQR(imgdata);
		document.getElementById("qr-decoded-content").innerText = rawstring;
		
		if (rawstring.substring(0,4) !== "HC1:") throw "missing header in decoded text"
		console.log(rawstring)

		let json = await dgcDecode(rawstring);
		const text = JSON.stringify(json, null, 2)
		document.querySelector("#dgc-json").textContent = text
		
		displayDecodedData(json);
	}
	catch(err) {
		errorHandler(err,"This is not an EU Digital COVID Certificate")
	}
});

function errorHandler(err,err_header) {
	console.warn("NOT A DGC: "+err)
	// Show error message
	const errtext = err_header+"\nError: "+err;
	document.querySelector("#dgc-json").textContent = errtext;
	document.querySelector("#error-text").textContent = err;
	document.querySelector("#error-bar").hidden = false;
}


document.querySelector("#file-selector").addEventListener('change', event => {
	// Load the image as a dataurl to get the correct image size.
	// The ImageData constructor requires width and height
	reader.readAsDataURL(event.target.files[0]);
});


// TOGGLE
document.querySelector("#dgcHumanReadable").addEventListener("click", event => {
	const toggle = event.target;
	document.querySelector("#dgc-code").hidden = toggle.checked;
	document.querySelector("#dgc-hr").hidden = !(toggle.checked);
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
		
		if(greenpass === null) throw "no QR code detected"

		return greenpass.data;
	} 
	else {
		const barcodeDetector = new BarcodeDetector({formats: ['qr_code']});
		
		const barcodes = await barcodeDetector.detect(greenpassImageData);
		
		if(barcodes.length < 1) throw "no QR code detected"
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
	const output = pako.inflate(decodedData);

	// Finally, we can decode the CBOR
	const results = cbor.decodeAllSync(output);

	[headers1, headers2, cbor_data, cose_signature] = results[0].value;

	const greenpassJSON = cbor.decodeAllSync(cbor_data);

	//console.log(greenpassJSON);

	let out = greenpassJSON[0].get(-260).get(1);
	//console.log(out);
	return out;
}




//
// Replace the DGC field values with ruman readable strings 
// from the authoritative value sets
//
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
	})

	Promise.all(promises).then(() => {
		valueSetsLoaded = true;
	})
}

window.addEventListener("load", loadValueSets());


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


// Old value decoding (text)
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

	
	// Decode the values
	// https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_dt-specifications_en.pdf
	let HR = dgcDecodeValues(schema)
	
	// Decode the keys
	// See: https://github.com/ehn-dcc-development/ehn-dcc-schema
	HR = dgcDecodeKeys(schema, HR)

	return HR;
}

function dgcDecodeKeys(schema, greenpassJSON) {
	const HR = {};
	for (p of Object.keys(greenpassJSON)) {

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
	return HR;
}


function dgcDecodeValues(greenpassJSON) {
	// Decode the values
	// https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_dt-specifications_en.pdf

	let fields = [];
	for (key of Object.keys(greenpassJSON)) {
		switch (key) {
			case("v"):
				greenpassJSON.v[0]["co"] = decodeValue("country-codes", greenpassJSON.v[0]["co"]);
				greenpassJSON.v[0]["tg"] = decodeValue("disease-agent-targeted", greenpassJSON.v[0]["tg"]);
				
				greenpassJSON.v[0]["mp"] = decodeValue("vaccine-medicinal-product", greenpassJSON.v[0]["mp"]);
				greenpassJSON.v[0]["ma"] = decodeValue("vaccine-mah-manf", greenpassJSON.v[0]["ma"]);
				greenpassJSON.v[0]["vp"] = decodeValue("vaccine-prophilaxis", greenpassJSON.v[0]["vp"]);

				break;
			
			case("r"):
				greenpassJSON.r[0]["co"] = decodeValue("country-codes", greenpassJSON.r[0]["co"]);
				greenpassJSON.r[0]["tg"] = decodeValue("disease-agent-targeted", greenpassJSON.r[0]["tg"]);

				break;
			
			case("t"):
				greenpassJSON.t[0]["co"] = decodeValue("country-codes", greenpassJSON.t[0]["co"]);
				greenpassJSON.t[0]["tg"] = decodeValue("disease-agent-targeted", greenpassJSON.t[0]["tg"]);
				
				greenpassJSON.t[0]["ma"] = decodeValue("test-manf", greenpassJSON.t[0]["ma"]);
				greenpassJSON.t[0]["tt"] = decodeValue("test-type", greenpassJSON.t[0]["tt"]);
				greenpassJSON.t[0]["tr"] = decodeValue("test-result", greenpassJSON.t[0]["tr"]);

				// Dates
				greenpassJSON.t[0]["sc"] = dateFormat(greenpassJSON.t[0]["sc"]);
				greenpassJSON.t[0]["dr"] = dateFormat(greenpassJSON.t[0]["dr"]);
				
				break;
		
			default: break;
		}
	}
	return greenpassJSON;
}


function displayDecodedData(greenpassJSON) {
	// see 
	// https://github.com/ehn-dcc-development/ehn-dcc-schema

	const schema = {
		nam : {
			fnt : {field_id: "fnt", decoder: null},
			fn : {field_id: "fn", decoder: null},
			gnt : {field_id: "gnt", decoder: null},
			gn : {field_id: "gn", decoder: null},
			},
		ver : {field_id: "ver", decoder: null},
		dob : {field_id: "dob", decoder: null}
	}

	const vaccineSchema = [
		{
			dn : {field_id: "v-dn-sd", decoder: () => {return `${greenpassJSON.v[0].dn} / ${greenpassJSON.v[0].sd}`}},
			ma : {field_id: "v-ma", decoder: "vaccine-mah-manf"},
			vp : {field_id: "v-vp", decoder: "vaccine-prophilaxis"},
			dt : {field_id: "v-dt", decoder: null},
			co : {field_id: "v-co", decoder: "country-codes"},
			ci : {field_id: "v-ci", decoder: null},
			mp : {field_id: "v-mp", decoder: "vaccine-medicinal-product"},
			is : {field_id: "v-is", decoder: null},
			sd : {field_id: "v-dn-sd", decoder: () => {return `${greenpassJSON.v[0].dn} / ${greenpassJSON.v[0].sd}`}},
			tg : {field_id: "v-tg", decoder: "disease-agent-targeted"},
		}
	];
	const recoverySchema = [
		{
			du : {field_id: "r-du", decoder: null},
			co : {field_id: "r-co", decoder: "country-codes"},
			ci : {field_id: "r-ci", decoder: null},
			is : {field_id: "r-is", decoder: null},
			tg : {field_id: "r-tg", decoder: "disease-agent-targeted"},
			df : {field_id: "r-df", decoder: null},
			fr : {field_id: "r-fr", decoder: null}
		}
	];
	const testSchema = [
		{
			sc : {field_id: "t-sc", decoder: dateFormat},
			ma : {field_id: "t-ma", decoder: "test-manf"},
			dr : {field_id: "t-dr", decoder: dateFormat},
			tt : {field_id: "t-tt", decoder: "test-type"},
			nm : {field_id: "t-nm", decoder: null},
			co : {field_id: "t-co", decoder: "country-codes"},
			tc : {field_id: "t-tc", decoder: null},
			ci : {field_id: "t-ci", decoder: null},
			is : {field_id: "t-is", decoder: null},
			tg : {field_id: "t-tg", decoder: "disease-agent-targeted"},
			tr : {field_id: "t-tr", decoder: "test-result"},
		}
	];

	const vgroup = document.getElementById("vaccination-group");
	const rgroup = document.getElementById("recovery-group");
	const tgroup = document.getElementById("test-group");

	const cert_type = document.getElementById("cert-type")

	if (greenpassJSON["v"]) {
		schema.v = vaccineSchema;
		vgroup.hidden = false;
		cert_type.innerText = "Vaccination"
	}
	else if (greenpassJSON["r"]) {
		schema.r = recoverySchema;
		rgroup.hidden = false;
		cert_type.innerText = "Recovery"
	}
	else if (greenpassJSON["t"]) {
		schema.t = testSchema;
		tgroup.hidden = false;
		cert_type.innerText = "Test"
	}
	else throw "certificate type not recognized";

	document.getElementById("ver").innerText = greenpassJSON.ver;
	
	
	// Decode the values before displaying them
	// https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_dt-specifications_en.pdf

	for (p of Object.keys(greenpassJSON)) {
		let group = null;
		let schemagroup = null;
		switch (p) {
			case("v"):
			case("r"):
			case("t"):
				group = greenpassJSON[p][0]
				schemagroup = schema[p][0]
				//console.log(greenpassJSON[p][0])

				for (prop of Object.keys(group)) {
					//console.log(prop)
					let textbox = document.getElementById(schemagroup[prop].field_id)
					const decoder = schemagroup[prop].decoder;
					
					if (decoder) {
						if (typeof decoder === "function") {
							textbox.value = decoder(group[prop]);
						}
						else if (typeof decoder === "string") {
							textbox.value = decodeValue(decoder, group[prop]);
						}
					}
					else {
						textbox.value = group[prop];
					}
				}
				break;

			case("nam"):
				group = greenpassJSON[p]
				schemagroup = schema[p]

				for (prop of Object.keys(group)) {
					let textbox = document.getElementById(schemagroup[prop].field_id)
					const decoder = schemagroup[prop].decoder;
					
					if (decoder) {
						if (typeof decoder === "function") {
							textbox.value = decoder(group[prop]);
						}
						else if (typeof decoder === "string") {
							textbox.value = decodeValue(decoder, group[prop]);
						}
					}
					else {
						textbox.value = group[prop];
					}
				}
				break;

			case "dob":
			case "ver":
				document.getElementById(schema[p].field_id).value = greenpassJSON[p]

			default: break;
		}
	}

}






function dateFormat(dateStr) {
	const locale = (navigator.language) ? navigator.language : "en";

	const date = new Date(dateStr);
	return Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'long' }).format(date);
}