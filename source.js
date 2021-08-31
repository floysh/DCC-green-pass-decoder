const jsqr = require('jsqr');
const base45 = require('base45');
const pako = require('pako');
const cbor = require('cbor');

console.log("😃✔️👍")

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
		document.querySelector("#hr-contents").textContent = textHR
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
	for (p of Object.keys(HR)) {
		switch (p) {
			case("Vaccine"):
				HR.Vaccine[0][schema.v[0]["tg"]] = "SARS-CoV-2";
				
				const vaccineprophilaxis = HR.Vaccine[0][schema.v[0]["vp"]];
				switch(vaccineprophilaxis) {
					case "1119305005":
						HR.Vaccine[0][schema.v[0]["vp"]] = "SARS-CoV-2 antigen vaccine";
						break;
					case "1119349007":
						HR.Vaccine[0][schema.v[0]["vp"]] = "SARS-CoV-2 mRNA vaccine";
						break;
					case "J07BX03":
						HR.Vaccine[0][schema.v[0]["vp"]] = "covid-19 vaccines";
						break;

					default:
						break;

				}
				
				const product = HR.Vaccine[0][schema.v[0]["mp"]];
				switch(product) {
					case "EU/1/20/1528": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "Comirnaty";
						break;
					case "EU/1/20/1507": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "COVID-19 Vaccine Moderna";
						break;
					case "EU/1/21/1529": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "Vaxzevria";
						break;
					case "EU/1/20/1525": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "COVID-19 Vaccine Janssen";
						break;
					case "CVnCoV": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "CVnCoV";
						break;
					case "Sputnik-V": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "Sputnik V";
						break;
					case "Convidecia": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "Convidecia";
						break;
					case "EpiVacCorona": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "EpiVacCorona";
						break;
					case "BBIBP-CorV": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "BBIBP-CorV";
						break;
					case "Inactivated-SARS-CoV-2-Vero-Cell": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "Inactivated-SARS-CoV-2 Vero-Cell)";
						break;
					case "CoronaVac": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "CoronaVac";
						break;
					case "Covaxin": 
						HR.Vaccine[0][schema.v[0]["mp"]] = "Covaxin (also known as BBV152 A, B, C)";
						break;
					default: break;
				}

				const manufacturer = HR.Vaccine[0][schema.v[0]["ma"]];
				switch(manufacturer) {
					case "ORG-100001699":
						HR.Vaccine[0][schema.v[0]["ma"]] = "AstraZeneca AB";
						break;
					case "ORG-100030215":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Biontech Manufacturing GmbH";
						break;
					case "ORG-100001417":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Janssen-Cilag International";
						break;
					case "ORG-100031184":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Moderna Biotech Spain S.L.";
						break;
					case "ORG-100006270":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Curevac AG";
						break;
					case "ORG-100013793":
						HR.Vaccine[0][schema.v[0]["ma"]] = "CanSino Biologics";
						break;
					case "ORG-100020693":
						HR.Vaccine[0][schema.v[0]["ma"]] = "China Sinopharm International Corp. - Beijing location";
						break;
					case "ORG-100010771":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Sinopharm Weiqida Europe Pharmaceutical s.r.o. - Prague location";
						break;
					case "ORG-100024420":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Sinopharm Zhijun (Shenzhen) Pharmaceutical Co. Ltd. - Shenzhen";
						break;
					case "ORG-100032020":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Novavax CZ AS";
						break;
					case "Gamaleya-Research-Institute":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Gamaleya Research Institute";
						break;
					case "Vector-Institute":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Vector Institute";
						break;
					case "Sinovac-Biotech":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Sinovac Biotech";
						break;
					case "Bharat-Biotech":
						HR.Vaccine[0][schema.v[0]["ma"]] = "Bharat Biotech";
						break;
					default:
						break;
				}
				// END of Vaccine tag
				break;

			case("Recovery"):
				HR.Recovery[0][schema.r[0]["tg"]] = "SARS-CoV-2"

				HR.Recovery[0][schema.r[0]["du"]] = dateFormat(HR.Recovery[0][schema.r[0]["du"]]);
				HR.Recovery[0][schema.r[0]["df"]] = dateFormat(HR.Recovery[0][schema.r[0]["df"]]);
				HR.Recovery[0][schema.r[0]["fr"]] = dateFormat(HR.Recovery[0][schema.r[0]["fr"]]);


				// END of RECOVERY field
				break;

			case("Test"):
				HR.Test[0][schema.t[0]["tg"]] = "SARS-CoV-2";

				const typeoftest = HR.Test[0][ schema.t[0]["tt"] ];
				switch(typeoftest) {
					case "LP6464-4":
						HR.Test[0][schema.t[0]["tt"]] = "Nucleic acid amplification with probe detection";
						break;
					case "LP217198-3":
						HR.Test[0][schema.t[0]["tt"]] = "Rapid immunoassay";
						break;
					default: break;					
				}

				const RATmanufacturer = HR.Test[0][schema.t[0]["ma"]];
				// TODO: function to parse this database
				//https://covid-19-diagnostics.jrc.ec.europa.eu/devices/hsc-common-recognition-rat
				HR.Test[0][schema.t[0]["ma"]] = decodeRATManufacturer(HR.Test[0][schema.t[0]["ma"]])

				const testResult = HR.Test[0][schema.t[0]["tr"]];
				switch(testResult) {
					case "260415000":
						HR.Test[0][schema.t[0]["tr"]] = "Not detected";
						break;
					case "260373001":
						HR.Test[0][schema.t[0]["tr"]] = "Detected";
						break;
					default : break;
				}

				// Dates
				HR.Test[0][schema.t[0]["sc"]] = dateFormat(HR.Test[0][schema.t[0]["sc"]]);
				HR.Test[0][schema.t[0]["dr"]] = dateFormat(HR.Test[0][schema.t[0]["dr"]]);


				break;

			default:break
		}
	}

		return HR;
	
}




function decodeRATManufacturer(id) {
	// Note that the official endpoint of RAT devices doesn't allow CORS
	// https://covid-19-diagnostics.jrc.ec.europa.eu/devices/hsc-common-recognition-rat
	// So we use a local copy instead 

	const RATDB = require("./hsc-common-recognition-rat.json")
	
	//RATDB.deviceList.forEach(elem => {
	for (let elem of RATDB.deviceList) {
		if (elem.id_device === id) {
			return `${elem.commercial_name} - ${elem.manufacturer.name} (${elem.manufacturer.country})`;
		}
	}
	// If this instruction is reached, the id is not in the DB
	return id;

}


function dateFormat(dateStr) {
	const locale = (navigator.language) ? navigator.language : "en";

	/* return Intl.DateTimeFormat(locale, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	  }).format(new Date("2021-05-03T10:27:15Z")) ; */
	const date = new Date(dateStr);
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}