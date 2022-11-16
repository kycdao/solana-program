import {
  Program,
  web3,
  workspace,
  setProvider,
  AnchorProvider,
  BN,
} from '@project-serum/anchor'
import {
  LAMPORTS_PER_SOL,
  Connection,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import idl from '../target/idl/kyc_dao.json'
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
  PRICE_FEED,
  candyMachine,
  stateMachine,
  programId,
  STATE_PREFIX,
  STATE_SUFIX,
  CANDY_PREFIX,
  CANDY_SUFIX,
} from '../utils/constants'
import { ethers } from 'ethers'
import {
  createAssociatedTokenAccountInstruction,
  getMetadata,
  getTokenWallet,
  MY_WALLET,
  RECEIVER_WALLET,
  parsePrice,
} from '../utils/utils'
import { createSignature } from '../utils/ethSignature'
import getPastEvents from '../scripts/getPastEvents'
import findTransactionSignature from '../scripts/getTransactionSignatures'
import initializeCandyMachine from '../scripts/initializeCandyMachine'
import initializeStateMachine from '../scripts/initializeStateMachine'
import updateCandyMachine from '../scripts/updateCandyMachine'
import updateStateMachine from '../scripts/updateStateMachine'
import getLogInluding from '../scripts/getLogInluding'
import { expect } from 'chai'
import * as assert from 'assert'
import * as dotenv from 'dotenv'
dotenv.config()

const { Keypair, SystemProgram, PublicKey, SYSVAR_RENT_PUBKEY } = web3

