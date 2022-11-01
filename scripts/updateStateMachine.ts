import { Program, Idl } from '@project-serum/anchor'
import { KycDao } from '../target/types/kyc_dao'
import idl from '../target/idl/kyc_dao.json'
import { MY_WALLET } from '../utils/utils'
import { stateMachine, programId } from '../utils/constants'

const main = async (associatedAccount: any, flag: boolean) => {
  /* lib */
  const program = new Program(idl as Idl, programId) as Program<KycDao>

  const tx2 = await program.rpc.updateStateMachine(flag, {
    accounts: {
      stateMachine,
      associatedAccount,
      authority: MY_WALLET.publicKey,
    },
    signers: [MY_WALLET],
  })
  console.log('Transaction signature:', tx2)
}

export default main
