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

export const PRICE_FEED = new PublicKey(
  'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix',
)

/* seeds of the PDA, can be anything you want */
/* remember to change them on the contract too (state.rs file) */
export const CANDY_PREFIX = '0LZ3DI4S2B'
export const CANDY_SUFIX = '0LZ3DI4S2B'
export const STATE_PREFIX = 'F96G8971BA36F5G4'
export const STATE_SUFIX = 'F96G8971BA36F5G4'

/* replace the following with your own pubkeys */
export const stateMachine = new web3.PublicKey(
  '5CAuGTxJh5U5HW2uNj2552DHzZGFqf2AyHnqTwnYqdeA',
)

export const candyMachine = new web3.PublicKey(
  '5rYk3ibo2kBb58rM1kdVdCCiTZxXJHG16b3DQFXNwBD5',
)

export const programId = new web3.PublicKey(
  '7fnAn3C71EaY5eajsB866AahmdmBUGddURbBaVwkLxW6',
)
