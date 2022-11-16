import {
  Program,
  web3,
  workspace,
  setProvider,
  AnchorProvider,
} from '@project-serum/anchor'
import { KycDao } from '../target/types/kyc_dao'
import getPastEvents from '../scripts/getPastEvents'
import findTransactionSignature from '../scripts/getTransactionSignatures'
import * as assert from 'assert'

describe('tests', () => {
  setProvider(AnchorProvider.env())

  /* Log related */
  // it('Get oldest account transaction signature and information', async () => {
  //   const program = workspace.KycDao as Program<KycDao>
  //   // connection must have confirmed status to call getSignaturesForAddress
  //   let connection = new web3.Connection(
  //     web3.clusterApiUrl('devnet'),
  //     'confirmed',
  //   )
  //   const signatures = await findTransactionSignature(
  //     connection,
  //     program.programId,
  //   )
  //   console.log(signatures)
  // })

  // it('Get all transaction signatures made while interaction with this program', async () => {
  //   const program = workspace.KycDao as Program<KycDao>
  //   // connection must have confirmed status to call getSignaturesForAddress
  //   let connection = new web3.Connection(
  //     web3.clusterApiUrl('devnet'),
  //     'confirmed',
  //   )
  //   const signatures = await connection.getSignaturesForAddress(
  //     program.programId,
  //   )
  //   console.log(signatures)
  // })

  // it('Get all past events logs of this program', async () => {
  //   const program = workspace.KycDao as Program<KycDao>
  //   const events = await getPastEvents(program)
  //   console.log(events)
  // })
})
