// import {
//   Program,
//   web3,
//   workspace,
//   setProvider,
//   AnchorProvider,
//   BN,
// } from '@project-serum/anchor'
// import {
//   NonceAccount,
//   LAMPORTS_PER_SOL,
//   Connection,
//   Transaction,
//   sendAndConfirmTransaction,
//   sendAndConfirmRawTransaction,
// } from '@solana/web3.js'
// import idl from '../target/idl/ntnft.json'
// import { KycDao } from '../target/types/ntnft'
// import {
//   MintLayout,
//   TOKEN_PROGRAM_ID,
//   createInitializeMintInstruction,
//   createMintToInstruction,
//   createFreezeAccountInstruction,
//   createSetAuthorityInstruction,
//   AuthorityType,
// } from '@solana/spl-token'
// import {
//   TOKEN_METADATA_PROGRAM_ID,
//   PRICE_FEED,
//   programId,
//   KYCDAO_COLLECTION_KYC_SEED,
//   SECS_IN_YEAR
// } from '../utils/constants'
// import { ethers } from 'ethers'
// import {
//   createAssociatedTokenAccountInstruction,
//   getCollectionId,
//   getStatusId,
//   getMetadata,
//   getAuthMintId,
//   getTokenWallet,
//   BACKEND_WALLET,
//   RECEIVER_WALLET,
//   NONCE_ACCOUNT,
//   parsePrice,
// } from '../utils/utils'
// import { createSignature } from '../utils/ethSignature'
// import getPastEvents from '../scripts/getPastEvents'
// import findTransactionSignature from '../scripts/getTransactionSignatures'
// import initializeCollection from '../scripts/initializeCollection'
// import updateCandyMachine from '../scripts/updateCollection'
// import updateStateMachine from '../scripts/updateStateMachine'
// import getLogInluding from '../scripts/getLogInluding'
// import { expect } from 'chai'
// import * as assert from 'assert'
// import * as dotenv from 'dotenv'
// dotenv.config()

// const { Keypair, SystemProgram, PublicKey, SYSVAR_RENT_PUBKEY } = web3

// describe('tests', () => {
//   setProvider(AnchorProvider.env())

//   /* 

//     Start by initializing the accounts that will hold state records

//     The state machine and candy machine is initialized with a bump seed, which is used to
//     calculate the program address. The state machine account is used to create
//     store data of given accounts on-chain. The candy machine account is used to
//     store global information for the minting process and the program information overall.

//     After both accounts are initialized, we can mint tokens and manage their state.
//     But first, we need to change both pubKeys returned from the initialization process
//     in the 'constants.ts' file. So our mint can use their accounts as context.
    
//   */

//   before(async () => {
//     const program = workspace.KycDao as Program<KycDao>
//     const collectionId = await getCollectionId()

//     try {
//       console.log('Checking for collection...')
//       await program.account.kycDaoNftCollection.fetch(
//         collectionId,
//       )
//       console.log('Collection found!')
//     } catch (err) {
//       console.log('Collection not found, initializing...')
//       await initializeCollection()
//     }    
//   }),

// it('Should mint a Soulbounded NFT via authMint', async () => {
//   try {
//     //This code is all running as BACKEND...
//     //Should have access to BACKEND_WALLET and RECEIVER_WALLET.public_key

//     console.log('Running code as BACKEND...')

//     /* this is our lib.rs */
//     const program = workspace.KycDao as Program<KycDao>

//     const collectionId = await getCollectionId()

//     const kycDaoNftCollectionState = await program.account.kycDaoNftCollection.fetch(
//       collectionId,
//     )

//     /* mint authority will handle the mint session */
//     const mint = Keypair.generate()
//     const associatedAccount = await getTokenWallet(
//       RECEIVER_WALLET.publicKey,
//       mint.publicKey,
//     )
//     const metadata = await getMetadata(mint.publicKey)
//     const statusId = await getStatusId(mint.publicKey)

//     const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
//       MintLayout.span,
//     )

//     // Run the authMint
//     const authMintId = await getAuthMintId(associatedAccount)

//     let transaction = await program.methods
//       .initializeKycdaonftAuthmint(
//         {
//           expiry: new BN(1701436998),
//           secondsToPay: new BN(0),
//           // secondsToPay: new BN(SECS_IN_YEAR),
//           metadataCid: 'QmUDyt1mZEMUMLQ1PQj7UnYvo9phLLG6j3TKV7AvW6P4u6',
//           verificationTier: 'one',
//         })
//       .accounts({
//         associatedAccount: associatedAccount,
//         kycdaoNftAuthmint: authMintId,
//         collection: collectionId,
//         authority: BACKEND_WALLET.publicKey,
//         systemProgram: SystemProgram.programId,
//       })
//       .signers([BACKEND_WALLET])
//       .transaction()
//     transaction.feePayer = BACKEND_WALLET.publicKey

//     console.log('running tx for auth mint...')
//     let tx = await sendAndConfirmTransaction(
//       AnchorProvider.env().connection,
//       transaction,
//       [BACKEND_WALLET],
//     )
//     console.log(tx)

//     /* Prepare accounts */
//     transaction = new Transaction().add(
//       /* create a mint account and pay the rent */
//       SystemProgram.createAccount({
//         fromPubkey: BACKEND_WALLET.publicKey,
//         newAccountPubkey: mint.publicKey,
//         space: MintLayout.span,
//         lamports: rent,
//         programId: TOKEN_PROGRAM_ID,
//       }),
//       /* initialize the mint*/
//       createInitializeMintInstruction(
//         mint.publicKey,            // mint
//         0,                         //decimals
//         BACKEND_WALLET.publicKey,  // mint authority
//         BACKEND_WALLET.publicKey,  // freeze authority
//         TOKEN_PROGRAM_ID,          // token program
//       ),
//       /* create a token account that will hold the NFT */
//       createAssociatedTokenAccountInstruction(
//         associatedAccount,          // token account
//         BACKEND_WALLET.publicKey,   // payer
//         RECEIVER_WALLET.publicKey,   // wallet address
//         mint.publicKey,             // mint
//       ),
//       /* mint 1 (and only) NFT to the mint account */
//       createMintToInstruction(
//         mint.publicKey,             // mint
//         associatedAccount,          // token account
//         BACKEND_WALLET.publicKey,   // mint authority
//         1,                          // amount
//         [],                         // multisig
//         TOKEN_PROGRAM_ID,           // token program
//       ),
//     )
//     transaction.feePayer = BACKEND_WALLET.publicKey

//     console.log('running tx for account creations and minting...')
//     tx = await sendAndConfirmTransaction(
//       AnchorProvider.env().connection,
//       transaction,
//       [BACKEND_WALLET, mint],
//     )
//     console.log(tx)

