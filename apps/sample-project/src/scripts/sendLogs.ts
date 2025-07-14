/* eslint-disable no-console */
import dotenv from 'dotenv'
import { Task } from '@forgehive/task'
import { createHiveLogClient } from '@forgehive/hive-sdk'
import { getPrice } from '../tasks/stock/getPrice'
import { getPortfolio } from '../tasks/stock/getPortfolio'

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

// Example 1: Simple automatic logging for all tasks
console.log('=== Example 1: Automatic Global Logging ===')

// Set up automatic logging for all task executions
Task.listenExecutionRecords(client.getListener())

async function runAutomaticLoggingExample(): Promise<void> {
  console.log('Running tasks with automatic logging...')
  
  // All these task executions will be automatically logged
  const [priceResult, priceError] = await getPrice.safeRun({ ticker: 'AAPL' })
  console.log('Price result:', priceResult)
  
  if (!priceError) {
    const [portfolioResult, portfolioError] = await getPortfolio.safeRun({ 
      userUUID: '12-3' 
    })
    console.log('Portfolio result:', portfolioResult)
  }
}

// Example 2: Manual logging with filtering and PII removal
console.log('\n=== Example 2: Manual Logging with Filtering ===')

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

async function runManualLoggingExample(): Promise<void> {
  console.log('Running tasks with manual filtering...')
  
  // These executions will be filtered and sanitized before logging
  const [priceResult, priceError] = await getPrice.safeRun({ ticker: 'TSLA' })
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
}

// Example 3: Direct sendLog usage (for one-off logging)
async function runDirectLoggingExample(): Promise<void> {
  console.log('\n=== Example 3: Direct SendLog Usage ===')
  
  // Execute a task without global listener
  const originalListener = Task.globalListener
  Task.globalListener = undefined // Temporarily disable global listener
  
  const [result, error, record] = await getPrice.safeRun({ ticker: 'NVDA' })
  
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
}

async function main(): Promise<void> {
  try {
    // Run Example 1: Automatic logging
    await runAutomaticLoggingExample()
    
    // Wait a bit for logs to process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Run Example 2: Manual logging with filtering
    await runManualLoggingExample()
    
    // Wait a bit for logs to process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Run Example 3: Direct logging
    await runDirectLoggingExample()
    
    console.log('\n=== All examples completed ===')
  } catch (error) {
    console.error('Error in main:', error)
  }
}

// Run the main function
main().catch(console.error)
