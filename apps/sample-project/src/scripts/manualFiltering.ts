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

// Example: Manual logging with filtering and PII removal
console.log('=== Manual Logging with Filtering Example ===')

// Replace the automatic listener with a manual one for filtering
Task.listenExecutionRecords(async (record) => {
  // Filter out sensitive tasks
  if (record.taskName?.includes('secret') || record.taskName?.includes('auth')) {
    console.log('Skipping logging for sensitive task:', record.taskName)
    return
  }

  // Remove PII from the record before logging
  const sanitizedRecord = {
    ...record,
    input: sanitizeInput(record.input),
    output: sanitizeOutput(record.output)
  }

  // Log with additional context
  const logResult = await client.sendLog(sanitizedRecord, {
    environment: 'main',
    filtered: 'true',
    timestamp: new Date().toISOString()
  })

  console.log(`Logged ${record.taskName} with result: ${logResult}`)
})

// Helper functions for PII removal
function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'object' && input !== null) {
    const sanitized = { ...input as Record<string, unknown> }

    // Remove sensitive fields
    delete sanitized.password
    delete sanitized.apiKey
    delete sanitized.secret

    // Mask email addresses
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && (sanitized[key] as string).includes('@')) {
        sanitized[key] = '***@***.***'
      }
    })

    return sanitized
  }
  return input
}

function sanitizeOutput(output: unknown): unknown {
  if (typeof output === 'object' && output !== null) {
    const sanitized = { ...output as Record<string, unknown> }

    // Remove sensitive response fields
    delete sanitized.internalId
    delete sanitized.userId

    return sanitized
  }
  return output
}

async function main(): Promise<void> {
  try {
    console.log('Running tasks with manual filtering...')

    // These executions will be filtered and sanitized before logging
    const [priceResult] = await getPrice.safeRun({ ticker: 'TSLA' })
    console.log('Price result:', priceResult)

    // Simulate a task with PII that would be filtered
    const testRecord = {
      taskName: 'user-data-fetch',
      input: { email: 'user@example.com', password: 'secret123' },
      output: { data: 'some data', internalId: 'internal123' },
      type: 'success' as const,
      boundaries: {},
      metadata: {}
    }

    // This would trigger our manual listener
    await client.sendLog(testRecord)

    console.log('\n=== Example completed ===')
  } catch (error) {
    console.error('Error in main:', error)
  }
}

// Run the main function
main().catch(console.error)
