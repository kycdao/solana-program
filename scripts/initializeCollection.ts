import { Program, web3, workspace, BN } from '@project-serum/anchor'
import { BACKEND_WALLET, parsePrice } from '../utils/utils'
import { KYCDAO_COLLECTION_KYC_SEED, SUBSCRIPTION_COST_DECIMALS, KYCDAO_PROGRAM_ID } from '../utils/constants'
import { Ntnft } from '../target/types/ntnft'
import * as dotenv from 'dotenv'
dotenv.config()

const main = async () => {
  console.log('\nRunning init KycDAO NFT Collection...\n')

  const { SystemProgram, PublicKey } = web3

  /* lib */
  const program = workspace.Ntnft as Program<Ntnft>

  /* calculates the program address using seeds from 'constants.ts'*/
  const [kycdaoNFTCollectionId, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(KYCDAO_COLLECTION_KYC_SEED)],
    KYCDAO_PROGRAM_ID,
  )

  console.log('\nStarting tx...\n')

  const args = {
    pricePerYear: new BN(5 * SUBSCRIPTION_COST_DECIMALS), // subscription cost in USD
    nftsMinted: new BN(0),
    symbol: 'KYC',
    name: 'KYCDAO NFT',
    baseUrl: 'https://ipfs.io/ipfs/',

    //TODO: Can we get a type for the collection here?
  } as any
  
  /* initialize collection */
  try {
    const tx = await program.methods.initializeKycdaonftCollection(
      bump,
      args,
    )
    .accounts({
      kycdaoNftCollection: kycdaoNFTCollectionId,
      wallet: BACKEND_WALLET.publicKey, // who will receive the SOL of each mint
      authority: BACKEND_WALLET.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([BACKEND_WALLET])
    .transaction()
    
    // send tx
    const txHash = await program.provider.sendAndConfirm(tx)

    if (!tx) {
      return false
    }

    console.log('\nThe transaction txHash:\n', txHash)
  } catch (err) {
    console.log('\nError:\n', err)
    return false
  }

  // Fetch data from the new account
  const kycdaoNFTCollectionState = await program.account.kycDaoNftCollection.fetch(
    kycdaoNFTCollectionId,
  )

  console.log('\nThe kycdaoNFTCollectionState:\n', kycdaoNFTCollectionState)

  return true
}

export default main
