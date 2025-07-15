/* eslint-disable no-console */
import dotenv from 'dotenv'
import { Task } from '@forgehive/task'
import { createHiveLogClient } from '@forgehive/hive-sdk'
import { getPrice } from '../tasks/stock/getPrice'

// Load environment variables
dotenv.config()

// Create the Hive client
const client = createHiveLogClient({
  projectName: 'Mono repo sample project',
  metadata: {
    environment: 'development',
    version: '1.0.0'
  }
})

// Example: Direct sendLog usage (for one-off logging)
console.log('=== Direct SendLog Usage Example ===')

async function main(): Promise<void> {
  try {
    console.log('Running tasks with direct logging...')

    // Execute a task without global listener
    const originalListener = Task.globalListener
    Task.globalListener = undefined // Temporarily disable global listener

    const [, , record] = await getPrice.safeRun({ ticker: 'NVDA' })

    // Manually log this specific execution
    if (record) {
      const logResult = await client.sendLog(record, {
        environment: 'main',
        method: 'direct',
        manual: 'true'
      })
      console.log('Direct logging result:', logResult)
    }

    // Restore the global listener
    Task.globalListener = originalListener

    console.log('\n=== Example completed ===')
  } catch (error) {
    console.error('Error in main:', error)
  }
}

// Run the main function
main().catch(console.error)
