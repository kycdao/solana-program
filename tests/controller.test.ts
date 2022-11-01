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
import {
  TOKEN_METADATA_PROGRAM_ID,
  candyMachine,
  stateMachine,
} from '../utils/constants'
import {
  createAssociatedTokenAccountInstruction,
  getMetadata,
  getTokenWallet,
  MY_WALLET,
} from '../utils/utils'
import { createSignature } from '../utils/ethSignature'
import initializeCandyMachine from '../scripts/initializeCandyMachine'
import initializeStateMachine from '../scripts/initializeStateMachine'
import updateCandyMachine from '../scripts/updateCandyMachine'
import updateStateMachine from '../scripts/updateStateMachine'
import * as assert from 'assert'

const { Keypair, SystemProgram, PublicKey, SYSVAR_RENT_PUBKEY } = web3

describe('tests', () => {
  setProvider(AnchorProvider.env())

  /* Start by initializing the accounts that will hold state records  */

  it('Should initialize Candy Machine', async () => {
    try {
      await initializeCandyMachine()
    } catch (err) {
      throw err
    }
  })

  it('Should initialize State Machine', async () => {
    try {
      await initializeStateMachine()
    } catch (err) {
      throw err
    }
  })

  // it('Should update the candy machine eth signer', async () => {
  //   try {
  //     const ethAddress = '0x532DC3A96ec91D4741b1f0FeE8c41A4E2914C5B3'
  //     const price = 0.7
  //     await updateCandyMachine(price)
  //   } catch (e) {
  //     throw e
  //   }
  // })

  /* after initialized, both generated pubkey should be changed in 'contants.ts'
   * comment the above and uncomment the below
   */

  // it('Should mint a Soulbounded NFT', async () => {
  //   try {
  //     /* this is our lib.rs */
  //     const program = workspace.KycDao as Program<KycDao>

  //     /* this fetches the current candyMachine wallet to receive mint fees */
  //     const candyMachineState = await program.account.candyMachine.fetch(
  //       candyMachine,
  //     )

  //     /* mint authority will handle the mint session */
  //     const mint = Keypair.generate()
  //     const associatedAccount = await getTokenWallet(
  //       MY_WALLET.publicKey,
  //       mint.publicKey,
  //     )
  //     const metadata = await getMetadata(mint.publicKey)

  //     const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
  //       MintLayout.span,
  //     )

  //     /* nft data */
  //     const nftName = 'Marmold200'
  //     const nftImage = 'https://api.amoebits.io/get/amoebits_200'
  //     const {
  //       actual_message,
  //       signature,
  //       recoveryId,
  //       eth_address,
  //     } = await createSignature(nftName, nftImage)

  //     /* nft mint */
  //     const tx = await program.rpc.mintNft(
  //       Buffer.from(actual_message),
  //       Buffer.from(signature),
  //       recoveryId,
  //       nftName,
  //       nftImage,
  //       {
  //         accounts: {
  //           candyMachine,
  //           stateMachine,
  //           wallet: candyMachineState.wallet,
  //           mint: mint.publicKey,
  //           metadata,
  //           mintAuthority: MY_WALLET.publicKey,
  //           associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
  //           tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  //           tokenProgram: TOKEN_PROGRAM_ID,
  //           systemProgram: SystemProgram.programId,
  //           rent: SYSVAR_RENT_PUBKEY,
  //           ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //         },
  //         signers: [mint, MY_WALLET],
  //         instructions: [
  //           /* create a Secp256k1Program instruction on-chain*/
  //           web3.Secp256k1Program.createInstructionWithEthAddress({
  //             ethAddress: eth_address,
  //             message: actual_message,
  //             signature: signature,
  //             recoveryId: recoveryId,
  //           }),
  //           /* create a token/mint account and pay the rent */
  //           SystemProgram.createAccount({
  //             fromPubkey: MY_WALLET.publicKey,
  //             newAccountPubkey: mint.publicKey,
  //             space: MintLayout.span,
  //             lamports: rent,
  //             programId: TOKEN_PROGRAM_ID,
  //           }),
  //           /* initialize the mint*/
  //           createInitializeMintInstruction(
  //             mint.publicKey,
  //             0,
  //             MY_WALLET.publicKey,
  //             MY_WALLET.publicKey,
  //             TOKEN_PROGRAM_ID,
  //           ),
  //           /* create an account that will hold the NFT */
  //           createAssociatedTokenAccountInstruction(
  //             associatedAccount,
  //             MY_WALLET.publicKey,
  //             MY_WALLET.publicKey,
  //             mint.publicKey,
  //           ),
  //           /* mint 1 (and only) NFT to the mint account */
  //           createMintToInstruction(
  //             mint.publicKey,
  //             associatedAccount,
  //             MY_WALLET.publicKey,
  //             1,
  //             [],
  //             TOKEN_PROGRAM_ID,
  //           ),
  //           // /* Can either be set in the contract or here */
  //           // createFreezeAccountInstruction(
  //           //   associatedAccount,
  //           //   mint.publicKey,
  //           //   MY_WALLET.publicKey,
  //           //   [],
  //           //   TOKEN_PROGRAM_ID,
  //           // ),
  //           // /* Set the authority of the FreezeAccount type to none */
  //           // createSetAuthorityInstruction(
  //           //   mint.publicKey,
  //           //   MY_WALLET.publicKey,
  //           //   AuthorityType.FreezeAccount,
  //           //   null,
  //           //   [],
  //           //   TOKEN_PROGRAM_ID,
  //           // ),
  //         ],
  //       },
  //     )
  //     console.log('Transaction signature:', tx)
  //   } catch (e) {
  //     throw e
  //   }
  // })

  // it('Should mint a Soulbounded NFT and change the bool flag from true to false', async () => {
  //   try {
  //     /* this is our lib.rs */
  //     const program = workspace.KycDao as Program<KycDao>

  //     /* this fetches the current candyMachine wallet to receive mint fees */
  //     const candyMachineState = await program.account.candyMachine.fetch(
  //       candyMachine,
  //     )

  //     /* mint authority will handle the mint session */
  //     const mint = Keypair.generate()
  //     const associatedAccount = await getTokenWallet(
  //       MY_WALLET.publicKey,
  //       mint.publicKey,
  //     )
  //     const metadata = await getMetadata(mint.publicKey)

  //     const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
  //       MintLayout.span,
  //     )

  //     /* nft data */
  //     const nftName = 'Marmold201'
  //     const nftImage = 'https://api.amoebits.io/get/amoebits_201'
  //     const {
  //       actual_message,
  //       signature,
  //       recoveryId,
  //       eth_address,
  //     } = await createSignature(nftName, nftImage)

  //     /* nft mint */
  //     const tx = await program.rpc.mintNft(
  //       Buffer.from(actual_message),
  //       Buffer.from(signature),
  //       recoveryId,
  //       nftName,
  //       nftImage,
  //       {
  //         accounts: {
  //           candyMachine,
  //           stateMachine,
  //           wallet: candyMachineState.wallet,
  //           mint: mint.publicKey,
  //           metadata,
  //           mintAuthority: MY_WALLET.publicKey,
  //           associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
  //           tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  //           tokenProgram: TOKEN_PROGRAM_ID,
  //           systemProgram: SystemProgram.programId,
  //           rent: SYSVAR_RENT_PUBKEY,
  //           ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //         },
  //         signers: [mint, MY_WALLET],
  //         instructions: [
  //           /* create a Secp256k1Program instruction on-chain*/
  //           web3.Secp256k1Program.createInstructionWithEthAddress({
  //             ethAddress: eth_address,
  //             message: actual_message,
  //             signature: signature,
  //             recoveryId: recoveryId,
  //           }),
  //           /* create a token/mint account and pay the rent */
  //           SystemProgram.createAccount({
  //             fromPubkey: MY_WALLET.publicKey,
  //             newAccountPubkey: mint.publicKey,
  //             space: MintLayout.span,
  //             lamports: rent,
  //             programId: TOKEN_PROGRAM_ID,
  //           }),
  //           /* initialize the mint*/
  //           createInitializeMintInstruction(
  //             mint.publicKey,
  //             0,
  //             MY_WALLET.publicKey,
  //             MY_WALLET.publicKey,
  //             TOKEN_PROGRAM_ID,
  //           ),
  //           /* create an account that will hold the NFT */
  //           createAssociatedTokenAccountInstruction(
  //             associatedAccount,
  //             MY_WALLET.publicKey,
  //             MY_WALLET.publicKey,
  //             mint.publicKey,
  //           ),
  //           /* mint 1 (and only) NFT to the mint account */
  //           createMintToInstruction(
  //             mint.publicKey,
  //             associatedAccount,
  //             MY_WALLET.publicKey,
  //             1,
  //             [],
  //             TOKEN_PROGRAM_ID,
  //           ),
  //           /* Can either be set in the contract or here */
  //           // createFreezeAccountInstruction(
  //           //   associatedAccount,
  //           //   mint.publicKey,
  //           //   MY_WALLET.publicKey,
  //           //   [],
  //           //   TOKEN_PROGRAM_ID,
  //           // ),
  //           // /* Set the authority of the FreezeAccount type to none */
  //           // createSetAuthorityInstruction(
  //           //   mint.publicKey,
  //           //   MY_WALLET.publicKey,
  //           //   AuthorityType.FreezeAccount,
  //           //   null,
  //           //   [],
  //           //   TOKEN_PROGRAM_ID,
  //           // ),
  //         ],
  //       },
  //     )
  //     console.log('Transaction signature:', tx)

  //     /* set the bool flag of a token account */
  //     await updateStateMachine(associatedAccount, false)
  //   } catch (e) {
  //     throw e
  //   }
  // })
})