//     console.log('creating transaction for mintWithCode...')

//     const reqAccts = {
//       collection: collectionId,
//       status: statusId,
//       kycdaoNftAuthmint: authMintId,
//       wallet: kycDaoNftCollectionState.wallet,
//       metadata: metadata,
//       mint: mint.publicKey,
//       associatedAccount: associatedAccount,
//       mintAuthority: BACKEND_WALLET.publicKey,
//       feePayer: RECEIVER_WALLET.publicKey,
//       priceFeed: PRICE_FEED,
//       tokenProgram: TOKEN_PROGRAM_ID,
//       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//       systemProgram: SystemProgram.programId,
//       rent: SYSVAR_RENT_PUBKEY,
//     }

//     console.log(`reqAccts: ${JSON.stringify(reqAccts, null, 2)}`)

//     /* mintNFT */
//     transaction = await program.methods
//       .mintWithCode()
//       .accounts(reqAccts)
//       .preInstructions([
//         SystemProgram.nonceAdvance({
//           noncePubkey: NONCE_ACCOUNT.publicKey,
//           authorizedPubkey: BACKEND_WALLET.publicKey,
//         }),
//       ])
//       .transaction()
//     transaction.feePayer = RECEIVER_WALLET.publicKey

//     console.log('Adding nonce as recent blockhash to transaction')
//     let accountInfo = await AnchorProvider.env().connection.getAccountInfo(NONCE_ACCOUNT.publicKey);
//     let nonceAccount = NonceAccount.fromAccountData(accountInfo.data)    
//     // let blockhash = await AnchorProvider.env().connection.getLatestBlockhash('finalized')
//     transaction.recentBlockhash = nonceAccount.nonce
//     console.log(`blockhash is now: ${transaction.recentBlockhash}`)

//     //TODO: Before making the mint_authority a signer we didn't need a BACKEND_WALLET signature...?
//     transaction.partialSign(BACKEND_WALLET)

//     // serialize the transaction to be sent to frontend
//     const serializedTransaction = transaction.serialize({
//       requireAllSignatures: false,
//     })
//     const transactionBase64 = serializedTransaction.toString("base64")
//     console.log(`transactionBase64: ${transactionBase64}`)
//     console.log('passing over to FRONTEND...')

//     // wait for 5 minutes
//     // uncomment this to test transaction doesn't expire after 5 minutes
//     // console.log('waiting 5 minutes...')
//     // await new Promise((resolve) => setTimeout(resolve, 300000))

//     // This code is all running as FRONTEND...
//     // Recover the transaction by de-serializing it
//     console.log('now in the FRONTEND, we can sign with RECEIVER_WALLET')
//     const recoveredTransaction = Transaction.from(
//       Buffer.from(transactionBase64, "base64")
//     )
//     console.log('Recovered the transaction')

//     console.log('Adding signature to transaction')
//     recoveredTransaction.partialSign(RECEIVER_WALLET)

//     console.log('running tx for minting NFT...')
//     // Calling sendAndConfirmRawTransaction() without a confirmationStrategy 
//     // is no longer supported and will be removed in a future version.
//     tx = await sendAndConfirmRawTransaction(
//       AnchorProvider.env().connection,
//       recoveredTransaction.serialize(),
      
//       // TODO: I think the default confirmation strategy uses blockhashes, which
//       // is probably going to expire (about 2 minutes) before the frontend can sign the transaction.
//       // I believe the suggested approach is to use 'durable nonces' instead.
//       // https://solanacookbook.com/references/offline-transactions.html#durable-nonce
//       // Which is pretty... cumbersome.
//       // Also options suggested by copilot...
//       // {
//       //   skipPreflight: true,
//       //   commitment: "singleGossip",
//       //   preflightCommitment: "singleGossip",
//       // },
//     )
//     console.log('tx', tx)
//     expect(tx).not.to.be.null

//     // Check state of the NFT
//     let statusState = await program.account.kycDaoNftStatus.fetch(statusId)
//     console.log(`statusState: ${JSON.stringify(statusState, null, 2)}`)

//     //This code is all running as BACKEND...
//     console.log('additional code running as BACKEND for state update...')

//     // Change the status to isValid false
//     transaction = await program.methods
//       .updateStatus(
//         {
//           isValid: false,
//           expiry: new BN(5),
//           verificationTier: 'two',
//         } as any
//       )
//       .accounts({
//         collection: collectionId,
//         status: statusId,
//         authority: BACKEND_WALLET.publicKey,
//       })
//       .signers([BACKEND_WALLET])
//       .transaction()
//     transaction.feePayer = BACKEND_WALLET.publicKey

//     console.log('running tx for updating status...')
//     tx = await sendAndConfirmTransaction(
//       AnchorProvider.env().connection,
//       transaction,
//       [BACKEND_WALLET],
//     )
//     console.log('tx finished, now fetching new status...')

//     statusState = await program.account.kycDaoNftStatus.fetch(statusId)
//     console.log(`statusState: ${JSON.stringify(statusState, null, 2)}`)
    
//   } catch (e) {
//     throw e
//   }
// })
// })






// // IGNORE ALL THE REST FOR NOW





// //   it('Should fail to initialize Candy Machine a second time', async () => {
// //     try {
// //       await initializeCandyMachine()
// //     } catch (err) {
// //       expect(err).to.not.be.null
// //     }
// //   })

// //   it('Should fail to initialize Candy Machine a second time with a different account', async () => {
// //     try {
// //       const { SystemProgram, PublicKey } = web3

// //       /* lib */
// //       const program = workspace.KycDao as Program<KycDao>

// //       /* ethereum wallet settings */
// //       const eth_signer: ethers.Wallet = new ethers.Wallet(
// //         process.env.ETH_PRIVATE_KEY,
// //         ethers.getDefaultProvider(),
// //       )
// //       const eth_address = ethers.utils
// //         .computeAddress(eth_signer.publicKey)
// //         .slice(2)

// //       /* calculates the program address using seeds from 'constants.ts'*/
// //       const [candyMachine, bump] = await PublicKey.findProgramAddress(
// //         [Buffer.from(CANDY_PREFIX), Buffer.from(CANDY_SUFIX)],
// //         new PublicKey(idl.metadata.address),
// //       )

