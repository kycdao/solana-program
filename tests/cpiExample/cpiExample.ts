import {
    Program,
    web3,
    workspace,
    setProvider,
    AnchorProvider,
    BN,
  } from '@project-serum/anchor'
  import {
    sendAndConfirmTransaction,
  } from '@solana/web3.js'
  import { KycDao } from '../../target/types/kyc_dao'
  import { KycdaoCpiExample } from '../../target/types/kycdao_cpi_example'
  import {
    KYCDAO_PROGRAM_ID
  } from '../../utils/constants'
  import { ethers } from 'ethers'
  import {
    getStatusId,
    RECEIVER_WALLET,
  } from '../../utils/utils'
  import getLogIncluding from '../../scripts/getLogIncluding'
  import * as dotenv from 'dotenv'
  dotenv.config()

const { SystemProgram } = web3

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