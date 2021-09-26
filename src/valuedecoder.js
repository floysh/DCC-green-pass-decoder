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


export function decodeValue(valueType, id) {
	const valueSet = valueSets[valueType].json;
	if (!valueSet) {
		console.warn("ValueSets not loaded for: "+id)
		return id;
	}
	else {
		return (valueSet.valueSetValues[id]) ? valueSet.valueSetValues[id].display : id;
	}
}


export function decodeDGCValues(greenpassJSON) {
    // see 
	// https://github.com/ehn-dcc-development/ehn-dcc-schema

	const schema = {
		nam : {
			fnt : {description: "Standardised name(s)", decoder: null},
			fn : {description: "Name(s)", decoder: null},
			gnt : {description: "Standardised surname(s)", decoder: null},
			gn : {description: "Surname(s)", decoder: null},
			},
		ver : {description: "Schema version", decoder: null},
		dob : {description: "Date of birth", decoder: null}
	}

	const vaccineSchema = [
		{
			dn : {description: "Dose number", decoder: null},
			ma : {description: "Vaccine manufacturer or Marketing Authorization Holder", decoder: "vaccine-mah-manf"},
			vp : {description: "Vaccine or prophilaxis", decoder: "vaccine-prophilaxis"},
			dt : {description: "Date of vaccination", decoder: null},
			co : {description: "Country of vaccination", decoder: "country-codes"},
			ci : {description: "Unique certificate identifier (UVCI)", decoder: null},
			mp : {description: "Vaccine or medicinal product", decoder: "vaccine-medicinal-product"},
			is : {description: "Certificate issuer", decoder: null},
			sd : {description: "Total series of doses", decoder: null},
			tg : {description: "Disease or agent targeted", decoder: "disease-agent-targeted"},
		}
	];
	const recoverySchema = [
		{
			du : {description: "Certificate valid until", field_id: "r-du", decoder: null},
			co : {description: "Country", field_id: "r-co", decoder: "country-codes"},
			ci : {description: "Unique certificate identifier (UVCI)", field_id: "r-ci", decoder: null},
			is : {description: "Certificate issuer", field_id: "r-is", decoder: null},
			tg : {description: "Disease or agent targeted", field_id: "r-tg", decoder: "disease-agent-targeted"},
			df : {description: "Certificate valid from", field_id: "r-df", decoder: null},
			fr : {description: "Date of first positive NAA test result", field_id: "r-fr", decoder: null}
		}
	];
	const testSchema = [
		{
			sc : {description: "Date and time of sample collection", field_id: "t-sc", decoder: dateFormat},
			ma : {description: "RAT test name and manufacturer", field_id: "t-ma", decoder: "test-manf"},
			dr : {description: "Date and time of test result", field_id: "t-dr", decoder: dateFormat},
			tt : {description: "Type of Test", field_id: "t-tt", decoder: "test-type"},
			nm : {description: "Nucleic acid amplification test name", field_id: "t-nm", decoder: null},
			co : {description: "Country of test", field_id: "t-co", decoder: "country-codes"},
			tc : {description: "Testing centre", field_id: "t-tc", decoder: null},
			ci : {description: "Unique certificate identifier (UVCI)", field_id: "t-ci", decoder: null},
			is : {description: "Certificate issuer", field_id: "t-is", decoder: null},
			tg : {description: "Disease or agent targeted", field_id: "t-tg", decoder: "disease-agent-targeted"},
			tr : {description: "Test result", field_id: "t-tr", decoder: "test-result"},
		}
	];

	if (greenpassJSON["v"]) {
		schema.v = vaccineSchema;
	}
	else if (greenpassJSON["r"]) {
		schema.r = recoverySchema;
	}
	else if (greenpassJSON["t"]) {
		schema.t = testSchema;
	}
	else throw Error("unknown certificate type");
	
	
	// Decode the values before displaying them
	// https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_dt-specifications_en.pdf

	for (let g of Object.keys(greenpassJSON)) {
		let group = null;
		let schemagroup = null;
		switch (g) {
			case("v"):
			case("r"):
			case("t"):
				group = greenpassJSON[g][0]
				schemagroup = schema[g][0]
				//console.log(greenpassJSON[p][0])

				for (let prop of Object.keys(group)) {
					//console.log(prop)
					const json = schemagroup[prop];
					const decoder = schemagroup[prop].decoder;
					
					if (decoder) {
						if (typeof decoder === "function") {
							json.value = decoder(group[prop]);
						}
						else if (typeof decoder === "string") {
							json.value = decodeValue(decoder, group[prop]);
						}
					}
					else {
						json.value = group[prop];
					}
				}
				break;

			case("nam"):
				group = greenpassJSON[g]
				schemagroup = schema[g]

				for (let prop of Object.keys(group)) {
                    let json = schemagroup[prop]
					const decoder = schemagroup[prop].decoder;
					
					if (decoder) {
						if (typeof decoder === "function") {
							json.value = decoder(group[prop]);
						}
						else if (typeof decoder === "string") {
							json.value = decodeValue(decoder, group[prop]);
						}
					}
					else {
						json.value = group[prop];
					}
				}
				break;

			case "dob":
			case "ver":
                let json = schema[g]
                json.value = greenpassJSON[g]

			default: break;
		}
	}
    
    return schema
}



export default {decodeValue}



function dateFormat(dateStr) {
	const locale = (navigator.language) ? navigator.language : "en";

	const date = new Date(dateStr);
	return Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'long' }).format(date);
}