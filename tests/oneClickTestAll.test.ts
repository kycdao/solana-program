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
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  TOKEN_METADATA_PROGRAM_ID,
  PRICE_FEED,
  programId,
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
import getPastEvents from '../scripts/getPastEvents'
import getLogInluding from '../scripts/getLogInluding'
import findTransactionSignature from '../scripts/getTransactionSignatures'
import initializeCandyMachine from '../scripts/initializeCandyMachine'
import initializeStateMachine from '../scripts/initializeStateMachine'
import updateCandyMachine from '../scripts/updateCandyMachine'
import updateStateMachine from '../scripts/updateStateMachine'
import * as assert from 'assert'
import { expect } from 'chai'

describe('tests', () => {
  const { Keypair, SystemProgram, PublicKey, SYSVAR_RENT_PUBKEY } = web3
  setProvider(AnchorProvider.env())

  /* 

    This is a one click show all features test.
    This will execute the following sequence:

    1. Initialize the candy machine and the state machine
    2. Should mint a NFT
    3. Should get the isValid boolean flag in the program context
    4. Verify that it cannot be transfered
    5. Verify that it cannot be burned
    6. Verify that its isValid state is true after mint
    7. Should reject in case a different signer calls the function
    7. Will update the isValid state to false
    8. Will update the candy machine to a new price
    9. Will mint paying the new price
    10. Will witdraw the funds from the candy machine
    
  */

  const program = workspace.KycDao as Program<KycDao>
  let associatedAccount
  let isValid
  // COMMENT BAR BELOW TO INIT
  //   let candyMachine
  //   let stateMachine
  //   before('1. Initialize the candy machine and the state machine', async () => {
  //     try {
  //       candyMachine = await initializeCandyMachine()
  //       stateMachine = await initializeStateMachine()
  //     } catch (err) {
  //       throw err
  //     }
  //   })

  //   it('2. Should mint a NFT', async () => {
  //     const candyMachineState = await program.account.candyMachine.fetch(
  //       candyMachine,
  //     )
  //     const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
  //       MintLayout.span,
  //     )

  //     const mint = Keypair.generate()
  //     const metadata = await getMetadata(mint.publicKey)
  //     associatedAccount = await getTokenWallet(
  //       MY_WALLET.publicKey,
  //       mint.publicKey,
  //     )

  //     const nftName = 'Marmold666'
  //     const nftImage = 'https://api.amoebits.io/get/amoebits_666'
  //     const {
  //       actual_message,
  //       signature,
  //       recoveryId,
  //       eth_address,
  //     } = await createSignature(nftName, nftImage)

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
  //           metadata,
  //           mint: mint.publicKey,
  //           associatedAccount: associatedAccount,
  //           mintAuthority: MY_WALLET.publicKey,
  //           priceFeed: PRICE_FEED,
  //           tokenProgram: TOKEN_PROGRAM_ID,
  //           tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
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
  //         ],
  //       },
  //     )
  //     expect(tx).to.not.be.null
  //     console.log('Transaction signature:', tx)

  //     const log = await getLogInluding('Program', program, tx)
  //     expect(mint.publicKey.toBase58()).to.equal(log[0].postTokenBalances[0].mint)
  //     expect('1').to.be.equal(log[0].postTokenBalances[0].uiTokenAmount.amount)
  //   })

  //   it('3. Should get the isValid boolean flag in the program context', async () => {
  //     const tx = await program.rpc.getState({
  //       accounts: {
  //         stateMachine,
  //         associatedAccount,
  //         authority: MY_WALLET.publicKey,
  //       },
  //       signers: [MY_WALLET],
  //     })
  //     expect(tx).not.to.be.null
  //     console.log('Transaction signature:', tx)

  //     const log = await getLogInluding('KycDAO', program, tx)
  //     const tokenAccount = log[0].events[0].split(' ')[4]
  //     isValid = log[0].events[0].split(' ')[7]
  //     expect(isValid).to.contain.oneOf(['true', 'false'])
  //     expect(associatedAccount.toString()).to.be.equal(tokenAccount)
  //   })

  //   it('4. Should update the isValid state to false', async () => {
  //     let tx = await program.rpc.updateStateMachine(!isValid, {
  //       accounts: {
  //         stateMachine,
  //         associatedAccount,
  //         authority: MY_WALLET.publicKey,
  //       },
  //       signers: [MY_WALLET],
  //     })
  //     expect(tx).not.to.be.null
  //     console.log('Transaction signature:', tx)

  //     let log = await getLogInluding('KycDAO', program, tx)
  //     const fromValue = log[0].events[0].split(' ')[5]
  //     const toValue = log[0].events[0].split(' ')[7]
  //     expect(fromValue).to.be.equal(isValid.toString())
  //     expect(toValue).to.be.equal((!isValid).toString())

  //     tx = await program.rpc.getState({
  //       accounts: {
  //         stateMachine,
  //         associatedAccount,
  //         authority: MY_WALLET.publicKey,
  //       },
  //       signers: [MY_WALLET],
  //     })
  //     expect(tx).not.to.be.null
  //     console.log('Transaction signature:', tx)

  //     log = await getLogInluding('KycDAO', program, tx)
  //     const tokenAccount = log[0].events[0].split(' ')[4]
  //     isValid = log[0].events[0].split(' ')[7]
  //     expect(isValid).to.contain.oneOf(['true', 'false'])
  //     expect(associatedAccount.toString()).to.be.equal(tokenAccount)
  //   })

  it('5. Should update the candy machine price', async () => {
    const candyMachineState = await program.account.candyMachine.fetch(
      candyMachine,
    )
    const candyMachinePrice = candyMachineState.data.price
    const CandyMachinePriceToNumber = candyMachinePrice.toNumber()
    const price = 10
    const tx = await updateCandyMachine(price)
    const log = await getLogInluding('KycDAO: Price', program, tx)
    const fromValue = log[0].events[0].split(' ')[6]
    const toValue = log[0].events[0].split(' ')[8]
    expect(fromValue).to.be.equal(CandyMachinePriceToNumber.toString())
    expect(toValue).to.be.equal((price * LAMPORTS_PER_SOL).toString())
  })
  it('6. Should pay the new price', async () => {})

  it('6. Shoud fail to mint with a different signer', async () => {})

  it('6. Should fail to transfer', async () => {})
  it('6. Should fail to burn', async () => {})
  //   it('6. Should update the candy machine signer', async () => {
  //     const ethAddress = '0x532DC3A96ec91D4741b1f0FeE8c41A4E2914C5B3'
  //     const price = 5
  //     await updateCandyMachine(price, ethAddress)
  //   })
})
