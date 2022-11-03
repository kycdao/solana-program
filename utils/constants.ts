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
  'KDGqCC5YCLqhoc6anLujvJthNgsQRkFsKPtEbc1SJ9E',
)

export const candyMachine = new web3.PublicKey(
  '9De39qF4wq9wNrUZayxZeCdP7ZR651XVMRXkoygxq6Q7',
)

export const programId = new web3.PublicKey(
  'BbHYKRCkydNbXg5GoxPr4oroqpAQc3rZTdUcJeY2sKDm',
)
