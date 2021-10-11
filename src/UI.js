// UI wrappers

export function reset() {
	const dgcform = document.getElementsByClassName("dgc input");
	for (let elem of dgcform) elem.value = null;

	document.getElementById("dgc-json").innerText = "";
	document.getElementById("error-bar").hidden = true;
    //document.getElementById("signature-progress").classList.remove("is-hidden");
	document.getElementById("signature-invalid-notification").hidden = true;
	document.getElementById("signature-verified-notification").hidden = true;
	document.getElementById("qr-decoded-content").innerText = "";
	getQRCanvas().height += 0; //clean preview 

	document.getElementById("cert-type").innerText = "";
	document.getElementById("common-group").hidden = true;
	document.getElementById("vaccination-group").hidden = true;
	document.getElementById("recovery-group").hidden = true;
	document.getElementById("test-group").hidden = true;

}


// PREVIEW CANVAS

export function getQRCanvas() {
    return document.getElementById("qr-canvas");
}

export function showQRCanvas() {
	document.getElementById("drag-drop-text").hidden = true
	document.getElementsByClassName("canvas-wrapper")[0].classList.remove("is-hidden")
}

export function hideQRCanvas() {
	document.getElementById("drag-drop-text").hidden = false
	document.getElementsByClassName("canvas-wrapper")[0].classList.add("is-hidden")
}



// TOGGLE

document.querySelector("#dgcHumanReadableToggle").addEventListener("click", event => {
    toggleDecodedHCertView(event.target.checked)
});

export function toggleDecodedHCertView(checked) {
	document.querySelector("#dgc-code").hidden = checked;
	document.querySelector("#dgc-hr").hidden = !(checked);
}

// Apply toggle default state
window.addEventListener("load", () => {
	const toggle = document.querySelector("#dgcHumanReadableToggle");
	document.querySelector("#dgc-code").hidden = toggle.checked;
	document.querySelector("#dgc-hr").hidden = !(toggle.checked);
});


// ERROR BAR

export function showErrorMessage(err,err_header) {
	console.warn("NOT A DGC: "+err)
	// Show error message
	const errtext = err_header+"\n"+err;
	document.querySelector("#dgc-json").textContent = errtext;
	document.querySelector("#error-text").textContent = err;
	document.querySelector("#error-bar").hidden = false;
}

export function showDecodedText(text) {
	document.querySelector("#qr-decoded-content").innerText = text
}


// Vaccine/Test/Recovery group display manager
export function showDecodedHCertGroup(type) {
    document.getElementById("load-tip").hidden = true;

    const vgroup = document.getElementById("vaccination-group");
	const rgroup = document.getElementById("recovery-group");
	const tgroup = document.getElementById("test-group");

	const cert_type = document.getElementById("cert-type")

    switch(type) {
        case("v"):
            vgroup.hidden = false;
            cert_type.innerText = "Vaccination"
            break;
        case("r"):
            rgroup.hidden = false;
            cert_type.innerText = "Recovery"
            break;
        case("t"):
            tgroup.hidden = false;
            cert_type.innerText = "Test"
            break;
        default:
            throw Error("invalid certificate type")
            break;
    }

	document.getElementById("common-group").hidden = false;
	document.getElementById("person-group").hidden = false;

}



//
// Fills the UI with human readable values 
// of the dgc fields
//
export function displayDecodedHCERT(greenpassJSON) {

	// Enable the necessary UI sections
	let type = null;
	if ("v" in greenpassJSON) {
		type = "v"
	}
	else if ("r" in greenpassJSON) {
		type = "r"
	}
	else if ("t" in greenpassJSON) {
		type = "t"
	}
	else throw Error("invalid certificate type");
	showDecodedHCertGroup(type)
	

	// Fill the UI

	// Display the top-level properties(dob, ver)
	document.getElementById("dob").value = greenpassJSON.dob.value
	document.getElementById("ver").innerText = greenpassJSON.ver.value

	// Display the person's name group properties
	for (let p of Object.keys(greenpassJSON.nam)) {
		const textbox = document.getElementById(p);
		textbox.value = greenpassJSON.nam[p].value
	}

	// Display the type specific group properties
	// v | r | t
	const type_group = greenpassJSON[type][0]
	for (let p of Object.keys(type_group)) {
		const textbox = document.getElementById(type+"-"+p);
		textbox.value = type_group[p].value
	}

}


// Display raw certificate values
export function displayRawHCERT(json) {
    document.querySelector("#dgc-json").textContent = json
}


export function displaySignatureResult(isAuthentic) {
    document.getElementById("signature-progress").classList.add("is-hidden");
    switch(isAuthentic) {
        case (null): // no keys available for validation
            break; 
        case (false):
            document.getElementById("signature-invalid-notification").hidden = false;
            break;
        case(true):
            document.getElementById("signature-verified-notification").hidden = false;
            break;
        default:
            break;
    }
}



export const scannerVideo = document.getElementById("camera-stream")

export const scanner = document.getElementById("qr-scanner")