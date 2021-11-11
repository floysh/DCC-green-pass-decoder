import {fetchCerts, extractKeys} from "./utils.js";
import * as fs from "fs";
import * as path from "path";

const OUT_DIR = (process.env.OUT_DIR) ? process.env.OUT_DIR : 'out/';
const CERTS_DIR = `${OUT_DIR}/certs`;
const KEYS_DIR = `${OUT_DIR}/keys`;

const CERT_FILE = "it_dgc_certificates.json";
const KEYS_FILE = "it_dgc_public_keys.json"


main();


async function main() {
    
    console.info("Fetching signing certificates from the italian national platform...")
    let certStore = await fetchCerts();
    //let certStore = JSON.parse(fs.readFileSync(OUT_DIR + CERT_FILE, 'utf8'));
    
    console.info("Extracting public keys...")
    let keylist = extractKeys(certStore);
    
    
    // Save the JSONs
    console.info("Saving files...")
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFile(path.join(OUT_DIR, CERT_FILE), JSON.stringify(certStore,null,0), () => {});
    fs.writeFile(path.join(OUT_DIR, KEYS_FILE), JSON.stringify(keylist,null,0), () => {});
    
    

    if (process.env.EXPORT_CERTIFICATES) {
        // Create the export directory if it doesn't exists
        fs.mkdirSync(CERTS_DIR, { recursive: true });

        // Save the individual certificates
        for (let kid of Object.keys(certStore)) {
            for (let cert of certStore[kid]) {
                let i = 0;
                const pem = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`
                let filename = `${CERTS_DIR}/${kid}${(i>0) ? "_${i}" : ""}.pem`
    
                //let der = Buffer.from(cert.replace("/n", ""), "base64")
                //let filename = `${CERTS_DIR}/${kid}${(i>0) ? "_${i}" : ""}.cer`
                
                fs.writeFile(filename, pem, () => {});
                i++;
            }
        }
    }

    if (process.env.EXPORT_KEYS) {
        // Create the export directory if it doesn't exists
        fs.mkdirSync(KEYS_DIR, { recursive: true });

        // Save the individial public keys 
        for (let kid of Object.keys(keylist)) {
            for (let cert of keylist[kid]) {
                let i = 0;
                const pem = `-----BEGIN PUBLIC KEY-----\n${cert}\n-----END PUBLIC KEY-----`
    
                let filename = KEYS_DIR + `/${kid}${(i>0) ? "_${i}" : ""}.pem`
                fs.writeFile(filename, pem, () => {});
                i++;
            }
        }

    }

    console.info("Done.")
    
}
