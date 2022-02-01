import * as base45 from 'base45';
import * as zlib from 'pako';
import * as cbor from 'cbor';

export class EUGreenCertificate {
    encodedText = ""
    raw  = null;
    data = {};

    constructor(greenpassStr) {
        // Digital Covid Certificate structure:
        // [JSON Schema] ==> CBOR serialization ==> {headers; CBOR; COSE signature} => 
        // => zlib compression => base45 encoding => QR
        //
        // For more details, see Section 3 of:
        // https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_v1_en.pdf

	    if (greenpassStr.substring(0,4) !== "HC1:") throw Error("missing HC1 header")

        // Remove the "HC1:" heading
        const greenpassBody = greenpassStr.substr(4);

        // Decode the base45 representation
        const decodedData = base45.decode(greenpassBody);

        // Decompression (zlib)
        const cwt = zlib.inflate(decodedData);

        // Now we have the COSE message
        const results = cbor.decodeAllSync(cwt);
        const [protected_header, unprotected_header, payload, signature] = results[0].value;

        this.data = {
            header1: cbor.decodeAllSync(protected_header),
            header2: unprotected_header,
            payload: cbor.decodeAllSync(payload),
            signature: signature
        }
        
        this.raw = cwt
        this.encodedText = greenpassStr
    }

    getRawCwt() { return this.raw; }

    getEncodedString() { return this.encodedText; }


    getKid() {
        let kid = null;
        kid = this.data.header1[0].get(4)
        if (!kid) {
            kid = this.data.header2.get(4)
            if (!kid) throw Error("no kid in headers")
        }
        kid = kid.reduce ( (str, v) => str + String.fromCharCode(v), "") //uint8array -> bstr
	    kid = btoa(kid) //bstr -> base64
        return kid;
    }

    getSignAlgorithm() {
        return this.data.header1[0].get(1)
    }

    getHCertJson() {
        const payload = this.data.payload[0]
        if (payload instanceof Map)
            return payload.get(-260).get(1)
        else 
            return payload[-260][1]
    }


    toRawJSON() {
        function map2json(map) {
            return Array.from(map).reduce((acc, [key, value]) => {
                if (value instanceof Uint8Array) {
                    acc[key] = value.data;
                }
                else if (value instanceof Map) {
                    acc[key] = map2json(value);
                } else {
                    acc[key] = value;
                }
        
                return acc;
            }, {})
        }

        let header1 = map2json(this.data.header1[0]);
        let header2 = map2json(this.data.header2);
        let payload = (this.data.payload[0] instanceof Map) ? map2json(this.data.payload[0]) : this.data.payload[0];
        let signature = this.data.signature.reduce ( (str, v) => str + " " + v, "");
        //let signature = JSON.stringify(this.data.signature);

        return {
            protected_header: header1,
            unprotected_header: header2,
            payload: payload,
            signature: signature
        }
        
    }

    toRawString() {
        let raw = this.toRawJSON()
        
        //let out = `${JSON.stringify(raw.header1,null,2)},\n${JSON.stringify(raw.header2,null,2)},\n${JSON.stringify(raw.payload,null,2)},\n${raw.signature}`;
        let out = `protected header: ${JSON.stringify(raw.protected_header,null,2)},\nunprotected header: ${JSON.stringify(raw.unprotected_header,null,2)},\npayload: ${JSON.stringify(raw.payload,null,2)},\nsignature: ${raw.signature}`;
        //let out = JSON.stringify(raw,null,2)
        return out;
    }

    toString() { return this.getHCertJson() }
    

    /* 
        Field values Decoding 
    */
    decodeValue(valueType, id) {
        const valueSet = valueSets[valueType].json;
        if (!valueSet) {
            console.warn("ValueSets not loaded for: "+id)
            return id;
        }
        else {
            return (valueSet.valueSetValues[id]) ? valueSet.valueSetValues[id].display : id;
        }
    }

    withDecodedValues() {
        // see 
        // https://github.com/ehn-dcc-development/ehn-dcc-schema
        let greenpassJSON = this.getHCertJson()
    
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
                                json.value = this.decodeValue(decoder, group[prop]);
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
                                json.value = this.decodeValue(decoder, group[prop]);
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
    
}



function dateFormat(dateStr) {
	const locale = (navigator.language) ? navigator.language : "en";

	const date = new Date(dateStr);
	return Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'long' }).format(date);
}





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

// fetch valuesets jsons on load
// to speed up dgc decoding
function loadValueSets() {
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
        console.info("Valuesets loaded!")
	})
}
window.addEventListener("load", loadValueSets());

