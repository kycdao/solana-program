import { Program, web3, workspace, BN } from '@project-serum/anchor'
import idl from '../target/idl/kyc_dao.json'
import { MY_WALLET, parsePrice } from '../utils/utils'
import { CANDY_PREFIX, CANDY_SUFIX } from '../utils/constants'
import { KycDao } from '../target/types/kyc_dao'
import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
dotenv.config()

const main = async () => {
  const { SystemProgram, PublicKey } = web3

  /* lib */
  const program = workspace.KycDao as Program<KycDao>

  /* ethereum wallet settings */
  const eth_signer: ethers.Wallet = new ethers.Wallet(
    process.env.ETH_PRIVATE_KEY,
    ethers.getDefaultProvider(),
  )
  const eth_address = ethers.utils.computeAddress(eth_signer.publicKey).slice(2)

  /* calculates the program address using seeds from 'constants.ts'*/
  const [candyMachine, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(CANDY_PREFIX), Buffer.from(CANDY_SUFIX)],
    new PublicKey(idl.metadata.address),
  )

  /* initialize candy machine */
  const tx = await program.rpc.initializeCandyMachine(
    bump,
    {
      ethSigner: ethers.utils.arrayify('0x' + eth_address),
      price: new BN(parsePrice(0.5)),
      symbol: 'LLL',
      sellerFeeBasisPoints: 500, // 500 = 5%
      nftsMinted: new BN(0),
      maxSupply: new BN(48),
      creators: [{ address: MY_WALLET.publicKey, verified: true, share: 100 }],
    } as any,
    {
      accounts: {
        candyMachine,
        wallet: MY_WALLET.publicKey, // who will receive the SOL of each mint
        authority: MY_WALLET.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [MY_WALLET],
    },
  )
  console.log('The transaction tx:\n', tx)
}

export default main
