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
  createFreezeAccountInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token'
import { TOKEN_METADATA_PROGRAM_ID, candyMachine } from '../utils/constants'
import {
  createAssociatedTokenAccountInstruction,
  getMetadata,
  getTokenWallet,
  MY_WALLET,
  RECEIVER_WALLET,
} from '../utils/utils'
import { createSignature } from '../utils/ethSignature'
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

  it('can mint an NFT', async () => {
    try {
      /* this is just a configuration file with variables for each NFT */
      const candyMachineState = await program.account.candyMachine.fetch(
        candyMachine,
      )
      const mint = Keypair.generate()
      const token = await getTokenWallet(MY_WALLET.publicKey, mint.publicKey)
      const metadata = await getMetadata(mint.publicKey)

      const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
        MintLayout.span,
      )

      const nftName = 'Marmold101'
      const nftImage = 'https://api.amoebits.io/get/amoebits_101'

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
            associatedAccount: token,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          },
          signers: [mint, MY_WALLET],
          instructions: [
            /* Create a Secp256k1Program instruction on-chain*/
            web3.Secp256k1Program.createInstructionWithEthAddress({
              ethAddress: eth_address,
              message: actual_message,
              signature: signature,
              recoveryId: recoveryId,
            }),
            /* Create a token/mint account and pay the rent */
            SystemProgram.createAccount({
              fromPubkey: MY_WALLET.publicKey,
              newAccountPubkey: mint.publicKey,
              space: MintLayout.span,
              lamports: rent,
              programId: TOKEN_PROGRAM_ID,
            }),
            /* Initialize the mint*/
            createInitializeMintInstruction(
              mint.publicKey,
              0,
              MY_WALLET.publicKey,
              MY_WALLET.publicKey,
              TOKEN_PROGRAM_ID,
            ),
            /* Create an account that will hold the NFT */
            createAssociatedTokenAccountInstruction(
              token,
              MY_WALLET.publicKey,
              MY_WALLET.publicKey,
              mint.publicKey,
            ),
            /* mint 1 (and only) NFT to the mint account */
            createMintToInstruction(
              mint.publicKey,
              token,
              MY_WALLET.publicKey,
              1,
              [],
              TOKEN_PROGRAM_ID,
            ),
            /* Can either be set in the contract or here */
            // createFreezeAccountInstruction(
            //   token,
            //   mint.publicKey,
            //   MY_WALLET.publicKey,
            //   [],
            //   TOKEN_PROGRAM_ID,
            // ),
            /* Set the authority of the FreezeAccount type to none */
            // createSetAuthorityInstruction(
            //   mint.publicKey,
            //   MY_WALLET.publicKey,
            //   AuthorityType.FreezeAccount,
            //   null,
            //   [],
            //   TOKEN_PROGRAM_ID,
            // ),
          ],
        },
      )
      console.log('Transaction signature:', tx)
    } catch (e) {
      throw e
    }
  })
})
