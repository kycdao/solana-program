import { web3, workspace, Program, AnchorProvider, setProvider } from '@project-serum/anchor'
import { PublicKey } from '@solana/web3.js'
import { KycDao } from '../target/types/kyc_dao'

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

// Current address is explicitly for the devnet, see below addr for mainnet
// https://pyth.network/price-feeds/crypto-sol-usd?cluster=devnet
// mainnet-addr = H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG
export const PRICE_FEED = new PublicKey(
  'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix',
)

export const SUBSCRIPTION_COST_DECIMALS = 8
export const SECS_IN_YEAR = 365 * 24 * 60 * 60

/* seeds of the PDA, can be anything you want */
/* remember to change them on the contract too (state.rs file) */
export const KYCDAO_COLLECTION_KYC_SEED = 'KYCDAO_COLLECTION_KYC_SEED'
export const KYCDAO_STATUS_KYC_SEED = 'KYCDAO_STATUS_KYC_SEED'

export const KYCDAO_STATUS_SIZE = 8  +  // < discriminator   
                                  1  +  // pub is_valid: bool,
                                  8  +  // pub expiry: u64,
                                  64    // pub verification_tier: String (?),    

// IMPORTANT
// If setProvider is not called, the program will not be able to find the programId
// and you'll get REALLY cryptic errors
setProvider(AnchorProvider.env())
const kycdaoProgram = workspace.KycDao as Program<KycDao>
export const KYCDAO_PROGRAM_ID = kycdaoProgram.programId

