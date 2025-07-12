# Sending Logs to Hive

This guide explains how to capture and send task execution logs to Hive using the `@forgehive/hive-sdk` package. The core pattern involves running tasks with `safeRun()` to capture execution records, then sending those records to Hive for analysis and quality assessment.

## Quick Start

```typescript
import { HiveLogClient } from '@forgehive/hive-sdk'
import { createTask, Schema } from '@forgehive/task'

// Create a Hive client
const client = new HiveLogClient({
  projectName: 'My Project',
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret'
})

// Run a task and capture the execution record
const [result, error, record] = await someTask.safeRun(args)

// Send the log to Hive
await client.sendLog('task-name', record)
```

## Core Workflow

The typical workflow for sending logs to Hive involves three steps:

1. **Execute a task** using `safeRun()` to capture the execution record
2. **Create a Hive client** with your project credentials
3. **Send the execution record** to Hive for storage and analysis

### Step 1: Execute Tasks with safeRun()

Tasks created with `createTask()` provide a `safeRun()` method that returns a tuple containing:
- `result`: The task's return value (or `null` if error)
- `error`: Any error that occurred (or `null` if successful)
- `record`: Complete execution record including inputs, outputs, and boundary calls

```typescript
const getUserData = createTask({
  name: 'getUserData',
  description: 'Fetch user data from database',
  schema: new Schema({
    userId: Schema.string()
  }),
  boundaries: {
    database: {
      findUser: async (id: string) => ({ id, name: 'John', email: 'john@example.com' })
    }
  },
  fn: async ({ userId }, { database }) => {
    const user = await database.findUser(userId)
    return { user, timestamp: Date.now() }
  }
})

// Execute the task and capture the execution record
const [result, error, record] = await getUserData.safeRun({ userId: 'user-123' })
```

### Step 2: Create a Hive Client

Set up the Hive client with your project configuration:

```typescript
const client = new HiveLogClient({
  projectName: 'My Application',
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret',
  host: 'https://your-hive-instance.com', // Optional, defaults to https://www.forgehive.cloud
  metadata: {
    environment: 'production',
    version: '1.0.0',
    service: 'user-service'
  }
})
```

### Step 3: Send Logs to Hive

Send the execution record to Hive for analysis:

```typescript
const status = await client.sendLog('getUserData', record)

switch (status) {
  case 'success':
    console.log('Log sent successfully')
    break
  case 'error':
    console.error('Failed to send log')
    break
  case 'silent':
    console.log('Running in silent mode - no credentials')
    break
}
```

## Complete Example

Here's a complete example showing the full workflow:

```typescript
import { HiveLogClient } from '@forgehive/hive-sdk'
import { createTask, Schema } from '@forgehive/task'

// Create a task
const processPayment = createTask({
  name: 'processPayment',
  description: 'Process user payment transaction',
  schema: new Schema({
    userId: Schema.string(),
    amount: Schema.number(),
    currency: Schema.string()
  }),
  boundaries: {
    paymentGateway: {
      charge: async (amount: number, currency: string) => ({
        transactionId: 'tx-123',
        status: 'success'
      })
    },
    database: {
      recordTransaction: async (transaction: any) => ({ id: 'record-456' })
    }
  },
  fn: async ({ userId, amount, currency }, { paymentGateway, database, setMetadata }) => {
    // Add metadata for tracking
    await setMetadata('userId', userId)
    await setMetadata('amount', amount.toString())
    await setMetadata('currency', currency)

    // Process payment
    const charge = await paymentGateway.charge(amount, currency)

    // Record transaction
    const record = await database.recordTransaction({
      userId,
      amount,
      currency,
      transactionId: charge.transactionId
    })

    return {
      success: true,
      transactionId: charge.transactionId,
      recordId: record.id
    }
  }
})

// Create Hive client
const hiveClient = new HiveLogClient({
  projectName: 'E-commerce Platform',
  apiKey: process.env.HIVE_API_KEY,
  apiSecret: process.env.HIVE_API_SECRET,
  metadata: {
    environment: process.env.NODE_ENV || 'development',
    version: '2.1.0',
    service: 'payment-service'
  }
})

// Execute task and send log
async function handlePayment(userId: string, amount: number, currency: string) {
  // Run the task
  const [result, error, record] = await processPayment.safeRun({
    userId,
    amount,
    currency
  })

  // Send log to Hive with additional metadata
  const logStatus = await hiveClient.sendLog('processPayment', record, {
    requestId: generateRequestId(),
    clientVersion: '1.0.0',
    userAgent: 'mobile-app-ios'
  })

  if (logStatus === 'success') {
    console.log('Payment processed and logged successfully')
  } else {
    console.warn('Payment processed but logging failed:', logStatus)
  }

  // Handle the result
  if (error) {
    throw new Error(`Payment failed: ${error.message}`)
  }

  return result
}

// Usage
handlePayment('user-123', 29.99, 'USD')
  .then(result => console.log('Payment result:', result))
  .catch(error => console.error('Payment error:', error))
```

## Advanced Patterns

### Batch Logging

For high-throughput applications, you might want to batch log sends:

```typescript
class BatchLogSender {
  private batch: Array<{ taskName: string; record: any; metadata?: any }> = []
  private client: HiveLogClient

  constructor(client: HiveLogClient) {
    this.client = client
  }

  add(taskName: string, record: any, metadata?: any) {
    this.batch.push({ taskName, record, metadata })

    // Send batch when it reaches a certain size
    if (this.batch.length >= 10) {
      this.flush()
    }
  }

  async flush() {
    const batch = [...this.batch]
    this.batch = []

    // Send all logs in parallel
    const promises = batch.map(({ taskName, record, metadata }) =>
      this.client.sendLog(taskName, record, metadata)
    )

    const results = await Promise.allSettled(promises)
    console.log('Batch results:', results)
  }
}

// Usage
const batchLogger = new BatchLogSender(hiveClient)

// Add logs to batch
const [result1, error1, record1] = await task1.safeRun(args1)
batchLogger.add('task1', record1)

const [result2, error2, record2] = await task2.safeRun(args2)
batchLogger.add('task2', record2)

// Flush remaining logs
await batchLogger.flush()
```

