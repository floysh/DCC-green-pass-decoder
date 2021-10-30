//
// SIGNATURE VERIFICATION
//

import {Certificate, PublicKey} from "@fidm/x509"
import * as cose from "cose-js"

export async function verify(greenpassRawData, kid) {

	let res = await fetch("assets/it_dgc_public_keys.json");
	let keys = await res.json();
	if (!keys) return null;
	let eligible_keys = keys[kid];
	

	if (!eligible_keys) return false;

	let verified = false;
	for (let k of eligible_keys) {
		const key = PublicKey.fromPEM(
			"-----BEGIN PUBLIC KEY-----\n"+
			k+
			"\n-----END PUBLIC KEY-----\n"
		);
		
		// Signature verification
		const pk = key.keyRaw;
		//const _keyB = pk.slice(0, 1);
		const keyX = pk.slice(1, 1 + 32);
		const keyY = pk.slice(33, 33 + 32);
		try {
			const verifier = { key: { x: keyX, y: keyY } };	
			await cose.sign.verify(greenpassRawData, verifier);

			//console.info("Matching key", key);
			//console.info("KID", kid)
			verified = true;
			break;
		}
		catch(err) {
			// try the next key;
			console.error(err.message);
  			console.error(err.stack);
		}

	}

	/* if (!verified) {
		throw Error("Signature mismatch");
	} */

	return verified;
}

export async function getIdentityFromKID(kid) {
	let res = await fetch("assets/it_dgc_certificates.json");
	let certstore = await res.json();
	if (!certstore) return null;
	let eligible_certs = certstore[kid];

	if (!eligible_certs) return false;

	let CERT_PEM_STR = `-----BEGIN CERTIFICATE-----\n${eligible_certs[0]}\n-----END CERTIFICATE-----`
	let cert = Certificate.fromPEM(CERT_PEM_STR);
	return cert;
}