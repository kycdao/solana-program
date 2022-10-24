import * as anchor from '@project-serum/anchor'
import { KycDao } from '../target/types/kyc_dao'

describe('solana-program', () => {
  const PRICE_FEED_SOL_USD_PYTH = new anchor.web3.PublicKey(
    'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix',
  )
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.KycDao as anchor.Program<KycDao>

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.methods
      .getPrice()
      .accounts({
        priceFeed: PRICE_FEED_SOL_USD_PYTH,
      })
      .rpc()
    console.log('Your transaction signature', tx)
  })
})
