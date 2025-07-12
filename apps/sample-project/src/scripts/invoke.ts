/* eslint-disable no-console */
import dotenv from 'dotenv'
import { createHiveClient, isInvokeError } from '@forgehive/hive-sdk'

// Load environment variables
dotenv.config()

async function invokeTask(): Promise<void> {
  const client = createHiveClient({
    projectUuid: process.env.HIVE_PROJECT_UUID || '',
    host: process.env.HIVE_HOST,
    apiKey: process.env.HIVE_API_KEY,
    apiSecret: process.env.HIVE_API_SECRET
  })

  // Example: Invoke a stock price task
  const taskName = 'stock:getPrice'
  const payload = { ticker: 'AAPL' }

  console.log(`Invoking task: ${taskName}`)
  console.log('Payload:', payload)

  try {
    const result = await client.invoke(taskName, payload)

    if (isInvokeError(result)) {
      console.error('Error invoking task:', result.error)
    } else {
      console.log('Success:', result)
    }
  } catch (error) {
    console.error('Failed to invoke task:', error)
  }
}

if (require.main === module) {
  invokeTask()
}
