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
  import { Ntnft } from '../../target/types/ntnft'
  import { NtnftCpiExample } from '../../target/types/ntnft_cpi_example'
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

let exampleProgram: Program<NtnftCpiExample>
let kycdaoProgram: Program<Ntnft>

describe('tests', () => {
  setProvider(AnchorProvider.env())

  before(async () => {
    // Before set up here

  }),

  it('Should check the checkAddress function', async () => {
    console.log("Running checkAddress test...")

    exampleProgram = workspace.NtnftCpiExample as Program<NtnftCpiExample>
    kycdaoProgram = workspace.Ntnft as Program<Ntnft>

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
  })

  it('Should add a new member after checking kycDAO status', async () => {
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
  })

})
