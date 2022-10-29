import * as bs58 from 'bs58'
import * as fs from 'fs'
import * as dotenv from 'dotenv'
dotenv.config()
const { PRIVATE_KEY } = process.env

/*
 *
 * Private Key Exporter
 *
 * This script exports your private key from your
 * phantom wallet and saves it to a file
 *
 * To use this script, run the following command:
 *  ```
 *   npx ts-node scripts/prviateKeyExporter.ts
 *  ```
 */
async function main() {
  // We are using the bs58 library to decode the private key
  // The Uint8Array is the standard method for keypairs
  const b = bs58.decode(PRIVATE_KEY)
  const j = new Uint8Array(
    b.buffer,
    b.byteOffset,
    b.byteLength / Uint8Array.BYTES_PER_ELEMENT,
  )
  fs.writeFileSync('tests/keypairs/exported-keypair.json', `[${j}]`)
}

main()
