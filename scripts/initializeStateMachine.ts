import { Program, web3, workspace } from '@project-serum/anchor'
import idl from '../target/idl/kyc_dao.json'
import { MY_WALLET } from '../utils/utils'
import { STATE_PREFIX, STATE_SUFIX } from '../utils/constants'
import { KycDao } from '../target/types/kyc_dao'

const main = async () => {
  const { SystemProgram, PublicKey } = web3

  /* lib */
  const program = workspace.KycDao as Program<KycDao>

  /* calculates the program address using seeds from 'constants.ts'*/
  const [stateMachine, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(STATE_PREFIX), Buffer.from(STATE_SUFIX)],
    new PublicKey(idl.metadata.address),
  )

  /* initialize state machine */
  const tx = await program.rpc.initializeStateMachine(bump, {
    accounts: {
      stateMachine: stateMachine,
      authority: MY_WALLET.publicKey,
      systemProgram: SystemProgram.programId,
    },
    signers: [MY_WALLET],
  })
  console.log('The transaction tx:', tx)
}

export default main