// //       /* initialize candy machine */
// //       const tx = await program.rpc.initializeCandyMachine(
// //         bump,
// //         {
// //           ethSigner: ethers.utils.arrayify('0x' + eth_address),
// //           price: new BN(parsePrice(0.5)),
// //           symbol: 'LLL',
// //           sellerFeeBasisPoints: 500, // 500 = 5%
// //           nftsMinted: new BN(0),
// //           maxSupply: new BN(48),
// //           creators: [
// //             { address: RECEIVER_WALLET.publicKey, verified: true, share: 100 },
// //           ],
// //         } as any,
// //         {
// //           accounts: {
// //             candyMachine,
// //             wallet: RECEIVER_WALLET.publicKey, // who will receive the SOL of each mint
// //             authority: RECEIVER_WALLET.publicKey,
// //             systemProgram: SystemProgram.programId,
// //           },
// //           signers: [RECEIVER_WALLET],
// //         },
// //       )
// //       console.log('\nThe transaction tx:\n', tx)

// //       /* Fetch the public key generated after initialization */
// //       const log = await getLogInluding('pubKey', program, tx)
// //       const pubkey = log[0].events[0].split(' ')[5]
// //       console.log('CandyMachine public key:\n', pubkey)
// //       console.log('\n Change your pubkey in "src/utils/constants.ts"')
// //     } catch (err) {
// //       expect(err).not.to.be.null
// //     }
// //   })

// //   it('Should update the kycDAO Collection price', async () => {
// //     const program = workspace.KycDao as Program<KycDao>
// //     const collectionId = await getCollectionId()
// //     console.log(`Collection ID: ${collectionId}`)
// //     let kycDAONFTCollectionState = await program.account.kycDaoNftCollection.fetch(
// //       collectionId,
// //     )
// //     const origPrice = kycDAONFTCollectionState.data.pricePerYear
// //     const newPrice = 0.1
// //     const tx = await updateCandyMachine(newPrice)
// //     kycDAONFTCollectionState = await program.account.kycDaoNftCollection.fetch(
// //       collectionId,
// //     )
// //     console.log(`origPrice: ${origPrice}, newPrice: ${kycDAONFTCollectionState.data.pricePerYear}`)
// //     // const fromValue = log[0].events[0].split(' ')[6]
// //     // const toValue = log[0].events[0].split(' ')[8]
// //     // expect(fromValue).to.be.equal(CandyMachinePriceToNumber.toString())
// //     // expect(toValue).to.be.equal((price * LAMPORTS_PER_SOL).toString())
// //   })
// // })

// //   it('Should fail to update the candy machine price with a different account', async () => {
// //     const program = workspace.KycDao as Program<KycDao>
// //     const candyMachineState = await program.account.candyMachine.fetch(
// //       candyMachine,
// //     )
// //     const candyMachinePrice = candyMachineState.data.price
// //     const CandyMachinePriceToNumber = candyMachinePrice.toNumber()
// //     const price = 10
// //     try {
// //       const tx = await updateCandyMachine(
// //         price,
// //         '0xAAB27b150451726EC7738aa1d0A94505c8729bd1',
// //         RECEIVER_WALLET,
// //       )
// //     } catch (err) {
// //       expect(err).not.to.be.null
// //     }
// //   })

// //   /* After initialized, both generated pubkey should be changed in 'contants.ts'
// //      comment the above and uncomment the below 
// //   */

// //   it('Should initialize an account to store the bool flag', async () => {
// //     try {
// //       const program = workspace.KycDao as Program<KycDao>

// //       const stateKeypair = Keypair.generate()

// //       const tx = await program.rpc.initializeState({
// //         accounts: {
// //           data: stateKeypair.publicKey,
// //           candyMachine: candyMachine,
// //           payer: MY_WALLET.publicKey,
// //           authority: MY_WALLET.publicKey,
// //           systemProgram: SystemProgram.programId,
// //         },
// //         signers: [stateKeypair, MY_WALLET],
// //       })
// //       console.log('tx', tx)
// //       const log = await getLogInluding('pubKey', program, tx)
// //       const pubkey = log[0].events[0].split(' ')[5]
// //       console.log('StateMachine public key:\n', pubkey)
// //       console.log('\n Change your pubkey in "src/utils/constants.ts"')
// //     } catch (e) {
// //       throw e
// //     }
// //   })

// //   it('Should fail to initialize an account with different owner', async () => {
// //     try {
// //       const program = workspace.KycDao as Program<KycDao>

// //       const stateKeypair = Keypair.generate()

// //       const tx = await program.rpc.initializeState({
// //         accounts: {
// //           data: stateKeypair.publicKey,
// //           candyMachine: candyMachine,
// //           payer: RECEIVER_WALLET.publicKey,
// //           authority: RECEIVER_WALLET.publicKey,
// //           systemProgram: SystemProgram.programId,
// //         },
// //         signers: [stateKeypair, RECEIVER_WALLET],
// //       })
// //     } catch (err) {
// //       expect(err).not.to.be.null
// //     }
// //   })

// //   it('Should mint a Soulbounded NFT', async () => {
// //     try {
// //       /* this is our lib.rs */
// //       const program = workspace.KycDao as Program<KycDao>
// //       const collectionId = await getCollectionId()

// //       /* this fetches the current candyMachine wallet to receive mint fees */
// //       const kycDaoNftCollectionState = await program.account.kycDaoNftCollection.fetch(
// //         collectionId,
// //       )

// //       /* mint authority will handle the mint session */
// //       const mint = Keypair.generate()
// //       const associatedAccount = await getTokenWallet(
// //         MY_WALLET.publicKey,
// //         mint.publicKey,
// //       )
// //       const metadata = await getMetadata(mint.publicKey)
// //       const statusId = await getStatusId(mint.publicKey)

// //       const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
// //         MintLayout.span,
// //       )

// //       /* nft data */
// //       //TODO: Obviously this step is intended to be done by the backend
// //       const nftName = 'KycDAONEWNFT_1'
// //       const nftImage = 'https://api.amoebits.io/get/amoebits_666'
// //       const {
// //         actual_message,
// //         signature,
// //         recoveryId,
// //         eth_address,
// //       } = await createSignature(nftName, nftImage)

