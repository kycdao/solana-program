import * as anchor from '@project-serum/anchor'
import { web3 } from '@project-serum/anchor'
import { Finality, SignaturesForAddressOptions } from '@solana/web3.js'

const getLogInluding = async <T extends anchor.Idl>(
  inclusionString: string,
  program: anchor.Program<T>,
  transaction: string,
  options?: SignaturesForAddressOptions,
  finality?: Finality,
) => {
  const connection = new web3.Connection(
    web3.clusterApiUrl('devnet'),
    'confirmed',
  )

  const signatures = await connection.getSignaturesForAddress(
    program.programId,
    options,
    finality,
  )
  const transactionOrNulls = await connection.getTransactions(
    signatures.map((x) => x.signature),
  )

  const isNotNullOrUndefined = (value: unknown): boolean =>
    value !== null && value !== undefined

  const problemTransactions = transactionOrNulls
    .map((tx, index) => (tx ? null : signatures[index].signature))
    .filter(isNotNullOrUndefined)

  if (problemTransactions.length) {
    throw Error(
      'Details for the following transactions were not found: ' +
        problemTransactions.join(', '),
    )
  }

  const transactions = transactionOrNulls.filter(isNotNullOrUndefined)

  const events = transactions
    .map((tx) => {
      const logs = tx.meta?.logMessages
      // const pat = tx.meta?.postTokenBalances ? tx.meta?.postTokenBalances : null
      const include = logs.reduce((acc, log) => {
        if (log.includes(inclusionString)) {
          acc.push(log)
        }
        return acc
      }, [])

      return tx.transaction.signatures[0] == transaction
        ? {
            transaction: tx.transaction.signatures[0],
            timestamp: tx.blockTime,
            postTokenBalances: tx.meta?.postTokenBalances,
            events: include,
          }
        : null
    })
    .filter(isNotNullOrUndefined)

  return events
}

export default getLogInluding
