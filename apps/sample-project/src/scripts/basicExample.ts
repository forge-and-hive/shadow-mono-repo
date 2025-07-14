/* eslint-disable no-console */
import { Task } from '@forgehive/task'
import { createHiveLogClient } from '@forgehive/hive-sdk'
import { getPrice } from '../tasks/stock/getPrice'

// This is the basic example from the specification
const client = createHiveLogClient({
  projectName: 'Mono repo sample project',
  metadata: {
    environment: 'main',
  }
})

// Simple version - logs all tasks automatically
Task.listenExecutionRecords(client.getListener())

// That way when a task is executed:
async function main(): Promise<void> {
  console.log('Running basic example from specification...')

  // This will trigger the global listener
  const [result, error] = await getPrice.safeRun({
    ticker: 'AAPL'
  })

  if (error) {
    console.error('Task failed:', error)
    return
  }

  console.log('Task result:', result)
  console.log('Example completed - check the logs above')
}

main().catch(console.error)