// //       /* nft mint */
// //       const tx = await program.rpc.mintNft(
// //         Buffer.from(actual_message),
// //         Buffer.from(signature),
// //         recoveryId,
// //         // nftName,
// //         nftImage,
// //         {
// //           accounts: {
// //             collection: collectionId,
// //             // kycdaoNftStatus: statusId,
// //             wallet: kycDaoNftCollectionState.wallet,
// //             metadata: metadata,
// //             mint: mint.publicKey,
// //             associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
// //             mintAuthority: MY_WALLET.publicKey,
// //             feePayer: MY_WALLET.publicKey,
// //             priceFeed: PRICE_FEED,
// //             tokenProgram: TOKEN_PROGRAM_ID,
// //             tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
// //             systemProgram: SystemProgram.programId,
// //             rent: SYSVAR_RENT_PUBKEY,
// //             ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
// //           },
// //           signers: [mint, MY_WALLET],
// //           instructions: [
// //             /* create a Secp256k1Program instruction on-chain*/
// //             web3.Secp256k1Program.createInstructionWithEthAddress({
// //               ethAddress: eth_address,
// //               message: actual_message,
// //               signature: signature,
// //               recoveryId: recoveryId,
// //             }),
// //             /* create a mint account and pay the rent */
// //             SystemProgram.createAccount({
// //               fromPubkey: MY_WALLET.publicKey,
// //               newAccountPubkey: mint.publicKey,
// //               space: MintLayout.span,
// //               lamports: rent,
// //               programId: TOKEN_PROGRAM_ID,
// //             }),
// //             /* initialize the mint*/
// //             createInitializeMintInstruction(
// //               mint.publicKey,
// //               0,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               TOKEN_PROGRAM_ID,
// //             ),
// //             /* create the token account that will hold the NFT */
// //             createAssociatedTokenAccountInstruction(
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               mint.publicKey,
// //             ),
// //             //TODO: Move the mintTo into the mintNft function in lib.rs
// //             /* mint 1 (and only) NFT to the mint account */
// //             createMintToInstruction(
// //               mint.publicKey,
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               1,
// //               [],
// //               TOKEN_PROGRAM_ID,
// //             ),
// //           ],
// //         },
// //       )
// //       console.log('tx', tx)
// //       expect(tx).not.to.be.null
// //     } catch (e) {
// //       throw e
// //     }
// //   })
// // })

// //   it('Should mint a Soulbounded NFT setting the isValid state to true', async () => {
// //     try {
// //       /* this is our lib.rs */
// //       const program = workspace.KycDao as Program<KycDao>

// //       /* this fetches the current candyMachine wallet to receive mint fees */
// //       const candyMachineState = await program.account.candyMachine.fetch(
// //         candyMachine,
// //       )

// //       /* mint authority will handle the mint session */
// //       const mint = Keypair.generate()
// //       const associatedAccount = await getTokenWallet(
// //         MY_WALLET.publicKey,
// //         mint.publicKey,
// //       )
// //       const metadata = await getMetadata(mint.publicKey)

// //       const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
// //         MintLayout.span,
// //       )

// //       /* nft data */
// //       const nftName = 'Marmold666'
// //       const nftImage = 'https://api.amoebits.io/get/amoebits_666'
// //       const {
// //         actual_message,
// //         signature,
// //         recoveryId,
// //         eth_address,
// //       } = await createSignature(nftName, nftImage)

// //       /* nft mint */
// //       let tx = await program.rpc.mintNft(
// //         Buffer.from(actual_message),
// //         Buffer.from(signature),
// //         recoveryId,
// //         nftName,
// //         nftImage,
// //         {
// //           accounts: {
// //             candyMachine,
// //             wallet: candyMachineState.wallet,
// //             metadata,
// //             mint: mint.publicKey,
// //             associatedAccount: associatedAccount,
// //             mintAuthority: MY_WALLET.publicKey,
// //             feePayer: MY_WALLET.publicKey,
// //             priceFeed: PRICE_FEED,
// //             tokenProgram: TOKEN_PROGRAM_ID,
// //             tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
// //             systemProgram: SystemProgram.programId,
// //             rent: SYSVAR_RENT_PUBKEY,
// //             ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
// //           },
// //           signers: [mint, MY_WALLET],
// //           instructions: [
// //             /* create a Secp256k1Program instruction on-chain*/
// //             web3.Secp256k1Program.createInstructionWithEthAddress({
// //               ethAddress: eth_address,
// //               message: actual_message,
// //               signature: signature,
// //               recoveryId: recoveryId,
// //             }),
// //             /* create a token/mint account and pay the rent */
// //             SystemProgram.createAccount({
// //               fromPubkey: MY_WALLET.publicKey,
// //               newAccountPubkey: mint.publicKey,
// //               space: MintLayout.span,
// //               lamports: rent,
// //               programId: TOKEN_PROGRAM_ID,
// //             }),
// //             /* initialize the mint*/
// //             createInitializeMintInstruction(
// //               mint.publicKey,
// //               0,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               TOKEN_PROGRAM_ID,
// //             ),
// //             /* create an account that will hold the NFT */
// //             createAssociatedTokenAccountInstruction(
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               mint.publicKey,
// //             ),
// //             /* mint 1 (and only) NFT to the mint account */
// //             createMintToInstruction(
// //               mint.publicKey,
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               1,
// //               [],
// //               TOKEN_PROGRAM_ID,
// //             ),
// //           ],
// //         },
// //       )
// //       console.log('\ntx', tx)
// //       console.log('minted NFT to ', associatedAccount.toBase58())

// //       /* Create an account to store the state */
// //       const stateKeypair = Keypair.generate()

// //       tx = await program.rpc.initializeState({
// //         accounts: {
// //           data: stateKeypair.publicKey,
// //           candyMachine: candyMachine,
// //           payer: MY_WALLET.publicKey,
// //           authority: MY_WALLET.publicKey,
// //           systemProgram: SystemProgram.programId,
// //         },
// //         signers: [stateKeypair, MY_WALLET],
// //       })
// //       console.log('\ntx', tx)
// //       console.log(
// //         'initialized state at account',
// //         stateKeypair.publicKey.toBase58(),
// //       )

// //       /* set the NFT to valid */
// //       const isValid = true

// //       tx = await program.rpc.setData(isValid, associatedAccount, {
// //         accounts: {
// //           dataAcc: stateKeypair.publicKey,
// //           authority: MY_WALLET.publicKey,
// //         },
// //         signers: [MY_WALLET],
// //       })
// //       console.log('\ntx', tx)

// //       /* check the state emmited on the log */
// //       /* it starts as false by rust default */
// //       const log = await getLogInluding('KycDAO', program, tx)
// //       const splitLog = log[0].events[0].split(' ')
// //       console.log('State changed from', splitLog[6], 'to', splitLog[8])
// //       expect(tx).not.to.be.null
// //     } catch (err) {
// //       throw err
// //     }
// //   })

// //   it('Should mint a Soulbounded NFT, fetch the context, set isValid based on context response', async () => {
// //     try {
// //       /* this is our lib.rs */
// //       const program = workspace.KycDao as Program<KycDao>

// //       /* this fetches the current candyMachine wallet to receive mint fees */
// //       const candyMachineState = await program.account.candyMachine.fetch(
// //         candyMachine,
// //       )

