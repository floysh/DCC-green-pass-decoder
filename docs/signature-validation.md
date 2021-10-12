# Signature Validation

Every green certificate is signed with a member state's private key. The EU DCC Gateway records all the member states' public keys and makes them available to the validator apps, so that each country can make its own app to best suit its legal needs.

>   **Signature validation and DCC validation are two very different concepts.** A valid signature by itself does not mean that the certificate is valid. The signature is just a measure of authenticity, saying that the certificate was issued by an authorized entity. There are other requirements to fulfill for a certificate to be valid, stated by so-called _validation rules_. 

The public keys are sent to the DCC gateway inside an x509 certificate, named Document Signer Certificate (DSC) or signer certificate.

The signer certificate used for validating italian DCCs is (base64 PEM)
```
-----BEGIN CERTIFICATE-----
MIIEDzCCAfegAwIBAgIURldu5rsfrDeZtDBxrJ+SujMr2IswDQYJKoZIhvcNAQELBQAwSTELMAkGA1UEBhMCSVQxHzAdBgNVBAoMFk1pbmlzdGVybyBkZWxsYSBTYWx1dGUxGTAXBgNVBAMMEEl0YWx5IERHQyBDU0NBIDEwHhcNMjEwNTEyMDgxODE3WhcNMjMwNTEyMDgxMTU5WjBIMQswCQYDVQQGEwJJVDEfMB0GA1UECgwWTWluaXN0ZXJvIGRlbGxhIFNhbHV0ZTEYMBYGA1UEAwwPSXRhbHkgREdDIERTQyAxMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEnL9+WnIp9fvbcocZSGUFlSw9ffW/jbMONzcvm1X4c+pXOPEs7C4/83+PxS8Swea2hgm/tKt4PI0z8wgnIehoj6OBujCBtzAfBgNVHSMEGDAWgBS+VOVpXmeSQImXYEEAB/pLRVCw/zBlBgNVHR8EXjBcMFqgWKBWhlRsZGFwOi8vY2Fkcy5kZ2MuZ292Lml0L0NOPUl0YWx5JTIwREdDJTIwQ1NDQSUyMHhcMSxPPU1pbmlzdGVybyUyMGRlbGxhJTIwU2FsdXRlLEM9SVQwHQYDVR0OBBYEFC4bAbCvpArrgZ0E+RrqS8V7TNNIMA4GA1UdDwEB/wQEAwIHgDANBgkqhkiG9w0BAQsFAAOCAgEAjxTeF7yhKz/3PKZ9+WfgZPaIzZvnO/nmuUartgVd3xuTPNtd5tuYRNS/1B78HNNk7fXiq5hH2q8xHF9yxYxExov2qFrfUMD5HOZzYKHZcjcWFNHvH6jx7qDCtb5PrOgSK5QUQzycR7MgWIFinoWwsWIrA1AJOwfUoi7v1aoWNMK1eHZmR3Y9LQ84qeE2yDk3jqEGjlJVCbgBp7O8emzy2KhWv3JyRZgTmFz7p6eRXDzUYHtJaufveIhkNM/U8p3S7egQegliIFMmufvEyZemD2BMvb97H9PQpuzeMwB8zcFbuZmNl42AFMQ2PhQe27pU0wFsDEqLe0ETb5eR3T9L6zdSrWldw6UuXoYV0/5fvjA55qCjAaLJ0qi16Ca/jt6iKuws/KKh9yr+FqZMnZUH2D2j2i8LBA67Ie0JoZPSojr8cwSTxQBdJFI722uczCj/Rt69Y4sLdV3hNQ2A9hHrXesyQslr0ez3UHHzDRFMVlOXWCayj3LIgvtfTjKrT1J+/3Vu9fvs1+CCJELuC9gtVLxMsdRc/A6/bvW4mAsyY78ROX27Bi8CxPN5IZbtiyjpmdfr2bufDcwhwzdwsdQQDoSiIF1LZqCn7sHBmUhzoPcBJdXFET58EKow0BWcerZzpvsVHcMTE2uuAUr/JUh1SBpoJCiMIRSl+XPoEA2qqYU=
-----END CERTIFICATE-----
```

