import { Program, web3, BN, Idl } from '@project-serum/anchor'
import idl from '../target/idl/kyc_dao.json'
import { MY_WALLET, parsePrice } from '../utils/utils'
import { KYCDAO_COLLECTION_KYC_SEED, programId } from '../utils/constants'
import { KycDao } from '../target/types/kyc_dao'
import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
dotenv.config()

const main = async (price: number, ethAddress?: string, signer?: any) => {
  const { PublicKey } = web3
  
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

  /* calculates the program address using seeds from 'constants.ts'*/
  const [kycdaoNFTCollectionId, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(KYCDAO_COLLECTION_KYC_SEED)],
    new PublicKey(idl.metadata.address),
  )

  /* update collection */
  const tx = await program.rpc.updateKycdaonftCollection(
    bump,
    {
      ethSigner: eth_address,
      pricePerYear: new BN(parsePrice(price)),
      nftsMinted: new BN(0),
      symbol: 'KYC',
      name: 'KYCDAO NFT',
    } as any,
    {
      accounts: {
        kycdaoNftCollection: kycdaoNFTCollectionId,
        wallet: MY_WALLET.publicKey, // who will receive the SOL of each mint
        authority: MY_WALLET.publicKey,
      },
      signers: [MY_WALLET],
    },
  )
  console.log('Transaction signature:', tx)
  return tx
}

export default main