### Error Handling and Retries

Implement robust error handling for log sending:

```typescript
async function sendLogWithRetry(
  client: HiveLogClient,
  taskName: string,
  record: any,
  metadata?: any,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const status = await client.sendLog(taskName, record, metadata)

      if (status === 'success') {
        return status
      }

      if (status === 'silent') {
        console.log('Client in silent mode, skipping retry')
        return status
      }

      // status === 'error', retry
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
        console.log(`Retrying log send in ${delay}ms (attempt ${attempt}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    } catch (error) {
      console.error(`Log send attempt ${attempt} failed:`, error)

      if (attempt === maxRetries) {
        throw error
      }
    }
  }

  return 'error'
}

// Usage
const [result, error, record] = await someTask.safeRun(args)
const status = await sendLogWithRetry(hiveClient, 'someTask', record)
```

### Conditional Logging

Only send logs based on certain conditions:

```typescript
async function executeWithConditionalLogging(
  task: any,
  args: any,
  shouldLog: (result: any, error: any, record: any) => boolean
) {
  const [result, error, record] = await task.safeRun(args)

  if (shouldLog(result, error, record)) {
    await hiveClient.sendLog(task.getName() || 'unknown', record)
  }

  return [result, error, record]
}

// Usage - only log errors
await executeWithConditionalLogging(
  paymentTask,
  { amount: 100 },
  (result, error, record) => error !== null
)

// Usage - only log successful high-value transactions
await executeWithConditionalLogging(
  paymentTask,
  { amount: 5000 },
  (result, error, record) => !error && result?.amount > 1000
)
```

## Configuration Options

### Client Configuration

```typescript
const client = new HiveLogClient({
  projectName: 'My Project',           // Required
  apiKey: 'your_api_key',             // Optional - uses HIVE_API_KEY env var
  apiSecret: 'your_api_secret',       // Optional - uses HIVE_API_SECRET env var
  host: 'https://custom-host.com',    // Optional - uses HIVE_HOST env var or default
  metadata: {                         // Optional - base metadata for all logs
    environment: 'production',
    version: '1.0.0',
    datacenter: 'us-east-1'
  }
})
```

### Environment Variables

Set these environment variables as an alternative to explicit configuration:

```bash
HIVE_API_KEY=your_api_key_here
HIVE_API_SECRET=your_api_secret_here
HIVE_HOST=https://your-hive-instance.com
```

### Metadata Priority

Metadata is merged with the following priority (highest to lowest):

1. **sendLog metadata** - Passed directly to `sendLog()`
2. **Record metadata** - From the task execution record
3. **Client metadata** - Set when creating the client

```typescript
// All three levels of metadata
const client = new HiveLogClient({
  projectName: 'My Project',
  metadata: { environment: 'production', version: '1.0.0' }  // Client level
})

// Task adds metadata via setMetadata()
await someTask.safeRun(args)  // Record level metadata

// Send with additional metadata
await client.sendLog('task-name', record, {
  requestId: 'req-123'  // sendLog level metadata (highest priority)
})
```

## Best Practices

### 1. Use Meaningful Task Names

```typescript
// Good - descriptive task names
await client.sendLog('user-authentication', record)
await client.sendLog('payment-processing', record)
await client.sendLog('email-notification', record)

// Avoid - vague names
await client.sendLog('task1', record)
await client.sendLog('process', record)
```

### 2. Add Contextual Metadata

```typescript
await client.sendLog('user-authentication', record, {
  requestId: request.id,
  userAgent: request.headers['user-agent'],
  ipAddress: request.ip,
  authMethod: 'oauth2'
})
```

### 3. Handle Silent Mode Gracefully

```typescript
if (client.isActive()) {
  await client.sendLog('task-name', record)
} else {
  console.log('Hive client in silent mode - logs not sent')
}
```

### 4. Use Structured Logging

```typescript
const logger = {
  async logTaskExecution(taskName: string, record: any, metadata?: any) {
    const status = await client.sendLog(taskName, record, metadata)

    console.log({
      event: 'task_logged',
      taskName,
      status,
      timestamp: new Date().toISOString(),
      metadata
    })

    return status
  }
}
```

## Troubleshooting

### Common Issues

**1. Silent Mode (No Credentials)**
```typescript
// Check if client is active
if (!client.isActive()) {
  console.log('Client in silent mode - check API credentials')
}
```

**2. Network Errors**
```typescript
const status = await client.sendLog('task-name', record)
if (status === 'error') {
  console.error('Network error - check connectivity and host URL')
}
```

**3. Invalid Records**
```typescript
// Ensure record has required structure
if (!record.input || !record.boundaries) {
  console.error('Invalid record structure')
}
```

### Debug Logging

Enable debug logs to troubleshoot issues:

```bash
DEBUG=hive-sdk node your-app.js
```

This will show detailed logs of the SDK's internal operations.

## Related Documentation

- [Hive SDK README](../packages/hive-sdk/README.md) - Complete SDK documentation
- [Task and Boundaries Design](./task-and-boundaries-design.md) - Understanding the task pattern
- [Testing with Boundary Mocks](./testing-with-boundary-mocks.md) - Testing strategies