which should give you the following public key:
```
04 9c bf 7e 5a 72 29 f5 fb db 72 87 19 48 65 05 95 2c 3d 7d f5 bf 8d b3 0e 37 37 2f 9b 55 f8 73 ea 57 38 f1 2c ec 2e 3f f3 7f 8f c5 2f 12 c1 e6 b6 86 09 bf b4 ab 78 3c 8d 33 f3 08 27 21 e8 68 8f
```

[See the complete list of signer certificates (updated to 2021-09-03)](./certificates.md)



## How do I verify the signature?

Each green certificate comes enveloped in a CBOR Web Token (CWT) or a COSE message. The headers of this structure contain a Key Identifier field (KID) that should be used to retrieve the matching signing certificate.

This means that validator apps need to manage a local DB with the certificates retrieved from the DCC Gateway.

Unfortunately there's no publicly documented way to query the EU DCC Gateway directly for signing certificates, so you have to grab them from one of the official validators or a national backend.



## Italy's DGC national platform API

> This is based on the official Italian validator app, VerificaC19.

[Unlike the French validator app](https://gitlab.inria.fr/stopcovid19/stopcovid-android/-/raw/master/stopcovid/src/main/assets/Certs/dcc-certs.json), VerificaC19 doesn't embed the certificates in its codebase. Signer certificates and validation rules are retrieved at least once a day from the DGC National Gateway, and are stored encrypted in the private app data directory.

Up-to-date validation rules and certificates are retrieved with GET requests to the National Gateway.
The API endpoint is `https://get.dgc.gov.it/v1/dgc` (see https://github.com/ministero-salute/it-dgc-verificaC19-android/blob/develop/app/build.gradle)

The following APIs are provided to the validator app:


| API | Method | Description |
|-----|--------|-------------|
| `/signercertificate/status` | GET | Retrieves a list of key identifiers for all currently valid certificates |
| `/signercertificate/update` | GET | Retrieves a single certificate (x509 PEM encoding) |
| `/settings` | GET | Retrieves a list of validation rules and other parameters used by the mobile app (e.g minimum app version required to enforce updates) |



## Obtaining the certificates

Unfortunately, there's no way to retrieve the whole certificate list with a single request. The certificates have to be retrieved one by one with subsequent GET requests to `/signercertificate/update`.

To retrieve a certificate, a GET request is made to `/signercertificate/update` with a custom header 
```
headers: {
    X_RESUME_TOKEN: [Integer]
}
```

The `X_RESUME_TOKEN` header is used by the server to determine which certificate will be delivered to the app. For the first certificate, `X_RESUME_TOKEN` is set to `-1`.

The response comes with custom headers as well: 
  * `X_KID` : the key identifier of the returned certificate.
  * `X_RESUME_TOKEN` : the resume token required to retrieve the next certificate in the list.

The response body is of `type/text` and contains the certificate's body in PEM format, without beginning and ending tokens.

When no more certificates can be retrieved, the server answers with a `204` response (No Content).

The complete certificates are not needed to validate signatures: once all the public keys have been extracted from them, they can be safely discarded. This comes with some security concerns, as it makes the app unable to detect whether its local DB has been tampered to include unauthorized keys. However, the DSCs root certification authority is not available either way and this project does not aim to build a full-fledged validator.


### Example

This is a quick pseudocode for retrieving all valid certificates. For a complete implementation, see [/tools/certs-scraper](../tools/certs-scraper)
```javascript
// Retrieve the list of valid key identifiers
let response = await fetch(${API_BASE_URL}/signercertificate/status, {method: GET})
let kidList = await response.json();

// Retrieve the certificates
let certDB = {}
let next_token = -1;
while (true)
  let headers = {
    "X-RESUME-TOKEN": next_token;
  }
  let response = await fetch(${API_BASE_URL}/signercertificate/update, {method: GET})
  let certificate = await response.text();

  // If no more certificates available on the server, we're done
  if (response.status == 204) break;

  if(response.status == 200) {
    let kid = response.headers[x-kid];
    next_token = = response.headers[x-resume-token];

    // if the certificate is valid, add it to the indexed db
    if (kid in kidList) 
      certDB[kid] = certificate
  }
  else {} //retry 

}

```
