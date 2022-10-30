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

/* seeds of the PDA, can be anything you want */
/* remember to change them on the contract too (state.rs file) */
export const PREFIX = '0LZ3DI4S2B'
export const SUFIX = '0LZ3DI4S2B'

/* replace the following with your own pubkeys */
export const candyMachine = new web3.PublicKey(
  '5FqxnL6HtvtyEv6ixRMxkZKzVVsQ9kGPSmmhavxN3g2',
)

export const programId = new web3.PublicKey(
  'HdvMKawAov2R12ErgLhwMJeZQ36ZpLrdfcBNYhFSq9FZ',
)
