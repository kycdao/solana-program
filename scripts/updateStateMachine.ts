import { Program, Idl } from '@project-serum/anchor'
import { KycDao } from '../target/types/ntnft'
import idl from '../target/idl/ntnft.json'
import { MY_WALLET } from '../utils/utils'
import { stateMachine, programId } from '../utils/constants'

const main = async (associatedAccount: any, flag: boolean) => {
  /* lib */
  const program = new Program(idl as Idl, programId) as Program<KycDao>

  const tx = await program.rpc.updateStateMachine(flag, {
    accounts: {
      stateMachine,
      associatedAccount,
      authority: MY_WALLET.publicKey,
    },
    signers: [MY_WALLET],
  })
  console.log('Transaction signature:', tx)
}

export default main
