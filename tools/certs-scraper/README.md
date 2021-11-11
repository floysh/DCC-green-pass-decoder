# EDCC signer certificates scraper

This node package provides some scripts to fetch the authoritative signing certificates with their respective identifiers (kids) from Italy's DGC national platform (_Piattaforma Nazionale DGC_ or PN-DGC).

The scripts output can be found in the `./out` directory.

## Usage

Run `npm install` to set up the required dependencies.

Then run one of the following scripts with `npm run`

| Script | Description |
|--------|-------------|
| `fetch` | Builds kid-indexed lists of signer certificates and public keys. |
| `export-certs` | Builds kid-indexed lists of signer certificates and public keys. Exports each certificate as a DER certificate (`.cer`). |
| `export-keys` | Builds kid-indexed lists of signer certificates and public keys. Exports each certificate's public key as a `.pem` key file.   |
| `export-all` | Same as running `export-certs` and `export-keys` in a row, but faster. |
| `clean` | Wipes the `./out` directory. |
| `shell` | (development) Starts a local node shell with experimental support for async/await. |