import { Program, web3, BN, Idl } from '@project-serum/anchor'
import idl from '../target/idl/kyc_dao.json'
import { MY_WALLET, parsePrice } from '../utils/utils'
import { candyMachine, programId } from '../utils/constants'
import { KycDao } from '../target/types/kyc_dao'

const main = async () => {
  const program = new Program(idl as Idl, programId) as Program<KycDao>

  await program.rpc.updateCandyMachine(
    new BN(parsePrice(0.7)),
    new BN(1640889000),
    {
      accounts: {
        candyMachine,
        authority: MY_WALLET.publicKey,
      },
      signers: [MY_WALLET],
    },
  )
}

export default main