// //       /* mint authority will handle the mint session */
// //       const mint = Keypair.generate()
// //       const associatedAccount = await getTokenWallet(
// //         MY_WALLET.publicKey,
// //         mint.publicKey,
// //       )
// //       const metadata = await getMetadata(mint.publicKey)

// //       const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
// //         MintLayout.span,
// //       )

// //       /* nft data */
// //       const nftName = 'Marmold666'
// //       const nftImage = 'https://api.amoebits.io/get/amoebits_666'
// //       const {
// //         actual_message,
// //         signature,
// //         recoveryId,
// //         eth_address,
// //       } = await createSignature(nftName, nftImage)

// //       /* nft mint */
// //       let tx = await program.rpc.mintNft(
// //         Buffer.from(actual_message),
// //         Buffer.from(signature),
// //         recoveryId,
// //         nftName,
// //         nftImage,
// //         {
// //           accounts: {
// //             candyMachine,
// //             wallet: candyMachineState.wallet,
// //             metadata,
// //             mint: mint.publicKey,
// //             associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
// //             mintAuthority: MY_WALLET.publicKey,
// //             feePayer: MY_WALLET.publicKey,
// //             priceFeed: PRICE_FEED,
// //             tokenProgram: TOKEN_PROGRAM_ID,
// //             tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
// //             systemProgram: SystemProgram.programId,
// //             rent: SYSVAR_RENT_PUBKEY,
// //             ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
// //           },
// //           signers: [mint, MY_WALLET],
// //           instructions: [
// //             /* create a Secp256k1Program instruction on-chain*/
// //             web3.Secp256k1Program.createInstructionWithEthAddress({
// //               ethAddress: eth_address,
// //               message: actual_message,
// //               signature: signature,
// //               recoveryId: recoveryId,
// //             }),
// //             /* create a token/mint account and pay the rent */
// //             SystemProgram.createAccount({
// //               fromPubkey: MY_WALLET.publicKey,
// //               newAccountPubkey: mint.publicKey,
// //               space: MintLayout.span,
// //               lamports: rent,
// //               programId: TOKEN_PROGRAM_ID,
// //             }),
// //             /* initialize the mint*/
// //             createInitializeMintInstruction(
// //               mint.publicKey,
// //               0,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               TOKEN_PROGRAM_ID,
// //             ),
// //             /* create an account that will hold the NFT */
// //             createAssociatedTokenAccountInstruction(
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               mint.publicKey,
// //             ),
// //             /* mint 1 (and only) NFT to the mint account */
// //             createMintToInstruction(
// //               mint.publicKey,
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               1,
// //               [],
// //               TOKEN_PROGRAM_ID,
// //             ),
// //           ],
// //         },
// //       )
// //       console.log('\ntx', tx)
// //       console.log('minted NFT to ', associatedAccount.toBase58())

// //       /* Create an account to store the state */
// //       const stateKeypair = Keypair.generate()

// //       tx = await program.rpc.initializeState({
// //         accounts: {
// //           data: stateKeypair.publicKey,
// //           candyMachine: candyMachine,
// //           payer: MY_WALLET.publicKey,
// //           authority: MY_WALLET.publicKey,
// //           systemProgram: SystemProgram.programId,
// //         },
// //         signers: [stateKeypair, MY_WALLET],
// //       })
// //       console.log('\ntx', tx)
// //       console.log(
// //         'initialized state at account',
// //         stateKeypair.publicKey.toBase58(),
// //       )

// //       /* fetch NFT data */
// //       let stateContext = await program.account.data.fetch(
// //         stateKeypair.publicKey,
// //       )
// //       let isValid = stateContext.isValid
// //       console.log('current isValid value', isValid)
// //       expect(isValid).to.be.false

// //       /* set the NFT to valid */
// //       tx = await program.rpc.setData(!isValid, associatedAccount, {
// //         accounts: {
// //           dataAcc: stateKeypair.publicKey,
// //           authority: MY_WALLET.publicKey,
// //         },
// //         signers: [MY_WALLET],
// //       })
// //       console.log('\ntx', tx)

// //       /* check the state emmited on the log */
// //       const log = await getLogInluding('KycDAO', program, tx)
// //       const splitLog = log[0].events[0].split(' ')
// //       console.log('State changed from', splitLog[6], 'to', splitLog[8])
// //       expect(tx).not.to.be.null

// //       /* fetch NFT data */
// //       stateContext = await program.account.data.fetch(stateKeypair.publicKey)
// //       isValid = stateContext.isValid
// //       console.log('current isValid value', isValid)
// //       expect(isValid).to.be.true
// //     } catch (err) {
// //       throw err
// //     }
// //   })

// //   it('Should mint a Soulbounded NFT, fail to set state with a different owner', async () => {
// //     try {
// //       /* this is our lib.rs */
// //       const program = workspace.KycDao as Program<KycDao>

// //       /* this fetches the current candyMachine wallet to receive mint fees */
// //       const candyMachineState = await program.account.candyMachine.fetch(
// //         candyMachine,
// //       )

// //       /* mint authority will handle the mint session */
// //       const mint = Keypair.generate()
// //       const associatedAccount = await getTokenWallet(
// //         MY_WALLET.publicKey,
// //         mint.publicKey,
// //       )
// //       const metadata = await getMetadata(mint.publicKey)

// //       const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
// //         MintLayout.span,
// //       )

// //       /* nft data */
// //       const nftName = 'Marmold666'
// //       const nftImage = 'https://api.amoebits.io/get/amoebits_666'
// //       const {
// //         actual_message,
// //         signature,
// //         recoveryId,
// //         eth_address,
// //       } = await createSignature(nftName, nftImage)

