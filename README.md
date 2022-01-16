<h1 align="center">
  <br>
  <a href="https://github.com/floysh/DCC-green-pass-decoder/raw/main/public/favicon.png"><img src="public/favicon.png" alt="Markdownify" width="150"></a>
  <br>
  <br>
  EU Digital COVID Certificate decoder
  <br>
</h1>

A Progressive Web App that can read EU Digital COVID Certificate QR-codes.

This is just a toy app I made while being curious to look at what's inside my own Green Certificate. Unlike other decoders available online, it doesn't require to set up dependencies or upload the certificate to a remote server. It can be used by average users without having to interact with the terminal (scary! hacker stuff! 🐱‍💻).

All the processing is done locally and your certificate never leaves your device.


<br>

#### 🚀 Try it live on https://floysh.github.io/DCC-green-pass-decoder/



<br>

## Features
* No need to set up an environment: just load the page and you're ready to scan! 😎
* Progressive Web App, can work offline and be installed on many devices like a native app.
* Can both display the raw certificate or parse it to make the fields human readable.
* Can both load the QR-code from an existing file or scan it using the device camera
* Signature validation. A list of the certificates used for this purpose can be found in [`docs/certificates.md`](docs/certificates.md)

<br>

# How to edit

Clone the repository:
```(bash)
git clone https://github.com/floysh/DCC-green-pass-decoder
```

Install dependencies:
```(bash)
cd ./DCC-green-pass-decoder
npm install
```

Run the watcher:
```(bash)
npm run watch
```
this will generate new builds of the JS bundle whenever it detects something has changed in the `src/` folder.

Then start your favorite local webserver in `public/`

When you're satisfied with the edits, stop the watcher and make an optimized JS bundle:

```
npm run build
```

This will minify the javascript and reduce the bundle.js file size.

<br>

# How does it work
## Decoding the QR-code

It's fairly easy to decode an EU DCC. The official EU repository states that the certificate is a COSE message / CBOR Web Token (CWT).

The COSE message structure is the following:
* **protected (signed) header**: this field contains some information about the certificate signature. The only interesting information here is the **Key Identifier (KID)**, which can be used by a validator app to efficiently retrieve the correct key that needs to be used in the signature validation step.
* **unprotected header**: non-critical information about the CWT may be stored here. This field is not signed, so its integrity cannot be guaranteed. It was empty on all the certificates I tried to decode.
* **payload**: this field is a CBOR map containing the actual DCC JSON document.
* **signature**: the signature is what ensures the authenticity of the certificate.

A more detailed description of this structure can be found on the [Electronic Health Certificate Specification repository](https://github.com/ehn-dcc-development/hcert-spec/blob/main/hcert_spec.md) from the European Health Network.

This is the encoding pipeline: 

![docs/overview.png](docs/qr-encoding.png)

so decoding can be done by following the same steps in reverse:

* **Read the QR-code**
  * acquire an image of the code
  * decode it to string. It should be something like `HC1:XXXXXXX...`
* **Decode the certificate string**
  * Remove the `HC1:` header
  * Decode with a **Base45 decoder**.
  * Decompress with **zlib deflate** to obtain the COSE message
* **Extract the certificate**
  * Deserialize the COSE message.
  * Extract the COSE payload. It's a CBOR document
  * Decode the CBOR
    * The certificate JSON document can be found in the payload, at claim `-260`.



## Signature validation

This was a bit more time consuming, mainly because there's no documented way to get some required files and I'm by no means an expert in dealing with crypto algorithms or digital signatures. 

Further details on how this feature has been implemented can be found in [`docs/signature-validation.md`](docs/signature-validation.md).


## Resources

* [Electronic Health Certificate Specification](https://github.com/ehn-dcc-development/hcert-spec/blob/main/hcert_spec.md)

* [EU Digital Green Certificate Specifications](https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_v1_en.pdf)

* [EU Digital COVID Certificate JSON Schema Specifications](https://ec.europa.eu/health/sites/default/files/ehealth/docs/covid-certificate_json_specification_en.pdf)

* [EU Digital COVID Certificate JSON Schema repository](https://github.com/ehn-dcc-development/ehn-dcc-schema)

* [Value Sets for Digital Green Certificates](https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_dt-specifications_en.pdf) 

* [Some test QR-codes](https://github.com/ehn-dcc-development/dcc-testdata)
