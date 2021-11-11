import fetch from 'cross-fetch';
import { Certificate, PublicKey } from "@fidm/x509";
import { createHash as rawHash } from "sha256-uint8array";

const APP_SDK = 29;
const APP_MODEL = "1.1.0";

const API_BASE_URL = "https://get.dgc.gov.it/v1/dgc"



async function fetchValidKIDs() {
    try {
        const res = await fetch(API_BASE_URL+"/signercertificate/status")
        const kids = await res.json()
        return kids;
    }
    catch(e) {
        console.error(e);
    }
}



export async function fetchCerts() {    
    let valid_kids = await fetchValidKIDs()
    const certlist = {
        /*  TEST
        // France
        "fGLuvg6n5wk=": [
            "MIIEGzCCAgOgAwIBAgIUNWO7+/2lmGQGT1cep5petfsOFocwDQYJKoZIhvcNAQELBQAwMjELMAkGA1UEBhMCRlIxDTALBgNVBAoMBEdvdXYxFDASBgNVBAMMC0NTQ0EtRlJBTkNFMB4XDTIxMDYxNDIyMDAwMFoXDTIzMDYxNDIyMDAwMFowRTELMAkGA1UEBhMCRlIxDTALBgNVBAoMBENOQU0xEjAQBgNVBAsMCTE4MDAzNTAyNDETMBEGA1UEAwwKRFNDX0ZSXzAxOTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABCJiBWroM8AeX/1cn0Nyk300qLpMAD1UoB2Vq7a3No+BbgFKcPzm0ZwPaQYzfx3VHNc3JfUjv77AhJx5F4cY8+GjgeAwgd0wHQYDVR0OBBYEFF6mKwOiAheaIxTCkdVKd8zgd7urMB8GA1UdIwQYMBaAFL6KLtbJ+SBOOicDCJdN7P3ZfcXmMAwGA1UdEwEB/wQCMAAwDgYDVR0PAQH/BAQDAgeAMC0GA1UdHwQmMCQwIqAgoB6GHGh0dHA6Ly9hbnRzLmdvdXYuZnIvY3NjYV9jcmwwGAYDVR0gBBEwDzANBgsqgXoBgUgfAwkBATA0BggrBgEFBQcBAQQoMCYwJAYIKwYBBQUHMAKGGGh0dHBzOi8vYW50LmdvdXYuZnIvY3NjYTANBgkqhkiG9w0BAQsFAAOCAgEAu8BaLZXFj9/e2/a59mBrOhY2m5SpcAoayxF3zOkIOt7LNX0QqHuomOyGLHMnAhNALgS2vhDXD0hhs96ZcKaystlMePpYsVRyaYa53GwMrGHiLwFxH5qQNClCcktAP++wCcdQXzTyZOn9/GNdmquW1PNMLPCEfqlnzWawdpITr+CYMXa9R5BEMmdX19F41HcoPRn9/X2uHW/ONmBywTwJ3s0U8F5HF21buZtxVDvX4ey+qINBru4MiGwgRCsklS9kDbl3ODUox0lwhs2VgQzqjALF4xYgsdN2LJezrwAiL8GMRAenmX9eDdgzMGnjKFT6yW8BCrPsyUnM15RAou3BrwIp6oxXHnR8wbeKG7pzZZY1J4zk4yYyihwxguWbUZGksJsNAQoNdNHBZtc8a7Oj5onLyUIetd7ELXxdk8uy7WVFeye5V8qJRhWrFyhWWFscQeY8GktefXiGEh6fxGfRU5R5b0PznxfMiA3olad3s17dr+jzqCM/hcY2FmUTjYrSrAyrhHdmCYIJ3US71If74UeMs6NZnQRRiu3tbAX+TiDOHsEHEIOHldbyQqFfclyiC26fHTqcNfIAxXPmPDQ1jpEmhRjFDlOWHoSnzsGZi/wa1kmSb6+2uHgUP/C/O2oi+yAk8GpwpEi8Sgv+HH/p7z0ympQK8IUOG/4K3/urdto="
            ], */
    };
    
    let token = 0;
    for (let i=0; i < valid_kids.length; i++) {
        const headers = {
            //"User-Agent": `DGCA verifier Android ${APP_SDK}, ${APP_MODEL};`,
            "Cache-Control": "no-cache",
            "x-resume-token": `${token}`,
        }
    
        //if (token > 0) headers["x-resume-token"] = token;
    
        const response = await fetch(`${API_BASE_URL}/signercertificate/update`, {
            method: "GET",
            headers: headers
        })

        if(response.status !== 200) break;
        
        let kid = response.headers.get("x-kid");
        if (valid_kids.includes(kid)) {
            let pem = await response.text();

            if (pem) certlist[kid] = [pem];
    
            //console.log(response.headers.get("X-RESUME-TOKEN")+" "+kid)
        }


        token = response.headers.get("X-RESUME-TOKEN")
    }

    return certlist

}




export function extractKeys(certs) {
    let keys = {}

    for (let kid of Object.keys(certs)) {
        let key = certs[kid];
        let CERT_PEM_STR = `-----BEGIN CERTIFICATE-----\n${key}\n-----END CERTIFICATE-----`

        try {
            let cert = Certificate.fromPEM(CERT_PEM_STR);
            
            const fingerprint = rawHash().update(cert.raw).digest();
            const keyID = fingerprint.slice(0, 8);
            /* const pk = cert.publicKey.keyRaw;
            //const _keyB = Buffer.from(pk.slice(0, 1));
            const keyX = pk.slice(1, 1 + 32);
            const keyY = pk.slice(33, 33 + 32);
        
            const verifier = { key: { x: keyX, y: keyY, kid: keyID } };  */
           
        
            //let id = cert.issuer.countryName
            //let id = new Uint8Array(keyID.buffer).reduce ( (str, v) => str + String.fromCharCode(v), "")
            //let kid = Buffer.from(keyID.buffer).toString("base64")
            //console.log(kid)
    
            if (!keys[kid]) {
                keys[kid] = new Array();
            }
            let key = cert.publicKey.toPEM().split("-----BEGIN PUBLIC KEY-----\n")[1].split("\n-----END PUBLIC KEY-----\n")[0]
            //key = key.split("\n")[1]
            keys[kid].push(key);
        }
        catch(err) {
            console.warn(`[WARN] Key extraction failure for "${kid}".\n${err}\n`)

        }


        //console.log(co+" "+JSON.stringify(ver,null,"\n"))
    }

    return keys
}