// //       /* nft mint */
// //       let tx = await program.rpc.mintNft(
// //         Buffer.from(actual_message),
// //         Buffer.from(signature),
// //         recoveryId,
// //         nftName,
// //         nftImage,
// //         {
// //           accounts: {
// //             candyMachine,
// //             wallet: candyMachineState.wallet,
// //             metadata,
// //             mint: mint.publicKey,
// //             associatedAccount: associatedAccount, //try removindo after the double dots, see if it works
// //             mintAuthority: MY_WALLET.publicKey,
// //             feePayer: MY_WALLET.publicKey,
// //             priceFeed: PRICE_FEED,
// //             tokenProgram: TOKEN_PROGRAM_ID,
// //             tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
// //             systemProgram: SystemProgram.programId,
// //             rent: SYSVAR_RENT_PUBKEY,
// //             ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
// //           },
// //           signers: [mint, MY_WALLET],
// //           instructions: [
// //             /* create a Secp256k1Program instruction on-chain*/
// //             web3.Secp256k1Program.createInstructionWithEthAddress({
// //               ethAddress: eth_address,
// //               message: actual_message,
// //               signature: signature,
// //               recoveryId: recoveryId,
// //             }),
// //             /* create a token/mint account and pay the rent */
// //             SystemProgram.createAccount({
// //               fromPubkey: MY_WALLET.publicKey,
// //               newAccountPubkey: mint.publicKey,
// //               space: MintLayout.span,
// //               lamports: rent,
// //               programId: TOKEN_PROGRAM_ID,
// //             }),
// //             /* initialize the mint*/
// //             createInitializeMintInstruction(
// //               mint.publicKey,
// //               0,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               TOKEN_PROGRAM_ID,
// //             ),
// //             /* create an account that will hold the NFT */
// //             createAssociatedTokenAccountInstruction(
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               mint.publicKey,
// //             ),
// //             /* mint 1 (and only) NFT to the mint account */
// //             createMintToInstruction(
// //               mint.publicKey,
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               1,
// //               [],
// //               TOKEN_PROGRAM_ID,
// //             ),
// //           ],
// //         },
// //       )
// //       console.log('\ntx', tx)
// //       console.log('minted NFT to ', associatedAccount.toBase58())

// //       /* Create an account to store the state */
// //       const stateKeypair = Keypair.generate()

// //       tx = await program.rpc.initializeState({
// //         accounts: {
// //           data: stateKeypair.publicKey,
// //           candyMachine: candyMachine,
// //           payer: MY_WALLET.publicKey,
// //           authority: MY_WALLET.publicKey,
// //           systemProgram: SystemProgram.programId,
// //         },
// //         signers: [stateKeypair, MY_WALLET],
// //       })
// //       console.log('\ntx', tx)
// //       console.log(
// //         'initialized state at account',
// //         stateKeypair.publicKey.toBase58(),
// //       )

// //       /* fetch NFT data */
// //       let stateContext = await program.account.data.fetch(
// //         stateKeypair.publicKey,
// //       )
// //       let isValid = stateContext.isValid
// //       console.log('current isValid value', isValid)
// //       expect(isValid).to.be.false

// //       /* set the NFT to valid */
// //       tx = await program.rpc.setData(!isValid, associatedAccount, {
// //         accounts: {
// //           dataAcc: stateKeypair.publicKey,
// //           authority: RECEIVER_WALLET.publicKey,
// //         },
// //         signers: [RECEIVER_WALLET],
// //       })
// //     } catch (err) {
// //       expect(err).not.to.be.null
// //     }
// //   })

// //   it('Shoud fail to mint with a different signer', async () => {
// //     const program = workspace.KycDao as Program<KycDao>
// //     const candyMachineState = await program.account.candyMachine.fetch(
// //       candyMachine,
// //     )
// //     const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
// //       MintLayout.span,
// //     )

// //     const mint = Keypair.generate()
// //     const metadata = await getMetadata(mint.publicKey)
// //     const associatedAccount = await getTokenWallet(
// //       MY_WALLET.publicKey,
// //       mint.publicKey,
// //     )

// //     const nftName = 'Marmold666'
// //     const nftImage = 'https://api.amoebits.io/get/amoebits_666'
// //     const eth_signer: ethers.Wallet = ethers.Wallet.createRandom()

// //     let eth_address: string // Ethereum address to be recovered and checked against
// //     let full_sig: string // 64 bytes + recovery byte
// //     let signature: Uint8Array // 64 bytes of sig
// //     let recoveryId: number // recovery byte (u8)
// //     let actual_message: Buffer // actual signed message with Ethereum Message prefix

// //     const messageHash: string = ethers.utils.solidityKeccak256(
// //       ['string', 'string'],
// //       [nftName, nftImage],
// //     )
// //     const messageHashBytes: Uint8Array = ethers.utils.arrayify(messageHash)
// //     full_sig = await eth_signer.signMessage(messageHashBytes)

// //     let full_sig_bytes = ethers.utils.arrayify(full_sig)
// //     signature = full_sig_bytes.slice(0, 64)
// //     recoveryId = full_sig_bytes[64] - 27

// //     let msg_digest = ethers.utils.arrayify(
// //       ethers.utils.solidityKeccak256(['string', 'string'], [nftName, nftImage]),
// //     )
// //     actual_message = Buffer.concat([
// //       Buffer.from('\x19Ethereum Signed Message:\n32'),
// //       msg_digest,
// //     ])

// //     eth_address = ethers.utils.computeAddress(eth_signer.publicKey).slice(2)

// //     try {
// //       const tx = await program.rpc.mintNft(
// //         Buffer.from(actual_message),
// //         Buffer.from(signature),
// //         recoveryId,
// //         nftName,
// //         nftImage,
// //         {
// //           accounts: {
// //             candyMachine,
// //             wallet: candyMachineState.wallet,
// //             metadata,
// //             mint: mint.publicKey,
// //             associatedAccount: associatedAccount,
// //             mintAuthority: MY_WALLET.publicKey,
// //             feePayer: MY_WALLET.publicKey,
// //             priceFeed: PRICE_FEED,
// //             tokenProgram: TOKEN_PROGRAM_ID,
// //             tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
// //             systemProgram: SystemProgram.programId,
// //             rent: SYSVAR_RENT_PUBKEY,
// //             ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
// //           },
// //           signers: [mint, MY_WALLET],
// //           instructions: [
// //             /* create a Secp256k1Program instruction on-chain*/
// //             web3.Secp256k1Program.createInstructionWithEthAddress({
// //               ethAddress: eth_address,
// //               message: actual_message,
// //               signature: signature,
// //               recoveryId: recoveryId,
// //             }),
// //             /* create a token/mint account and pay the rent */
// //             SystemProgram.createAccount({
// //               fromPubkey: MY_WALLET.publicKey,
// //               newAccountPubkey: mint.publicKey,
// //               space: MintLayout.span,
// //               lamports: rent,
// //               programId: TOKEN_PROGRAM_ID,
// //             }),
// //             /* initialize the mint*/
// //             createInitializeMintInstruction(
// //               mint.publicKey,
// //               0,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               TOKEN_PROGRAM_ID,
// //             ),
// //             /* create an account that will hold the NFT */
// //             createAssociatedTokenAccountInstruction(
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               MY_WALLET.publicKey,
// //               mint.publicKey,
// //             ),
// //             /* mint 1 (and only) NFT to the mint account */
// //             createMintToInstruction(
// //               mint.publicKey,
// //               associatedAccount,
// //               MY_WALLET.publicKey,
// //               1,
// //               [],
// //               TOKEN_PROGRAM_ID,
// //             ),
// //           ],
// //         },
// //       )
// //     } catch (err) {
// //       console.log(err.errorLogs[0])
// //       expect(err.errorLogs[0]).to.be.equal(
// //         'Program log: AnchorError occurred. Error Code: SignatureVerificationFailed. Error Number: 6001. Error Message: The signature data provided to validate the metadata is incorrect.',
// //       )
// //     }
// //   })

