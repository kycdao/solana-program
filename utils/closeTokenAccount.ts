import { createCloseAccountInstruction } from '@solana/spl-token'
import { web3 } from '@project-serum/anchor'

export async function closeTokenAccount(
  accountAddress: web3.PublicKey,
  destination: web3.PublicKey,
  authority: web3.Keypair,
  tokenProgram: web3.PublicKey,
  feePayer: web3.Keypair,
) {
  // Connection to devnet
  const connection = new web3.Connection(
    web3.clusterApiUrl('devnet'),
    'confirmed',
  )
  console.log('trdasd')

  // Create transaction and add instruction to it
  let instructions = new web3.Transaction()
  instructions.add(
    createCloseAccountInstruction(
      accountAddress, // account to close
      destination, // rent's destination
      authority.publicKey, // token account authority
      [], // multisigners
      tokenProgram, // token program
    ),
  )
  // This is optional, otherwise, authority will pay for the transaction
  instructions.feePayer = feePayer.publicKey

  // Sign transaction, broadcast, and confirm
  const tx = await web3.sendAndConfirmTransaction(connection, instructions, [
    authority,
    feePayer,
  ])
  return tx
}

module.exports = { closeTokenAccount }
