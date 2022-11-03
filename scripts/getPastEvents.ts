import * as anchor from '@project-serum/anchor'
import { web3 } from '@project-serum/anchor'
import { Finality, SignaturesForAddressOptions } from '@solana/web3.js'

const getPastEvents = async <T extends anchor.Idl>(
  program: anchor.Program<T>,
  options?: SignaturesForAddressOptions,
  finality?: Finality,
) => {
  const connection = new web3.Connection(
    web3.clusterApiUrl('devnet'),
    'confirmed',
  )

  // get all transactions which include the program ID
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

  // signatures for which getTransaction returned null
  const problemTransactions = transactionOrNulls
    .map((tx, index) => (tx ? null : signatures[index].signature))
    .filter(isNotNullOrUndefined)

  if (problemTransactions.length) {
    throw Error(
      'Details for the following transactions were not found: ' +
        problemTransactions.join(', '),
    )
  }

  // all the transactions that we could fetch
  const transactions = transactionOrNulls.filter(isNotNullOrUndefined)

  // parse the transactions logs into events
  const events = transactions
    .map((tx) => {
      const logs = tx.meta?.logMessages
      // summing the computed units from each transaction
      const computedUnits = logs.reduce((acc, log) => {
        if (log.includes('compute units')) {
          return acc + Number(log.split(' ')[3])
        }
        return acc
      }, 0)
      // hides the upgradable loaders, because they do not compute units
      return computedUnits > 0
        ? {
            transaction: tx.transaction.signatures[0],
            timestamp: tx.blockTime,
            computeUnits: computedUnits,
            events: logs,
          }
        : null
    })
    .filter(isNotNullOrUndefined)

  return events
}

export default getPastEvents