// //   it('Should mint a Soulbounded NFT with another account paying for the fees', async () => {
// //     try {
// //       /* this is our lib.rs */
// //       const program = workspace.KycDao as Program<KycDao>

// //       /* this fetches the current candyMachine wallet to receive mint fees */
// //       const candyMachineState = await program.account.candyMachine.fetch(
// //         candyMachine,
// //       )

// //       /* mint authority will handle the mint session */
// //       const mint = Keypair.generate()
// //       const associatedAccount = await getTokenWallet(
// //         MY_WALLET.publicKey,
// //         mint.publicKey,
// //       )
// //       const metadata = await getMetadata(mint.publicKey)

// //       const rent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
// //         MintLayout.span,
// //       )

// //       /* nft data */
// //       const nftName = 'Marmold666'
// //       const nftImage = 'https://api.amoebits.io/get/amoebits_666'
// //       const {
// //         actual_message,
// //         signature,
// //         recoveryId,
// //         eth_address,
// //       } = await createSignature(nftName, nftImage)

// //       /*

// //           This is an example using program.methods without the deprecated program.rpc

// //       */

// //       // const tx = await program.methods
// //       // .mintNft(
// //       //   Buffer.from(actual_message),
// //       //   Buffer.from(signature),
// //       //   recoveryId,
// //       //   nftName,
// //       //   nftImage,
// //       // )
// //       // .accounts({
// //       //   candyMachine,
// //       //   wallet: candyMachineState.wallet,
// //       //   metadata,
// //       //   mint: mint.publicKey,
// //       //   associatedAccount: associatedAccount,
// //       //   mintAuthority: MY_WALLET.publicKey,
// //       //   feePayer: MY_WALLET.publicKey,
// //       //   priceFeed: PRICE_FEED,
// //       //   tokenProgram: TOKEN_PROGRAM_ID,
// //       //   tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
// //       //   systemProgram: SystemProgram.programId,
// //       //   rent: SYSVAR_RENT_PUBKEY,
// //       //   ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
// //       // })
// //       // .signers([mint, MY_WALLET])
// //       // .preInstructions([
// //       //   /* create a Secp256k1Program instruction on-chain*/
// //       //   web3.Secp256k1Program.createInstructionWithEthAddress({
// //       //     ethAddress: eth_address,
// //       //     message: actual_message,
// //       //     signature: signature,
// //       //     recoveryId: recoveryId,
// //       //   }),
// //       //   /* create a token/mint account and pay the rent */
// //       //   SystemProgram.createAccount({
// //       //     fromPubkey: MY_WALLET.publicKey,
// //       //     newAccountPubkey: mint.publicKey,
// //       //     space: MintLayout.span,
// //       //     lamports: rent,
// //       //     programId: TOKEN_PROGRAM_ID,
// //       //   }),
// //       //   /* initialize the mint*/
// //       //   createInitializeMintInstruction(
// //       //     mint.publicKey,
// //       //     0,
// //       //     MY_WALLET.publicKey,
// //       //     MY_WALLET.publicKey,
// //       //     TOKEN_PROGRAM_ID,
// //       //   ),
// //       //   /* create an account that will hold the NFT */
// //       //   createAssociatedTokenAccountInstruction(
// //       //     associatedAccount,
// //       //     MY_WALLET.publicKey,
// //       //     MY_WALLET.publicKey,
// //       //     mint.publicKey,
// //       //   ),
// //       //   /* mint 1 (and only) NFT to the mint account */
// //       //   createMintToInstruction(
// //       //     mint.publicKey,
// //       //     associatedAccount,
// //       //     MY_WALLET.publicKey,
// //       //     1,
// //       //     [],
// //       //     TOKEN_PROGRAM_ID,
// //       //   ),
// //       // ])
// //       // .rpc()

// //       /*

// //           This gives error 0x1770, which means?? nothing online, what a pain

// //       */

// //       // const transaction = new Transaction()
// //       // const instruction = await program.methods
// //       //   .mintNft(
// //       //     Buffer.from(actual_message),
// //       //     Buffer.from(signature),
// //       //     recoveryId,
// //       //     nftName,
// //       //     nftImage,
// //       //   )
// //       //   .accounts({
// //       //     candyMachine,
// //       //     wallet: candyMachineState.wallet,
// //       //     metadata,
// //       //     mint: mint.publicKey,
// //       //     associatedAccount: associatedAccount,
// //       //     mintAuthority: MY_WALLET.publicKey,
// //       //     feePayer: MY_WALLET.publicKey,
// //       //     priceFeed: PRICE_FEED,
// //       //     tokenProgram: TOKEN_PROGRAM_ID,
// //       //     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
// //       //     systemProgram: SystemProgram.programId,
// //       //     rent: SYSVAR_RENT_PUBKEY,
// //       //     ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
// //       //   })
// //       //   .signers([mint, MY_WALLET])
// //       //   .preInstructions([
// //       //     /* create a Secp256k1Program instruction on-chain*/
// //       //     web3.Secp256k1Program.createInstructionWithEthAddress({
// //       //       ethAddress: eth_address,
// //       //       message: actual_message,
// //       //       signature: signature,
// //       //       recoveryId: recoveryId,
// //       //     }),
// //       //     /* create a token/mint account and pay the rent */
// //       //     SystemProgram.createAccount({
// //       //       fromPubkey: MY_WALLET.publicKey,
// //       //       newAccountPubkey: mint.publicKey,
// //       //       space: MintLayout.span,
// //       //       lamports: rent,
// //       //       programId: TOKEN_PROGRAM_ID,
// //       //     }),
// //       //     /* initialize the mint*/
// //       //     createInitializeMintInstruction(
// //       //       mint.publicKey,
// //       //       0,
// //       //       MY_WALLET.publicKey,
// //       //       MY_WALLET.publicKey,
// //       //       TOKEN_PROGRAM_ID,
// //       //     ),
// //       //     /* create an account that will hold the NFT */
// //       //     createAssociatedTokenAccountInstruction(
// //       //       associatedAccount,
// //       //       MY_WALLET.publicKey,
// //       //       MY_WALLET.publicKey,
// //       //       mint.publicKey,
// //       //     ),
// //       //     /* mint 1 (and only) NFT to the mint account */
// //       //     createMintToInstruction(
// //       //       mint.publicKey,
// //       //       associatedAccount,
// //       //       MY_WALLET.publicKey,
// //       //       1,
// //       //       [],
// //       //       TOKEN_PROGRAM_ID,
// //       //     ),
// //       //   ])
// //       //   .instruction()
// //       // transaction.add(instruction)
// //       // transaction.feePayer = MY_WALLET.publicKey
// //       // const tx = await sendAndConfirmTransaction(
// //       //   AnchorProvider.env().connection,
// //       //   transaction,
// //       //   [MY_WALLET],
// //       // )

