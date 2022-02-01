import {EUGreenCertificate} from './DGC'
import * as signature from './signature'
import * as QR from './qr'
import * as UI from './UI'


export async function loadDGCFromString(rawstring) {
		
	// Load QR Preview
	const canvas = UI.getQRCanvas()
	QR.beautify(rawstring, canvas)
	UI.showQRCanvas();

	// Load the DCC
	UI.setProgressText("Decoding Green Certificate")
	if (!rawstring) throw Error("No data")
	let dgc = new EUGreenCertificate(rawstring);
	//console.log(dgc)

	let rawdgc = dgc.getRawCwt()
	let kid = dgc.getKid()
	let algid = dgc.getSignAlgorithm()
	
	// Display the Certificate content
	// raw content
	UI.displayRawText(dgc.getEncodedString())
	UI.displayRawHCERT(dgc.toRawString())
	// parsed content
	try {
		const hrDGC = dgc.withDecodedValues()
		UI.displayDecodedHCERT(hrDGC);
	}
	catch(err) {
		UI.showErrorMessage(err, "Invalid certificate format", null, false)
	}
	
	// Signature Verification!
	UI.setProgressText("Verifying signature")
	signature.verify(rawdgc, kid)
	.then(isAuthentic => {
		UI.displaySignatureCheckResult(isAuthentic);
	})
	.catch(err => {
		UI.setProgressText("Failed to load the signer certificate list.\nPerhaps your network is not available?\n")
		window.setTimeout(() => {UI.hideProgress()}, 3500, null) 
	})
	
	// Display signer details
	signature.getIdentityFromKID(kid, algid)
	.then(cert => {
		UI.displaySignatureDetails(kid, algid);
		if (cert) {
			let subject = `${cert.subject.commonName} (${cert.subject.countryName})`;
			let issuer = `${cert.issuer.commonName} (${cert.issuer.countryName})`;
			UI.displaySigner(`${subject}, issued by ${issuer}`)
		}
		else {
			UI.displaySigner(`unknown`)
		}
	})
	
}


export async function loadDGCFromFile(file) {
	if (file.substr(0,10) != "data:image") {
		UI.hideQRCanvas()
		UI.showErrorMessage(Error("not an image"), "This file format is unsupported")
		return ;
	}
		 
	// Decode the DCC QR-code and process it
	try {
		let rawstring = await QR.decode(file)
		//console.log(rawstring)
		
		loadDGCFromString(rawstring)
		.catch(err => {
			UI.showErrorMessage(err,"This is not an EU Digital COVID Certificate")
			UI.showDecodedText(rawstring)
		});
	}
	catch(err) {
		UI.hideQRCanvas();
		UI.showErrorMessage(err)
	}
}

