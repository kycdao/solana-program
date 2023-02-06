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
  import idl from '../../target/idl/kyc_dao.json'
  import { KycDao } from '../../target/types/kyc_dao'
  import { KycdaoCpiExample } from '../../target/types/kycdao_cpi_example'
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
    KYCDAO_PROGRAM_ID
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

const MEMBERSHIP_SEED = "MEMBERSHIP_SEED"
let exampleProgram: Program<KycdaoCpiExample>
let kycdaoProgram: Program<KycDao>

describe('tests', () => {
  setProvider(AnchorProvider.env())

  before(async () => {
    // Before set up here

  }),

  it('Should check the checkAddress function', async () => {
    try {
      console.log("Running checkAddress test...")

      exampleProgram = workspace.KycdaoCpiExample as Program<KycdaoCpiExample>
      kycdaoProgram = workspace.KycDao as Program<KycDao>
  
      const [statusId, _bump] = await getStatusId(RECEIVER_WALLET.publicKey)

      // Run checkAddress to check if the user has a valid token
      const reqAcctsCheckAddress = {
        kycdaoStatus: statusId,
        kycdaoProgram: KYCDAO_PROGRAM_ID,
      }

      const resp = await exampleProgram.methods.checkAddress(
        RECEIVER_WALLET.publicKey,
      )
      .accounts(reqAcctsCheckAddress)
      .view()

      console.log(`checkAddress resp: ${resp}`)

    } catch (err) {
        console.log(err)
    }
  })

  it('Should add a new member after checking kycDAO status', async () => {
    try {
      console.log("Running addNewMember test...")

      const [statusId, _bump] = await getStatusId(RECEIVER_WALLET.publicKey)

      // Generate a random byte array for the seed
      const membershipSeed = ethers.utils.randomBytes(8)

      const [membershipStatusId, _] = await web3.PublicKey.findProgramAddress(
        [membershipSeed, RECEIVER_WALLET.publicKey.toBuffer()],
        exampleProgram.programId,
      )

      // Run addNewMember to add new member
      const reqAcctsAddNewMember = {
        receiver: RECEIVER_WALLET.publicKey,
        kycdaoProgram: kycdaoProgram.programId,
        kycdaoStatus: statusId,
        membershipStatus: membershipStatusId,
        systemProgram: SystemProgram.programId,
      }

      // This membership seed is just to ensure we are using a new account for each test run
      const tx = await exampleProgram.methods.addNewMember(new BN(1), Buffer.from(membershipSeed))
      .accounts(reqAcctsAddNewMember)
      .transaction()

      const txResp = await sendAndConfirmTransaction(
        AnchorProvider.env().connection,
        tx,
        [RECEIVER_WALLET],
      )

      const log = await getLogIncluding('', exampleProgram, txResp)
      console.log(`addNewMember log: ${log}`)

    } catch (err) {
        console.log(err)
    }
  })

})