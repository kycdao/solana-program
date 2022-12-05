import { web3 } from '@project-serum/anchor'
import { PublicKey } from '@solana/web3.js'

export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
)

/* metaplex program */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
)

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
)

//TODO: This address is explicitly for the devnet, we need to change this for mainnet
//https://pyth.network/price-feeds/crypto-sol-usd?cluster=devnet
export const PRICE_FEED = new PublicKey(
  'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix',
)

export const SUBSCRIPTION_COST_DECIMALS = 8
export const SECS_IN_YEAR = 365 * 24 * 60 * 60

/* seeds of the PDA, can be anything you want */
/* remember to change them on the contract too (state.rs file) */
export const KYCDAO_COLLECTION_KYC_SEED = 'KYCDAO_COLLECTION_KYC_SEED_2'
export const KYCDAO_STATUS_KYC_SEED = 'KYCDAO_STATUS_KYC_SEED'
export const KYCDAO_AUTHMINT_KYC_SEED = 'KYCDAO_AUTHMINT_KYC_SEED_1';

export const programId = new web3.PublicKey(
  '7CsRBRHVievYBbbm2L3b26wXY4qhXpF12RvokPzyAZsH',
)
