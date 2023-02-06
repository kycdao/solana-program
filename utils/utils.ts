import { web3 } from '@project-serum/anchor'
import {
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  KYCDAO_COLLECTION_KYC_SEED,
  KYCDAO_STATUS_KYC_SEED,
  KYCDAO_STATUS_SIZE,
  KYCDAO_PROGRAM_ID,
} from './constants'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import fs from 'fs'

export const createAssociatedTokenAccountInstruction = (
  associatedTokenAddress: web3.PublicKey,
  payer: web3.PublicKey,
  walletAddress: web3.PublicKey,
  splTokenMintAddress: web3.PublicKey,
) => {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: walletAddress, isSigner: false, isWritable: false },
    { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
    {
      pubkey: web3.SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: web3.SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ]
  return new web3.TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  })
}

export const getMetadata = async (
  mint: web3.PublicKey,
): Promise<web3.PublicKey> => {
  return (
    web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0]
}

/* Find the associated token account between mint*/
export const getTokenWallet = async (
  wallet: web3.PublicKey,
  mint: web3.PublicKey,
) => {
  return (
    web3.PublicKey.findProgramAddressSync(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    )
  )[0]
}

export const getStatusId = async (
  receiver: web3.PublicKey,
) => {
  return (
    web3.PublicKey.findProgramAddressSync(
      [Buffer.from(KYCDAO_STATUS_KYC_SEED), receiver.toBuffer()],
      KYCDAO_PROGRAM_ID,
    )
  )
}

export const getCollectionId = async () => {
  return (
    web3.PublicKey.findProgramAddressSync(
      [Buffer.from(KYCDAO_COLLECTION_KYC_SEED)],
      KYCDAO_PROGRAM_ID,
    )
  )[0]    
}

//TODO: Pretty sure we don't want this... mantissa...hmmm
export function parsePrice(price: number, mantissa: number = LAMPORTS_PER_SOL) {
  return Math.ceil(price * mantissa)
}

/* The wallet that will execute most of the activities */
export const BACKEND_WALLET = web3.Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(
      fs.readFileSync(__dirname + '/keypairs/my-wallet.json').toString(),
    ),
  ),
)

/* A receiver wallet for everywthing that needs a second wallet involved */
export const RECEIVER_WALLET = web3.Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(
      fs.readFileSync(__dirname + '/keypairs/receiver-wallet.json').toString(),
    ),
  ),
)

/* Used for durable nonces, to ensure that the partialSign transaction does not expire */
// Ensure you create your nonce account as below
// NOTE: THIS MUST BE RUN AS THE BACKEND WALLET
/*
      solana-keygen new -o nonce-keypair.json
      solana create-nonce-account nonce-keypair.json 1
      solana nonce nonce-keypair.json
      mv nonce-keypair.json utils/keypairs
*/
export const NONCE_ACCOUNT = web3.Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(
      fs.readFileSync(__dirname + '/keypairs/nonce-keypair.json').toString(),
    ),
  ),
)