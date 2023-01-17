import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
dotenv.config()

export async function createSignature(name: string, image: string) {
  const eth_signer: ethers.Wallet = new ethers.Wallet(
    process.env.ETH_PRIVATE_KEY,
    ethers.getDefaultProvider(),
  )

  // Stuff
  let eth_address: string // Ethereum address to be recovered and checked against
  let full_sig: string // 64 bytes + recovery byte
  let signature: Uint8Array // 64 bytes of sig
  let recoveryId: number // recovery byte (u8)
  let actual_message: Buffer // actual signed message with Ethereum Message prefix

  const messageHash: string = ethers.utils.solidityKeccak256(
    ['string', 'string'],
    [name, image],
  )
  const messageHashBytes: Uint8Array = ethers.utils.arrayify(messageHash)
  full_sig = await eth_signer.signMessage(messageHashBytes)

  let full_sig_bytes = ethers.utils.arrayify(full_sig)
  signature = full_sig_bytes.slice(0, 64)
  recoveryId = full_sig_bytes[64] - 27

  let msg_digest = ethers.utils.arrayify(
    ethers.utils.solidityKeccak256(['string', 'string'], [name, image]),
  )
  actual_message = Buffer.concat([
    Buffer.from('\x19Ethereum Signed Message:\n32'),
    msg_digest,
  ])

  eth_address = ethers.utils.computeAddress(eth_signer.publicKey).slice(2)

  return { actual_message, signature, recoveryId, eth_address }
}
