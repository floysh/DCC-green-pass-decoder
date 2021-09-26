//
// SIGNATURE VERIFICATION
//

import {PublicKey} from "@fidm/x509"
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