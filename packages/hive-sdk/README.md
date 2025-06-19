# Hive SDK

A TypeScript/JavaScript SDK for interacting with the Forge Hive logging and quality assessment platform.

## Installation

```bash
npm install @forgehive/hive-sdk
```

or with pnpm:

```bash
pnpm add @forgehive/hive-sdk
```

## Setup

### 1. Environment Variables

Before using the SDK, you need to set up the following environment variables:

```bash
HIVE_API_KEY=your_api_key_here
HIVE_API_SECRET=your_api_secret_here
HIVE_HOST=https://your-hive-instance.com
```

You can get your API credentials at [https://forgehive.dev](https://forgehive.dev).

### 2. Basic Usage

```typescript
import { createHiveLogClient } from '@forgehive/hive-sdk'

const hiveLogger = createHiveLogClient('Personal Knowledge Management System')
```

## API Methods

### `sendLog(taskName: string, logItem: unknown): Promise<boolean>`

Sends a log entry to Hive for a specific task.

```typescript
const success = await hiveLogger.sendLog('user-authentication', {
  input: { username: 'john_doe', timestamp: Date.now() },
  output: { success: true, userId: 12345 },
  boundaries: {
    database: [
      {
        input: 'SELECT * FROM users WHERE username = ?',
        output: [{ id: 12345, username: 'john_doe' }],
        error: null
      }
    ]
  }
})

if (success) {
  console.log('Log sent successfully')
} else {
  console.error('Failed to send log')
}
```

**Parameters:**
- `taskName`: Name of the task being logged
- `logItem`: Object containing input, output, error, and boundaries data

**Returns:** `Promise<boolean>` - `true` if successful, `false` if failed

### `getLog(taskName: string, uuid: string): Promise<LogApiResult | null>`

Retrieves a specific log entry from Hive.

```typescript
const logData = await hiveLogger.getLog('user-authentication', 'log-uuid-123')

if (logData && !isApiError(logData)) {
  console.log('Log retrieved:', logData.logItem)
} else if (logData && isApiError(logData)) {
  console.error('API Error:', logData.error)
} else {
  console.error('Failed to retrieve log')
}
```

**Parameters:**
- `taskName`: Name of the task
- `uuid`: Unique identifier of the log entry

**Returns:** `Promise<LogApiResult | null>` - Log data, error object, or `null` if failed

### `setQuality(taskName: string, uuid: string, quality: Quality): Promise<boolean>`

Sets a quality assessment for a specific log entry.

```typescript
import { Quality } from '@forgehive/hive-sdk'

const quality: Quality = {
  score: 8.5,
  reason: 'Good performance with minor improvements needed',
  suggestions: 'Consider optimizing the database query for better performance'
}

const success = await hiveLogger.setQuality('user-authentication', 'log-uuid-123', quality)

if (success) {
  console.log('Quality assessment saved')
} else {
  console.error('Failed to save quality assessment')
}
```

**Parameters:**
- `taskName`: Name of the task
- `uuid`: Unique identifier of the log entry
- `quality`: Quality assessment object with score (number), reason (string), and suggestions (string)

**Returns:** `Promise<boolean>` - `true` if successful, `false` if failed

## Types

### `LogApiResponse`

```typescript
interface LogApiResponse {
  uuid: string
  taskName: string
  projectName: string
  logItem: {
    input: unknown
    output?: unknown
    error?: unknown
    boundaries?: Record<string, Array<{ input: unknown; output: unknown, error: unknown }>>
  }
  replayFrom?: string
  createdAt: string
}
```

### `Quality`

```typescript
interface Quality {
  score: number        // Quality score (typically 0-10)
  reason: string       // Explanation for the score
  suggestions: string  // Suggestions for improvement
}
```

### `ApiError`

```typescript
interface ApiError {
  error: string
}
```

## Type Guards

### `isApiError(response: unknown): response is ApiError`

Use this type guard to check if a response is an error:

```typescript
import { isApiError } from '@forgehive/hive-sdk'

const result = await hiveLogger.getLog('task-name', 'log-uuid')

if (result && isApiError(result)) {
  console.error('Error:', result.error)
} else if (result) {
  console.log('Success:', result.logItem)
}
```

## Debugging

The SDK uses the `debug` package for internal logging. To enable debug logs, set the `DEBUG` environment variable:

```bash
# Enable all hive-sdk debug logs
DEBUG=hive-sdk node your-app.js

# Enable all debug logs
DEBUG=* node your-app.js

# Enable hive-sdk logs along with other specific loggers
DEBUG=hive-sdk,express:* node your-app.js
```

When debugging is enabled, you'll see detailed logs like:

```
hive-sdk Creating HiveLogClient for project "Personal Knowledge Management System" +0ms
hive-sdk HiveLogClient initialized for project "Personal Knowledge Management System" with host "https://your-hive-instance.com" +2ms
hive-sdk Sending log for task "user-authentication" to https://your-hive-instance.com/api/tasks/log-ingest +100ms
hive-sdk Success: Sent log for task "user-authentication" +250ms
hive-sdk Error: Failed to send log for task "another-task": Network timeout +300ms
```

## Error Handling

The SDK handles errors gracefully:

- **Network errors**: Logged via debug, methods return `false` or `null`
- **Authentication errors**: Logged via debug, methods return `false` or `null`
- **API errors**: Returned as `ApiError` objects (for `getLog`) or logged via debug (for other methods)
- **Missing credentials**: Throws an error during client initialization

```typescript
try {
  const hiveLogger = createHiveLogClient('My Project')

  const success = await hiveLogger.sendLog('task-name', { data: 'example' })
  if (!success) {
    // Handle failed log sending
    console.error('Log sending failed')
  }
} catch (error) {
  // Handle initialization errors (missing credentials)
  console.error('Failed to initialize Hive client:', error.message)
}
```

## Examples

### Complete Example

```typescript
import { createHiveLogClient, isApiError, Quality } from '@forgehive/hive-sdk'

async function main() {
  // Initialize the client
  const hiveLogger = createHiveLogClient('Personal Knowledge Management System')

  // Send a log
  const logData = {
    input: { query: 'search for AI papers', userId: 123 },
    output: { results: ['paper1.pdf', 'paper2.pdf'], count: 2 },
    boundaries: {
      search_engine: [
        {
          input: 'AI papers filetype:pdf',
          output: { hits: 150, results: ['...'] },
          error: null
        }
      ]
    }
  }

  const sent = await hiveLogger.sendLog('document-search', logData)
  console.log('Log sent:', sent)

  // Retrieve a log
  const retrievedLog = await hiveLogger.getLog('document-search', 'some-uuid')
  if (retrievedLog && !isApiError(retrievedLog)) {
    console.log('Retrieved log:', retrievedLog.logItem)

    // Set quality assessment
    const quality: Quality = {
      score: 9.0,
      reason: 'Excellent search results with high relevance',
      suggestions: 'Consider adding result ranking by publication date'
    }

    const qualitySet = await hiveLogger.setQuality('document-search', retrievedLog.uuid, quality)
    console.log('Quality assessment saved:', qualitySet)
  }
}

main().catch(console.error)
```

## License

ISC