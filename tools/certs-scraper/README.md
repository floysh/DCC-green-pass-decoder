# EDCC signer certificates scraper

This node package provides some scripts to fetch the authoritative signing certificates with their respective identifiers (kids) from Italy's DGC national platform (_Piattaforma Nazionale DGC_ or PN-DGC).

The scripts output can be found in the `./out` directory.

## Usage

After cloning, start a shell in this directory and run `npm install` to set up the required dependencies.

Then run one of the following scripts with `npm run $script-name`

| Script name | Description |
|-------------|-------------|
| `fetch` | Downloads the certificates from PN-DGC. Builds kid-indexed lists of signer certificates and public keys. |
| `export-certs` | Runs `npm run fetch`. Exports each certificate as a DER certificate (`.cer`). |
| `export-keys` | Runs `npm run fetch`. Exports each certificate's public key as a `.pem` key file.   |
| `export-markdown` | Creates a markdown table containing all the fetched certificates |
| `export-all` | Same as running all the export commands above. |
| `clean` | Wipes the `./out` directory. |
| `shell` | (development) Starts a local node shell with experimental support for async/await. |