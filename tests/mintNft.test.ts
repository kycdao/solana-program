import {
  Program,
  web3,
  workspace,
  setProvider,
  AnchorProvider,
} from '@project-serum/anchor'
import { KycDao } from '../target/types/kyc_dao'
import {
  MintLayout,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createMintToInstruction,
} from '@solana/spl-token'
import {
  TOKEN_METADATA_PROGRAM_ID,
  candyMachine,
} from '../tests/utils/constants'
import {
  createAssociatedTokenAccountInstruction,
  getMetadata,
  getTokenWallet,
  MY_WALLET,
  RECEIVER_WALLET,
} from '../tests/utils/utils'
import { createSignature } from './utils/ethSignature'
import initializeCandyMachine from '../scripts/initializeCandyMachine'
import * as assert from 'assert'

const { Keypair, SystemProgram, PublicKey, SYSVAR_RENT_PUBKEY } = web3

describe('tests', () => {
  setProvider(AnchorProvider.env())

  const program = workspace.KycDao as Program<KycDao>

  // it('can initialize candy machine', async () => {
  //   initializeCandyMachine()
  // })

  /* after initializing, comment the above and uncomment the below */
  MY_WALLET
  it('can mint an NFT', async () => {
    /* the transaction payer will almost always be yourself */
    const payer = MY_WALLET.publicKey
    const receiver = RECEIVER_WALLET.publicKey

    try {
      /* this is just a configuration file with variables for each NFT */
      const candyMachineState = await program.account.candyMachine.fetch(
        candyMachine,
      )

      const mint = Keypair.generate()
      const token = await getTokenWallet(payer, mint.publicKey)
      const metadata = await getMetadata(mint.publicKey)

      const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
        MintLayout.span,
      )

      const nftName = 'Ronaldinho Gaúcho'
      const nftImage = 'https://api.amoebits.io/get/amoebits_1'

      const {
        actual_message,
        signature,
        recoveryId,
        eth_address,
      } = await createSignature(nftName, nftImage)

      const tx = await program.rpc.mintNft(
        Buffer.from(actual_message),
        Buffer.from(signature),
        recoveryId,
        nftName,
        nftImage,
        {
          accounts: {
            candyMachine,
            wallet: candyMachineState.wallet,
            mint: mint.publicKey,
            metadata,
            mintAuthority: MY_WALLET.publicKey,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          },
          signers: [mint, MY_WALLET],
          instructions: [
            /* Create the Secp256k1Program instruction on-chain*/
            web3.Secp256k1Program.createInstructionWithEthAddress({
              ethAddress: eth_address,
              message: actual_message,
              signature: signature,
              recoveryId: recoveryId,
            }),
            /* create a token/mint account and pay the rent */
            SystemProgram.createAccount({
              fromPubkey: MY_WALLET.publicKey,
              newAccountPubkey: mint.publicKey,
              space: MintLayout.span,
              lamports: rent,
              programId: TOKEN_PROGRAM_ID,
            }),
            createInitializeMintInstruction(
              TOKEN_PROGRAM_ID,
              0, // decimals
              mint.publicKey,
              MY_WALLET.publicKey, // mint authority
              MY_WALLET.publicKey, // freeze authority
            ),
            /* create an account that will hold your NFT */
            createAssociatedTokenAccountInstruction(
              token, // associated account
              MY_WALLET.publicKey, // payer
              RECEIVER_WALLET.publicKey, // wallet address (to)
              mint.publicKey, // mint/token address
            ),
            /* mint 1 (and only) NFT to the mint account */
            createMintToInstruction(
              mint.publicKey, // Public key of the mint
              token, // Address of the token account to mint to
              MY_WALLET.publicKey, // The mint authority
              1, // Amount
              [], // Multisig, if any
              TOKEN_PROGRAM_ID, // SPL Token program account
            ),
          ],
        },
      )
      console.log('Transaction signature:', tx)
    } catch (e) {
      throw e
    }
  })
})
