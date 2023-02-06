import {
  Program,
  web3,
  workspace,
  setProvider,
  AnchorProvider,
  BN,
} from '@project-serum/anchor'
import {
  NonceAccount,
  LAMPORTS_PER_SOL,
  Connection,
  Transaction,
  sendAndConfirmTransaction,
  sendAndConfirmRawTransaction,
} from '@solana/web3.js'
import idl from '../../target/idl/ntnft.json'
import { Ntnft } from '../../target/types/ntnft'
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
  KYCDAO_COLLECTION_KYC_SEED,
  SECS_IN_YEAR,
  KYCDAO_STATUS_SIZE,
} from '../../utils/constants'
import { ethers } from 'ethers'
import {
  createAssociatedTokenAccountInstruction,
  getCollectionId,
  getStatusId,
  getMetadata,
  getTokenWallet,
  BACKEND_WALLET,
  RECEIVER_WALLET,
  NONCE_ACCOUNT,
  parsePrice,
} from '../../utils/utils'
import { createSignature } from '../../utils/ethSignature'
import getPastEvents from '../../scripts/getPastEvents'
import findTransactionSignature from '../../scripts/getTransactionSignatures'
import initializeCollection from '../../scripts/initializeCollection'
import updateCandyMachine from '../../scripts/updateCollection'
import updateStateMachine from '../../scripts/updateStateMachine'
import getLogIncluding from '../../scripts/getLogIncluding'
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

    After both accounts are initialized, we can mint tokens and manage their state.
    But first, we need to change both pubKeys returned from the initialization process
    in the 'constants.ts' file. So our mint can use their accounts as context.
    
  */

  before(async () => {
    const program = workspace.KycDao as Program<Ntnft>
    const collectionId = await getCollectionId()

    try {
      console.log('Checking for collection...')
      await program.account.kycDaoNftCollection.fetch(
        collectionId,
      )
      console.log('Collection found!')
    } catch (err) {
      console.log('Collection not found, initializing...')
      await initializeCollection()
    }    
  }),

  it('Should mint a Soulbounded NFT using mintWithArgs all in one transaction', async () => {
    try {
      const BEBalance = await AnchorProvider.env().connection.getBalance(BACKEND_WALLET.publicKey)
      const UserBalance = await AnchorProvider.env().connection.getBalance(RECEIVER_WALLET.publicKey)

      console.log('BE Balance: ', BEBalance / LAMPORTS_PER_SOL)
      console.log('User Balance: ', UserBalance / LAMPORTS_PER_SOL)

      //This code is all running as BACKEND...
      //Should have access to BACKEND_WALLET and RECEIVER_WALLET.public_key

      console.log('Running code as BACKEND...')

      /* this is our lib.rs */
      const program = workspace.KycDao as Program<Ntnft>

      const collectionId = await getCollectionId()

      const kycDaoNftCollectionState = await program.account.kycDaoNftCollection.fetch(
        collectionId,
      )

      /* mint authority will handle the mint session */
      const mint = Keypair.generate()
      const associatedAccount = await getTokenWallet(
        RECEIVER_WALLET.publicKey,
        mint.publicKey,
      )
      const metadata = await getMetadata(mint.publicKey)
      const [statusId, _bump] = await getStatusId(RECEIVER_WALLET.publicKey)

      const mintRent = await AnchorProvider.env().connection.getMinimumBalanceForRentExemption(
        MintLayout.span,
      )

      // Start compiling list of instructions
      let reqIXs = []
      // No longer using a nonce account
      // let reqIXs = [
      //   SystemProgram.nonceAdvance({
      //   noncePubkey: NONCE_ACCOUNT.publicKey,
      //   authorizedPubkey: BACKEND_WALLET.publicKey,
      // })]

      console.log('Check if a status PDA already exists for this receiver...')

      try {
        const statusState = await program.account.kycDaoNftStatus.fetch(statusId)
        console.log('Status PDA already exists for this receiver!')
        console.log('Status PDA: ', statusState)
        const statusIX = await program.methods.updateStatus({
            isValid: true,
            expiry: new BN(1701436998),
            verificationTier: 'one',
          } as any
        ).accounts({
          collection: collectionId,
          status: statusId,
          authority: BACKEND_WALLET.publicKey,
        }).instruction()
        reqIXs.push(statusIX)        
      } catch (err) {
        console.log('Status PDA does not exist for this receiver, creating instruction for it...')
        const statusIX = await program.methods.initStatus({
            isValid: true,
            expiry: new BN(1701436998),
            verificationTier: 'one',
          } as any
        ).accounts({
          collection: collectionId,
          receiver: RECEIVER_WALLET.publicKey,
          status: statusId,
          authority: BACKEND_WALLET.publicKey,
          systemProgram: SystemProgram.programId,
        }).instruction()
        reqIXs.push(statusIX) 
      }

      console.log('creating transaction for mintWithArgs...')

      reqIXs = reqIXs.concat(
      [
        /* create a mint account and pay the rent */
        SystemProgram.createAccount({
          fromPubkey: RECEIVER_WALLET.publicKey,
          newAccountPubkey: mint.publicKey,
          space: MintLayout.span,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        }),
        /* initialize the mint*/
        createInitializeMintInstruction(
          mint.publicKey,            // mint
          0,                         //decimals
          BACKEND_WALLET.publicKey,  // mint authority
          BACKEND_WALLET.publicKey,  // freeze authority
          TOKEN_PROGRAM_ID,          // token program
        ),
        /* create a token account that will hold the NFT */
        createAssociatedTokenAccountInstruction(
          associatedAccount,          // token account
          RECEIVER_WALLET.publicKey,   // payer
          RECEIVER_WALLET.publicKey,   // wallet address
          mint.publicKey,             // mint
        ),
        /* mint 1 (and only) NFT to the mint account */
        createMintToInstruction(
          mint.publicKey,             // mint
          associatedAccount,          // token account
          BACKEND_WALLET.publicKey,   // mint authority
          1,                          // amount
          [],                         // multisig
          TOKEN_PROGRAM_ID,           // token program
        ),          
      ])

      const reqAccts = {
        collection: collectionId,
        receiver: RECEIVER_WALLET.publicKey,
        status: statusId,
        wallet: kycDaoNftCollectionState.wallet,
        metadata: metadata,
        mint: mint.publicKey,
        associatedAccount: associatedAccount,
        mintAuthority: BACKEND_WALLET.publicKey,
        feePayer: RECEIVER_WALLET.publicKey,
        priceFeed: PRICE_FEED,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      }

      console.log(`reqAccts: ${JSON.stringify(reqAccts, null, 2)}`)

      /* mintNFT */
      let transaction = await program.methods
        .mintWithArgs(
            // new BN(1701436998),                               // expiry
            new BN(0),                                        // secondsToPay
            // // secondsToPay: new BN(SECS_IN_YEAR),
            'QmUDyt1mZEMUMLQ1PQj7UnYvo9phLLG6j3TKV7AvW6P4u6', // metadataCid
            // 'one',                                            // verificationTier
        )
        .accounts(reqAccts)
        .preInstructions(reqIXs)
        .transaction()
      transaction.feePayer = RECEIVER_WALLET.publicKey

      console.log('Adding recent blockhash to transaction')
      // No longer using nonce as we have trouble with signing multiple txs at once
      // let accountInfo = await AnchorProvider.env().connection.getAccountInfo(NONCE_ACCOUNT.publicKey);
      // let nonceAccount = NonceAccount.fromAccountData(accountInfo.data)    
      let blockhash = await AnchorProvider.env().connection.getLatestBlockhash('finalized')
      transaction.recentBlockhash = blockhash.blockhash
      console.log(`blockhash is now: ${transaction.recentBlockhash}`)

      //TODO: Before making the mint_authority a signer we didn't need a BACKEND_WALLET signature...?
      transaction.partialSign(BACKEND_WALLET)
      transaction.partialSign(mint)

      // serialize the transaction to be sent to frontend
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
      })
      const transactionBase64 = serializedTransaction.toString("base64")
      console.log(`transactionBase64: ${transactionBase64}`)
      console.log('passing over to FRONTEND...')

      // // wait for 5 minutes
      // // uncomment this to test transaction doesn't expire after 5 minutes
      // console.log('waiting 5 minutes...')
      // await new Promise((resolve) => setTimeout(resolve, 300000))

      // const transactionBase64 = "AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADdqygrAKLvNZRwZXNWjluLOjHylOM5caAx+zTe3otjmEFh037QUf73qo93G7cKEkpx/30KDMmlGl4iq1je6HcOoYbENcllgE08CR902Oasd0TlSRAVRb4N09XZkAZvPCUysIOjbcpwWbAqtvX8X4seshsDzdcrKaqJM6Pv3A0IBwMABxDQbEPMg9fMsuGIq2FzEjREoq6/wnuphDixcF0Sl0201Hv+la/k19kwTzN3Ko44wfl6PisftwhFFd26et5LC0L55q5YNZveaoqyi3hNeaWdbJBSA7oNqZNucHbutGksnqg0XCwzsvLa6A7lQyOw7S9WWRf8UxRiSH1GWqSwHdtTfMdeHcsep/YQy1H801HC0pLsjA1s8vFKXDGvAu2uY4XY8K/u06TgrOf+GrdK7tvcCP17GJC9L9kUw+s2VHp3JkfxQ5fHoyfpw7jZEOIQcylBeNhjB+qVtQYB0M9wifG9pB1V0ihNKIFlYL3d668YoCUbd6DLDxp4xMKCqGK/TNEK/mUPA2fUp++YFaWT6hXTZZPwZDqq8BSbsEvmerhR3s0Gp9UXGSxWjuCKhF9z0peIzwNcMUWyGrNE2AYuqUAAAAan1RcZLFxRIYzJTD1K8X9Y2u4Im6H9ROPb2YoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqQtwZbHj0XxFOJ1Sf2sEw81YuGxzGqD9tUm20bwD+ClGjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+FlcMIRbQW/f2/rscUou9eszPa/nsxz6ynFh6Ld6BGVsbLkbWBoCnfOkzHHKqc2N+Ccf3tmqhR9xLXeW0cAPePvVBgsDAwkCBAQAAAALAgABNAAAAABgTRYAAAAAAFIAAAAAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKkMAgEKQwAA5q5YNZveaoqyi3hNeaWdbJBSA7oNqZNucHbutGksnqgB5q5YNZveaoqyi3hNeaWdbJBSA7oNqZNucHbutGksnqgOBwAEAAELDAoADAMBBAIJBwEAAAAAAAAADw0FBgIHAQQCAAgMDQsKUZNRETgWibOwRt5pZQAAAAAAAAAAAAAAAC4AAABRbVVEeXQxbVpFTVVNTFExUFFqN1VuWXZvOXBoTExHNmozVEtWN0F2VzZQNHU2AwAAAG9uZQ=="

      // This code is all running as FRONTEND...
      // Recover the transaction by de-serializing it
      console.log('now in the FRONTEND, we can sign with RECEIVER_WALLET')
      const recoveredTransaction = Transaction.from(
        Buffer.from(transactionBase64, "base64")
      )
      console.log('Recovered the transaction')

      let mintkycIX = recoveredTransaction.instructions[recoveredTransaction.instructions.length - 1]
      let mintIXdata = mintkycIX.data.toString("base64")
      console.log(`mintkycIX.data is: ${mintkycIX.data}`)
      console.log(`mintIXdata is: ${mintIXdata}`)

      console.log('Adding signature to transaction')
      recoveredTransaction.partialSign(RECEIVER_WALLET)

      console.log('running tx for minting NFT...')
      // Calling sendAndConfirmRawTransaction() without a confirmationStrategy 
      // is no longer supported and will be removed in a future version.
      let tx = await sendAndConfirmRawTransaction(
        AnchorProvider.env().connection,
        recoveredTransaction.serialize(),
      )
      console.log('tx', tx)
      expect(tx).not.to.be.null

      // Check state of the NFT
      let statusState = await program.account.kycDaoNftStatus.fetch(statusId)
      console.log(`statusState: ${JSON.stringify(statusState, null, 2)}`)
      
      const BEBalanceAfter = await AnchorProvider.env().connection.getBalance(BACKEND_WALLET.publicKey)
      const UserBalanceAfter = await AnchorProvider.env().connection.getBalance(RECEIVER_WALLET.publicKey)

      console.log('BE SOL spent: ', (BEBalance - BEBalanceAfter) / LAMPORTS_PER_SOL)
      console.log('User SOL spent: ', (UserBalance - UserBalanceAfter) / LAMPORTS_PER_SOL)

      // Run hasValidToken to check if the user has a valid token
      const reqAcctsHasValidToken = {
        status: statusId,
      }

      const resp = await program.methods.hasValidToken(
        RECEIVER_WALLET.publicKey,
      )
      .accounts(reqAcctsHasValidToken)
      .view()

      console.log('resp: ', resp)

      // const newTransaction = await program.methods.hasValidToken(
      //   RECEIVER_WALLET.publicKey,
      // )
      // .accounts(reqAcctsHasValidToken)
      // .transaction()
      // // newTransaction.feePayer = RECEIVER_WALLET.publicKey

      // // Submit the transaction
      // console.log('running tx for hasValidToken...')
      // tx = await sendAndConfirmTransaction(
      //   AnchorProvider.env().connection,
      //   newTransaction,
      //   [RECEIVER_WALLET],
      // )
      // console.log('tx', tx)
      // expect(tx).not.to.be.null

      // // Wait 10 seconds for the transaction log to be available
      // console.log('waiting 3 seconds for the transaction log to be available...')
      // await new Promise(f => setTimeout(f, 3000));

      // const log = await getLogIncluding('', program, tx)
      // console.log('log: ', log)
    } catch (e) {
      throw e
    }
  })

  // it('Should mint a Soulbounded NFT using mintWithArgs', async () => {
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

  //     /* Prepare accounts */
  //     let transaction = new Transaction().add(
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
  //     let tx = await sendAndConfirmTransaction(
  //       AnchorProvider.env().connection,
  //       transaction,
  //       [BACKEND_WALLET, mint],
  //     )
  //     console.log(tx)

  //     console.log('creating transaction for mintWithCode...')

  //     const reqAccts = {
  //       collection: collectionId,
  //       status: statusId,
  //       // kycdaoNftAuthmint: authMintId,
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
  //       .mintWithArgs(
  //           new BN(1701436998),                               // expiry
  //           new BN(0),                                        // secondsToPay
  //           // secondsToPay: new BN(SECS_IN_YEAR),
  //           'QmUDyt1mZEMUMLQ1PQj7UnYvo9phLLG6j3TKV7AvW6P4u6', // metadataCid
  //           'one',                                            // verificationTier
  //       )
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
  //     )
  //     console.log('tx', tx)
  //     expect(tx).not.to.be.null

  //     // Check state of the NFT
  //     let statusState = await program.account.kycDaoNftStatus.fetch(statusId)
  //     console.log(`statusState: ${JSON.stringify(statusState, null, 2)}`)
      
  //   } catch (e) {
  //     throw e
  //   }
  // })
})
