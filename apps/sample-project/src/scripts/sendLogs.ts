import dotenv from 'dotenv'
import { createHiveLogClient } from '@forgehive/hive-sdk'
import { getPrice } from '../tasks/stock/getPrice'

// Load environment variables
dotenv.config()

// Use the project name from forge.json
const client = createHiveLogClient('Mono repo sample project')

async function main(): Promise<void> {

  const [result, error, record] = await getPrice.safeRun({ ticker: 'AAPL' })
  console.log('result', result)
  console.log('error', error)
  console.log('record', record)
  const log = await client.sendLog('stock:getPrice', record, {
    environment: 'main',
  })
  console.log('log', log)
}

// Run the main function
// eslint-disable-next-line no-console
main().catch(console.error)