// //       /*

// //           This works, but we get the transaction too large due to 3 signers | why????

// //       */

// //       // const transaction = await program.methods
// //       //   .mintNft(
// //       //     Buffer.from(actual_message),
// //       //     Buffer.from(signature),
// //       //     recoveryId,
// //       //     nftName,
// //       //     nftImage,
// //       //   )
// //       //   .accounts({
// //       //     candyMachine,
// //       //     wallet: candyMachineState.wallet,
// //       //     metadata,
// //       //     mint: mint.publicKey,
// //       //     associatedAccount: associatedAccount,
// //       //     mintAuthority: MY_WALLET.publicKey,
// //       //     feePayer: MY_WALLET.publicKey,
// //       //     priceFeed: PRICE_FEED,
// //       //     tokenProgram: TOKEN_PROGRAM_ID,
// //       //     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
// //       //     systemProgram: SystemProgram.programId,
// //       //     rent: SYSVAR_RENT_PUBKEY,
// //       //     ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
// //       //   })
// //       //   .signers([mint, MY_WALLET])
// //       //   .preInstructions([
// //       //     /* create a Secp256k1Program instruction on-chain*/
// //       //     web3.Secp256k1Program.createInstructionWithEthAddress({
// //       //       ethAddress: eth_address,
// //       //       message: actual_message,
// //       //       signature: signature,
// //       //       recoveryId: recoveryId,
// //       //     }),
// //       //     /* create a token/mint account and pay the rent */
// //       //     SystemProgram.createAccount({
// //       //       fromPubkey: MY_WALLET.publicKey,
// //       //       newAccountPubkey: mint.publicKey,
// //       //       space: MintLayout.span,
// //       //       lamports: rent,
// //       //       programId: TOKEN_PROGRAM_ID,
// //       //     }),
// //       //     /* initialize the mint*/
// //       //     createInitializeMintInstruction(
// //       //       mint.publicKey,
// //       //       0,
// //       //       MY_WALLET.publicKey,
// //       //       MY_WALLET.publicKey,
// //       //       TOKEN_PROGRAM_ID,
// //       //     ),
// //       //     /* create an account that will hold the NFT */
// //       //     createAssociatedTokenAccountInstruction(
// //       //       associatedAccount,
// //       //       MY_WALLET.publicKey,
// //       //       MY_WALLET.publicKey,
// //       //       mint.publicKey,
// //       //     ),
// //       //     /* mint 1 (and only) NFT to the mint account */
// //       //     createMintToInstruction(
// //       //       mint.publicKey,
// //       //       associatedAccount,
// //       //       MY_WALLET.publicKey,
// //       //       1,
// //       //       [],
// //       //       TOKEN_PROGRAM_ID,
// //       //     ),
// //       //   ])
// //       //   .transaction()

// //       // transaction.feePayer = MY_WALLET.publicKey
// //       // const tx = await sendAndConfirmTransaction(
// //       //   AnchorProvider.env().connection,
// //       //   transaction,
// //       //   [mint, MY_WALLET],
// //       // )

// //       /*

// //           This works fine, but there will be a console error for some reason

// //       */

// //       let transaction = new Transaction().add(
// //         /* create a token/mint account and pay the rent */
// //         SystemProgram.createAccount({
// //           fromPubkey: RECEIVER_WALLET.publicKey,
// //           newAccountPubkey: mint.publicKey,
// //           space: MintLayout.span,
// //           lamports: rent,
// //           programId: TOKEN_PROGRAM_ID,
// //         }),
// //         /* initialize the mint*/
// //         createInitializeMintInstruction(
// //           mint.publicKey,
// //           0,
// //           MY_WALLET.publicKey,
// //           MY_WALLET.publicKey,
// //           TOKEN_PROGRAM_ID,
// //         ),
// //         /* create an account that will hold the NFT */
// //         createAssociatedTokenAccountInstruction(
// //           associatedAccount,
// //           RECEIVER_WALLET.publicKey,
// //           MY_WALLET.publicKey,
// //           mint.publicKey,
// //         ),
// //         /* mint 1 (and only) NFT to the mint account */
// //         createMintToInstruction(
// //           mint.publicKey,
// //           associatedAccount,
// //           MY_WALLET.publicKey,
// //           1,
// //           [],
// //           TOKEN_PROGRAM_ID,
// //         ),
// //       )
// //       transaction.feePayer = RECEIVER_WALLET.publicKey
// //       let tx = await sendAndConfirmTransaction(
// //         AnchorProvider.env().connection,
// //         transaction,
// //         [RECEIVER_WALLET, MY_WALLET, mint],
// //       )
// //       console.log(tx)

// //       transaction = await program.methods
// //         .mintNft(
// //           Buffer.from(actual_message),
// //           Buffer.from(signature),
// //           recoveryId,
// //           nftName,
// //           nftImage,
// //         )
// //         .accounts({
// //           candyMachine,
// //           wallet: candyMachineState.wallet,
// //           metadata,
// //           mint: mint.publicKey,
// //           associatedAccount: associatedAccount,
// //           mintAuthority: MY_WALLET.publicKey,
// //           feePayer: RECEIVER_WALLET.publicKey,
// //           priceFeed: PRICE_FEED,
// //           tokenProgram: TOKEN_PROGRAM_ID,
// //           tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
// //           systemProgram: SystemProgram.programId,
// //           rent: SYSVAR_RENT_PUBKEY,
// //           ixSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
// //         })
// //         .signers([MY_WALLET])
// //         .preInstructions([
// //           /* create a Secp256k1Program instruction on-chain*/
// //           web3.Secp256k1Program.createInstructionWithEthAddress({
// //             ethAddress: eth_address,
// //             message: actual_message,
// //             signature: signature,
// //             recoveryId: recoveryId,
// //           }),
// //         ])
// //         .transaction()

// //       transaction.feePayer = RECEIVER_WALLET.publicKey
// //       tx = await sendAndConfirmTransaction(
// //         AnchorProvider.env().connection,
// //         transaction,
// //         [RECEIVER_WALLET, MY_WALLET],
// //       )

// //       console.log('tx', tx)
// //       expect(tx).not.to.be.null
// //     } catch (e) {
// //       throw e
// //     }
// //   })
