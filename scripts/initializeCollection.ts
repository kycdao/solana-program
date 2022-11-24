import { Program, web3, workspace, BN } from '@project-serum/anchor'
import idl from '../target/idl/kyc_dao.json'
import { MY_WALLET, parsePrice } from '../utils/utils'
import { KYCDAO_COLLECTION_KYC_SEED } from '../utils/constants'
import { KycDao } from '../target/types/kyc_dao'
import { ethers } from 'ethers'
import getLogInluding from './getLogInluding'
import * as dotenv from 'dotenv'
dotenv.config()

const main = async () => {
  console.log('\nRunning init KycDAO NFT Collection...\n')

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
  const [kycdaoNFTCollectionId, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(KYCDAO_COLLECTION_KYC_SEED)],
    new PublicKey(idl.metadata.address),
  )

  console.log('\nStarting tx...\n')

  /* initialize collection */
  const tx = await program.rpc.initializeKycdaonftCollection(
    bump,
    {
      ethSigner: ethers.utils.arrayify('0x' + eth_address),
      pricePerYear: new BN(parsePrice(0.5)),
      nftsMinted: new BN(0),
      symbol: 'KYC',
      name: 'KYCDAO NFT',

      // sellerFeeBasisPoints: 500, // 500 = 5%
      // maxSupply: new BN(48),
      // creators: [{ address: MY_WALLET.publicKey, verified: true, share: 100 }],
      //TODO: Can we get a type for the collection here?
    } as any,
    {
      accounts: {
        kycdaoNftCollection: kycdaoNFTCollectionId,
        wallet: MY_WALLET.publicKey, // who will receive the SOL of each mint
        authority: MY_WALLET.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [MY_WALLET],
    },
  )

  if (!tx) {
    return false
  }

  console.log('\nThe transaction tx:\n', tx)

  // Fetch data from the new account
  const kycdaoNFTCollectionState = await program.account.kycDaoNftCollection.fetch(
    kycdaoNFTCollectionId,
  )

  console.log('\nThe kycdaoNFTCollectionState:\n', kycdaoNFTCollectionState)

  return true
}

export default main