describe('tests', () => {
  setProvider(AnchorProvider.env())

  /* 

    Start by initializing the accounts that will hold state records

    The state machine and candy machine is initialized with a bump seed, which is used to
    calculate the program address. The state machine account is used to create
    store data of given accounts on-chain. The candy machine account is used to
    store global information for the minting process and the program information overall.

    After both accounts are initialized, we can now mint tokens and manage their state.
    But first, we need to change both pubKeys returned from the initialization process
    in the 'constants.ts' file. So our mint can use their accounts as context.
    
  */

  it('Should initialize the Candy Machine', async () => {
    try {
      expect(await initializeCandyMachine()).to.be.equal(true)
    } catch (err) {
      throw err
    }
  })

  // it('Should fail to initialize Candy Machine a second time', async () => {
  //   try {
  //     await initializeCandyMachine()
  //   } catch (err) {
  //     expect(err).to.not.be.null
  //   }
  // })

  // it('Should fail to initialize Candy Machine a second time with a different account', async () => {
  //   try {
  //     const { SystemProgram, PublicKey } = web3

  //     /* lib */
  //     const program = workspace.KycDao as Program<KycDao>

  //     /* ethereum wallet settings */
  //     const eth_signer: ethers.Wallet = new ethers.Wallet(
  //       process.env.ETH_PRIVATE_KEY,
  //       ethers.getDefaultProvider(),
  //     )
  //     const eth_address = ethers.utils
  //       .computeAddress(eth_signer.publicKey)
  //       .slice(2)

  //     /* calculates the program address using seeds from 'constants.ts'*/
  //     const [candyMachine, bump] = await PublicKey.findProgramAddress(
  //       [Buffer.from(CANDY_PREFIX), Buffer.from(CANDY_SUFIX)],
  //       new PublicKey(idl.metadata.address),
  //     )

  //     /* initialize candy machine */
  //     const tx = await program.rpc.initializeCandyMachine(
  //       bump,
  //       {
  //         ethSigner: ethers.utils.arrayify('0x' + eth_address),
  //         price: new BN(parsePrice(0.5)),
  //         symbol: 'LLL',
  //         sellerFeeBasisPoints: 500, // 500 = 5%
  //         nftsMinted: new BN(0),
  //         maxSupply: new BN(48),
  //         creators: [
  //           { address: RECEIVER_WALLET.publicKey, verified: true, share: 100 },
  //         ],
  //       } as any,
  //       {
  //         accounts: {
  //           candyMachine,
  //           wallet: RECEIVER_WALLET.publicKey, // who will receive the SOL of each mint
  //           authority: RECEIVER_WALLET.publicKey,
  //           systemProgram: SystemProgram.programId,
  //         },
  //         signers: [RECEIVER_WALLET],
  //       },
  //     )
  //     console.log('\nThe transaction tx:\n', tx)

  //     /* Fetch the public key generated after initialization */
  //     const log = await getLogInluding('pubKey', program, tx)
  //     const pubkey = log[0].events[0].split(' ')[5]
  //     console.log('CandyMachine public key:\n', pubkey)
  //     console.log('\n Change your pubkey in "src/utils/constants.ts"')
  //   } catch (err) {
  //     expect(err).not.to.be.null
  //   }
  // })

  // it('Should update the candy machine price', async () => {
  //   const program = workspace.KycDao as Program<KycDao>
  //   const candyMachineState = await program.account.candyMachine.fetch(
  //     candyMachine,
  //   )
  //   const candyMachinePrice = candyMachineState.data.price
  //   const CandyMachinePriceToNumber = candyMachinePrice.toNumber()
  //   const price = 0.1
  //   const tx = await updateCandyMachine(price)
  //   const log = await getLogInluding('KycDAO: Price', program, tx)
  //   const fromValue = log[0].events[0].split(' ')[6]
  //   const toValue = log[0].events[0].split(' ')[8]
  //   expect(fromValue).to.be.equal(CandyMachinePriceToNumber.toString())
  //   expect(toValue).to.be.equal((price * LAMPORTS_PER_SOL).toString())
  // })

  // it('Should fail to update the candy machine price with a different account', async () => {
  //   const program = workspace.KycDao as Program<KycDao>
  //   const candyMachineState = await program.account.candyMachine.fetch(
  //     candyMachine,
  //   )
  //   const candyMachinePrice = candyMachineState.data.price
  //   const CandyMachinePriceToNumber = candyMachinePrice.toNumber()
  //   const price = 10
  //   try {
  //     const tx = await updateCandyMachine(
  //       price,
  //       '0xAAB27b150451726EC7738aa1d0A94505c8729bd1',
  //       RECEIVER_WALLET,
  //     )
  //   } catch (err) {
  //     expect(err).not.to.be.null
  //   }
  // })

  /* After initialized, both generated pubkey should be changed in 'contants.ts'
     comment the above and uncomment the below 
  */

  // it('Should initialize an account to store the bool flag', async () => {
  //   try {
  //     const program = workspace.KycDao as Program<KycDao>

  //     const stateKeypair = Keypair.generate()

  //     const tx = await program.rpc.initializeState({
  //       accounts: {
  //         data: stateKeypair.publicKey,
  //         candyMachine: candyMachine,
  //         payer: MY_WALLET.publicKey,
  //         authority: MY_WALLET.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       },
  //       signers: [stateKeypair, MY_WALLET],
  //     })
  //     console.log('tx', tx)
  //     const log = await getLogInluding('pubKey', program, tx)
  //     const pubkey = log[0].events[0].split(' ')[5]
  //     console.log('StateMachine public key:\n', pubkey)
  //     console.log('\n Change your pubkey in "src/utils/constants.ts"')
  //   } catch (e) {
  //     throw e
  //   }
  // })

  // it('Should fail to initialize an account with different owner', async () => {
  //   try {
  //     const program = workspace.KycDao as Program<KycDao>

  //     const stateKeypair = Keypair.generate()

  //     const tx = await program.rpc.initializeState({
  //       accounts: {
  //         data: stateKeypair.publicKey,
  //         candyMachine: candyMachine,
  //         payer: RECEIVER_WALLET.publicKey,
  //         authority: RECEIVER_WALLET.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       },
  //       signers: [stateKeypair, RECEIVER_WALLET],
  //     })
  //   } catch (err) {
  //     expect(err).not.to.be.null
  //   }
  // })

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
  //     const nftName = 'Marmold666'
  //     const nftImage = 'https://api.amoebits.io/get/amoebits_666'
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
  //           wallet: candyMachineState.wallet,
  //           metadata,
  //           mint: mint.publicKey,
  //           associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
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
  //     console.log('tx', tx)
  //     expect(tx).not.to.be.null
  //   } catch (e) {
  //     throw e
  //   }
  // })

  // it('Should mint a Soulbounded NFT setting the isValid state to true', async () => {
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
  //     const nftName = 'Marmold666'
  //     const nftImage = 'https://api.amoebits.io/get/amoebits_666'
  //     const {
  //       actual_message,
  //       signature,
  //       recoveryId,
  //       eth_address,
  //     } = await createSignature(nftName, nftImage)

  //     /* nft mint */
  //     let tx = await program.rpc.mintNft(
  //       Buffer.from(actual_message),
  //       Buffer.from(signature),
  //       recoveryId,
  //       nftName,
  //       nftImage,
  //       {
  //         accounts: {
  //           candyMachine,
  //           wallet: candyMachineState.wallet,
  //           metadata,
  //           mint: mint.publicKey,
  //           associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
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
  //     console.log('\ntx', tx)
  //     console.log('minted NFT to ', associatedAccount.toBase58())

  //     /* Create an account to store the state */
  //     const stateKeypair = Keypair.generate()

  //     tx = await program.rpc.initializeState({
  //       accounts: {
  //         data: stateKeypair.publicKey,
  //         candyMachine: candyMachine,
  //         payer: MY_WALLET.publicKey,
  //         authority: MY_WALLET.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       },
  //       signers: [stateKeypair, MY_WALLET],
  //     })
  //     console.log('\ntx', tx)
  //     console.log(
  //       'initialized state at account',
  //       stateKeypair.publicKey.toBase58(),
  //     )

  //     /* set the NFT to valid */
  //     const isValid = true

  //     tx = await program.rpc.setData(isValid, associatedAccount, {
  //       accounts: {
  //         dataAcc: stateKeypair.publicKey,
  //         authority: MY_WALLET.publicKey,
  //       },
  //       signers: [MY_WALLET],
  //     })
  //     console.log('\ntx', tx)

  //     /* check the state emmited on the log */
  //     /* it starts as false by rust default */
  //     const log = await getLogInluding('KycDAO', program, tx)
  //     const splitLog = log[0].events[0].split(' ')
  //     console.log('State changed from', splitLog[6], 'to', splitLog[8])
  //     expect(tx).not.to.be.null
  //   } catch (err) {
  //     throw err
  //   }
  // })

  // it('Should mint a Soulbounded NFT, fetch the context, set isValid based on context response', async () => {
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
  //     const nftName = 'Marmold666'
  //     const nftImage = 'https://api.amoebits.io/get/amoebits_666'
  //     const {
  //       actual_message,
  //       signature,
  //       recoveryId,
  //       eth_address,
  //     } = await createSignature(nftName, nftImage)

  //     /* nft mint */
  //     let tx = await program.rpc.mintNft(
  //       Buffer.from(actual_message),
  //       Buffer.from(signature),
  //       recoveryId,
  //       nftName,
  //       nftImage,
  //       {
  //         accounts: {
  //           candyMachine,
  //           wallet: candyMachineState.wallet,
  //           metadata,
  //           mint: mint.publicKey,
  //           associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
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
  //     console.log('\ntx', tx)
  //     console.log('minted NFT to ', associatedAccount.toBase58())

  //     /* Create an account to store the state */
  //     const stateKeypair = Keypair.generate()

  //     tx = await program.rpc.initializeState({
  //       accounts: {
  //         data: stateKeypair.publicKey,
  //         candyMachine: candyMachine,
  //         payer: MY_WALLET.publicKey,
  //         authority: MY_WALLET.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       },
  //       signers: [stateKeypair, MY_WALLET],
  //     })
  //     console.log('\ntx', tx)
  //     console.log(
  //       'initialized state at account',
  //       stateKeypair.publicKey.toBase58(),
  //     )

  //     /* fetch NFT data */
  //     let stateContext = await program.account.data.fetch(
  //       stateKeypair.publicKey,
  //     )
  //     let isValid = stateContext.isValid
  //     console.log('current isValid value', isValid)
  //     expect(isValid).to.be.false

  //     /* set the NFT to valid */
  //     tx = await program.rpc.setData(!isValid, associatedAccount, {
  //       accounts: {
  //         dataAcc: stateKeypair.publicKey,
  //         authority: MY_WALLET.publicKey,
  //       },
  //       signers: [MY_WALLET],
  //     })
  //     console.log('\ntx', tx)

  //     /* check the state emmited on the log */
  //     const log = await getLogInluding('KycDAO', program, tx)
  //     const splitLog = log[0].events[0].split(' ')
  //     console.log('State changed from', splitLog[6], 'to', splitLog[8])
  //     expect(tx).not.to.be.null

  //     /* fetch NFT data */
  //     stateContext = await program.account.data.fetch(stateKeypair.publicKey)
  //     isValid = stateContext.isValid
  //     console.log('current isValid value', isValid)
  //     expect(isValid).to.be.true
  //   } catch (err) {
  //     throw err
  //   }
  // })

  // it('Should mint a Soulbounded NFT, fail to set state with a different owner', async () => {
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
  //     const nftName = 'Marmold666'
  //     const nftImage = 'https://api.amoebits.io/get/amoebits_666'
  //     const {
  //       actual_message,
  //       signature,
  //       recoveryId,
  //       eth_address,
  //     } = await createSignature(nftName, nftImage)

  //     /* nft mint */
  //     let tx = await program.rpc.mintNft(
  //       Buffer.from(actual_message),
  //       Buffer.from(signature),
  //       recoveryId,
  //       nftName,
  //       nftImage,
  //       {
  //         accounts: {
  //           candyMachine,
  //           wallet: candyMachineState.wallet,
  //           metadata,
  //           mint: mint.publicKey,
  //           associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
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
  //     console.log('\ntx', tx)
  //     console.log('minted NFT to ', associatedAccount.toBase58())

  //     /* Create an account to store the state */
  //     const stateKeypair = Keypair.generate()

  //     tx = await program.rpc.initializeState({
  //       accounts: {
  //         data: stateKeypair.publicKey,
  //         candyMachine: candyMachine,
  //         payer: MY_WALLET.publicKey,
  //         authority: MY_WALLET.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       },
  //       signers: [stateKeypair, MY_WALLET],
  //     })
  //     console.log('\ntx', tx)
  //     console.log(
  //       'initialized state at account',
  //       stateKeypair.publicKey.toBase58(),
  //     )

  //     /* fetch NFT data */
  //     let stateContext = await program.account.data.fetch(
  //       stateKeypair.publicKey,
  //     )
  //     let isValid = stateContext.isValid
  //     console.log('current isValid value', isValid)
  //     expect(isValid).to.be.false

  //     /* set the NFT to valid */
  //     tx = await program.rpc.setData(!isValid, associatedAccount, {
  //       accounts: {
  //         dataAcc: stateKeypair.publicKey,
  //         authority: RECEIVER_WALLET.publicKey,
  //       },
  //       signers: [RECEIVER_WALLET],
  //     })
  //   } catch (err) {
  //     expect(err).not.to.be.null
  //   }
  // })

  // it('Shoud fail to mint with a different signer', async () => {
  //   const program = workspace.KycDao as Program<KycDao>
  //   const candyMachineState = await program.account.candyMachine.fetch(
  //     candyMachine,
  //   )
  //   const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
  //     MintLayout.span,
  //   )

  //   const mint = Keypair.generate()
  //   const metadata = await getMetadata(mint.publicKey)
  //   const associatedAccount = await getTokenWallet(
  //     MY_WALLET.publicKey,
  //     mint.publicKey,
  //   )

  //   const nftName = 'Marmold666'
  //   const nftImage = 'https://api.amoebits.io/get/amoebits_666'
  //   const eth_signer: ethers.Wallet = ethers.Wallet.createRandom()

  //   let eth_address: string // Ethereum address to be recovered and checked against
  //   let full_sig: string // 64 bytes + recovery byte
  //   let signature: Uint8Array // 64 bytes of sig
  //   let recoveryId: number // recovery byte (u8)
  //   let actual_message: Buffer // actual signed message with Ethereum Message prefix

  //   const messageHash: string = ethers.utils.solidityKeccak256(
  //     ['string', 'string'],
  //     [nftName, nftImage],
  //   )
  //   const messageHashBytes: Uint8Array = ethers.utils.arrayify(messageHash)
  //   full_sig = await eth_signer.signMessage(messageHashBytes)

  //   let full_sig_bytes = ethers.utils.arrayify(full_sig)
  //   signature = full_sig_bytes.slice(0, 64)
  //   recoveryId = full_sig_bytes[64] - 27

  //   let msg_digest = ethers.utils.arrayify(
  //     ethers.utils.solidityKeccak256(['string', 'string'], [nftName, nftImage]),
  //   )
  //   actual_message = Buffer.concat([
  //     Buffer.from('\x19Ethereum Signed Message:\n32'),
  //     msg_digest,
  //   ])

  //   eth_address = ethers.utils.computeAddress(eth_signer.publicKey).slice(2)

  //   try {
  //     const tx = await program.rpc.mintNft(
  //       Buffer.from(actual_message),
  //       Buffer.from(signature),
  //       recoveryId,
  //       nftName,
  //       nftImage,
  //       {
  //         accounts: {
  //           candyMachine,
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
  //   } catch (err) {
  //     console.log(err.errorLogs[0])
  //     expect(err.errorLogs[0]).to.be.equal(
  //       'Program log: AnchorError occurred. Error Code: SignatureVerificationFailed. Error Number: 6001. Error Message: The signature data provded to validate the metadata is incorrect.',
  //     )
  //   }
  // })

  // it('Should mint a Soulbounded NFT with another account', async () => {
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
  //     const nftName = 'Marmold666'
  //     const nftImage = 'https://api.amoebits.io/get/amoebits_666'
  //     const {
  //       actual_message,
  //       signature,
  //       recoveryId,
  //       eth_address,
  //     } = await createSignature(nftName, nftImage)

  //     /* First we create all sort of accounts  */

  //     const connection = new Connection(
  //       'https://api.devnet.solana.com',
  //       'confirmed',
  //     )
  //     const instructions = new Transaction().add(
  //       /* create a token/mint account and pay the rent */
  //       SystemProgram.createAccount({
  //         fromPubkey: RECEIVER_WALLET.publicKey,
  //         newAccountPubkey: mint.publicKey,
  //         space: MintLayout.span,
  //         lamports: rent,
  //         programId: TOKEN_PROGRAM_ID,
  //       }),
  //       /* initialize the mint*/
  //       createInitializeMintInstruction(
  //         mint.publicKey,
  //         0,
  //         MY_WALLET.publicKey,
  //         MY_WALLET.publicKey,
  //         TOKEN_PROGRAM_ID,
  //       ),
  //       /* create an account that will hold the NFT */
  //       createAssociatedTokenAccountInstruction(
  //         associatedAccount,
  //         RECEIVER_WALLET.publicKey,
  //         MY_WALLET.publicKey,
  //         mint.publicKey,
  //       ),
  //       /* mint 1 (and only) NFT to the mint account */
  //       createMintToInstruction(
  //         mint.publicKey,
  //         associatedAccount,
  //         MY_WALLET.publicKey,
  //         1,
  //         [],
  //         TOKEN_PROGRAM_ID,
  //       ),
  //     )
  //     instructions.feePayer = RECEIVER_WALLET.publicKey
  //     let tx = await sendAndConfirmTransaction(connection, instructions, [
  //       mint,
  //       MY_WALLET,
  //       RECEIVER_WALLET,
  //     ])
  //     console.log('tx', tx)

  //     const mintInstruction = program.instruction.mintNft(
  //       Buffer.from(actual_message),
  //       Buffer.from(signature),
  //       recoveryId,
  //       nftName,
  //       nftImage,
  //       {
  //         accounts: {
  //           candyMachine,
  //           wallet: candyMachineState.wallet,
  //           metadata,
  //           mint: mint.publicKey,
  //           associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
  //           mintAuthority: MY_WALLET.publicKey,
  //           priceFeed: PRICE_FEED,
  //           tokenProgram: TOKEN_PROGRAM_ID,
  //           tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  //           systemProgram: SystemProgram.programId,
  //           rent: SYSVAR_RENT_PUBKEY,
  //           ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //         },
  //         signers: [MY_WALLET],
  //         instructions: [
  //           /* create a Secp256k1Program instruction on-chain*/
  //           web3.Secp256k1Program.createInstructionWithEthAddress({
  //             ethAddress: eth_address,
  //             message: actual_message,
  //             signature: signature,
  //             recoveryId: recoveryId,
  //           }),
  //         ],
  //       },
  //     )

  //     const mintInstructions = new Transaction().add(mintInstruction)
  //     mintInstructions.feePayer = RECEIVER_WALLET.publicKey
  //     tx = await sendAndConfirmTransaction(connection, mintInstructions, [
  //       MY_WALLET,
  //       RECEIVER_WALLET,
  //     ])

  //     /* nft mint */
  //     // tx = await program.rpc.mintNft(
  //     //   Buffer.from(actual_message),
  //     //   Buffer.from(signature),
  //     //   recoveryId,
  //     //   nftName,
  //     //   nftImage,
  //     //   {
  //     //     accounts: {
  //     //       candyMachine,
  //     //       wallet: candyMachineState.wallet,
  //     //       metadata,
  //     //       mint: mint.publicKey,
  //     //       associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
  //     //       mintAuthority: MY_WALLET.publicKey,
  //     //       payer: RECEIVER_WALLET.publicKey,
  //     //       priceFeed: PRICE_FEED,
  //     //       tokenProgram: TOKEN_PROGRAM_ID,
  //     //       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  //     //       systemProgram: SystemProgram.programId,
  //     //       rent: SYSVAR_RENT_PUBKEY,
  //     //       ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //     //     },
  //     //     signers: [RECEIVER_WALLET, MY_WALLET],
  //     //     instructions: [
  //     //       /* create a Secp256k1Program instruction on-chain*/
  //     //       web3.Secp256k1Program.createInstructionWithEthAddress({
  //     //         ethAddress: eth_address,
  //     //         message: actual_message,
  //     //         signature: signature,
  //     //         recoveryId: recoveryId,
  //     //       }),
  //     //     ],
  //     //   },
  //     // )
  //     console.log('tx', tx)
  //     expect(tx).not.to.be.null
  //   } catch (e) {
  //     throw e
  //   }
  // })
})
