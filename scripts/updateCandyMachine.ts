import { Program, BN, Idl } from '@project-serum/anchor'
import idl from '../target/idl/kyc_dao.json'
import { MY_WALLET, parsePrice } from '../utils/utils'
import { candyMachine, programId } from '../utils/constants'
import { KycDao } from '../target/types/kyc_dao'
import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
dotenv.config()

const main = async (price: number, ethAddress?: string, signer?: any) => {
  /* workspace */
  const program = new Program(idl as Idl, programId) as Program<KycDao>

  /* ethereum address settings */
  const eth_signer: ethers.Wallet = new ethers.Wallet(
    process.env.ETH_PRIVATE_KEY,
    ethers.getDefaultProvider(),
  )
  const c_eth_signer = ethers.utils
    .computeAddress(eth_signer.publicKey)
    .slice(2)

  const eth_address = ethers.utils.arrayify(
    ethAddress ? ethAddress : '0x' + c_eth_signer,
  )

  /* update candy machine */
  const tx = await program.rpc.updateCandyMachine(
    eth_address, // eth address
    new BN(parsePrice(price)), // price
    {
      accounts: {
        candyMachine,
        authority: signer ? signer.publicKey : MY_WALLET.publicKey,
      },
      signers: [signer ? signer : MY_WALLET],
    },
  )
  console.log('Transaction signature:', tx)
  return tx
}

export default main
