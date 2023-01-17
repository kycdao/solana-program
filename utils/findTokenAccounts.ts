import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { clusterApiUrl, Connection } from '@solana/web3.js'
import { MY_WALLET, RECEIVER_WALLET } from '../utils/utils'

;(async () => {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  console.log('connection stablished')

  const accounts = await connection.getParsedProgramAccounts(
    TOKEN_PROGRAM_ID, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    {
      filters: [
        {
          dataSize: 165, // number of bytes
        },
        {
          memcmp: {
            offset: 32, // number of bytes
            bytes: MY_WALLET.publicKey.toBase58(), // base58 encoded string
          },
        },
      ],
    },
  )

  console.log(
    `Found ${
      accounts.length
    } token account(s) for wallet ${MY_WALLET.publicKey.toBase58()}: `,
  )
  accounts.forEach((account, i) => {
    console.log(
      `-- Token Account Address ${i + 1}: ${account.pubkey.toString()} --`,
    )
    console.log(`Mint: ${account.account.data['parsed']['info']['mint']}`)
    console.log(
      `Amount: ${account.account.data['parsed']['info']['tokenAmount']['uiAmount']}`,
    )
  })
})()
