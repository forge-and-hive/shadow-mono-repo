# @forgehive/record-tape

A lightweight TypeScript library for recording and persisting task execution logs with boundary data support. Works generically with any task type without requiring compile-time type knowledge.

## Features

- 🎯 **Simple API**: Clean, minimal interface for recording execution data
- 📝 **Automatic Logging**: Seamless integration with task execution
- 💾 **Persistence**: Save and load execution logs to/from files
- 🔄 **Serialization**: Built-in JSON serialization support
- 🎨 **TypeScript**: Full type safety with generics
- 🚀 **Boundary Support**: Record external API calls and dependencies
- 🔧 **Generic Design**: Works with any task type without compile-time type requirements

## Installation

```bash
pnpm add @forgehive/record-tape
```

## Quick Start

```typescript
import { RecordTape } from '@forgehive/record-tape'
import { createTask, Schema } from '@forgehive/task'

// Create a new recording tape
const tape = new RecordTape({ path: 'logs/execution' })

// Create a simple task
const getUserTask = createTask({
  name: 'getUserById',
  schema: Schema.object({
    userId: Schema.number()
  }),
  boundaries: {},
  fn: async function getUserById({ userId }) {
    // Simulate getting user data
    return { name: 'John Doe', email: 'john@example.com' }
  }
})

// Execute the task - safeRun returns result, error, and execution record
const [result, error, executionRecord] = await getUserTask.safeRun({ userId: 123 })

// Manually record the execution to the tape
tape.push(executionRecord)

// Save recorded data to file
await tape.save()

// Optional: View what was recorded
console.log('Recorded logs:', tape.getLog())
```

## API Reference

### Constructor

```typescript
new RecordTape<TInput, TOutput, B>(config?: Config)
```

**Parameters:**
- `config.path?` - File path for persistence (will append `.log` extension)
- `config.log?` - Pre-existing log records to initialize with
- `config.boundaries?` - Initial boundary data

### Core Methods

#### `getLog()`
Get all recorded execution logs.

```typescript
const logs = tape.getLog()
// Returns: GenericExecutionRecord<TInput, TOutput, B>[]
```

#### `getLength()`
Get the number of records in the tape.

```typescript
const count = tape.getLength()
// Returns: number
```

#### `shift()`
Remove and return the first record from the tape.

```typescript
const firstRecord = tape.shift()
// Returns: GenericExecutionRecord<TInput, TOutput, B> | undefined
```

#### `push(record, metadata?)`
Add a new execution record to the tape.

```typescript
const logRecord = tape.push(executionRecord, { userId: '123' })
```

**Parameters:**
- `record` - ExecutionRecord with input, output, taskName, boundaries, etc.
- `metadata?` - Optional additional metadata to attach

**Returns:** The created GenericExecutionRecord

#### `recordFrom(task)`
Set up automatic recording from a task instance.

```typescript
tape.recordFrom(myTask)
// Now myTask will automatically send execution records to this tape
```

### Serialization Methods

#### `stringify()`
Convert all logs to a string format (one JSON object per line).

```typescript
const logString = tape.stringify()
```

#### `parse(content)`
Parse string content back into log records.

```typescript
const logs = tape.parse(logString)
// Returns: GenericExecutionRecord<TInput, TOutput, B>[]
```

### Persistence Methods

#### `load()` / `loadSync()`
Load execution logs from file.

```typescript
// Async version
const logs = await tape.load()
// Returns: GenericExecutionRecord<TInput, TOutput, B>[]

// Sync version
const logs = tape.loadSync()
// Returns: GenericExecutionRecord<TInput, TOutput, B>[]
```

#### `save()` / `saveSync()`
Save execution logs to file.

```typescript
// Async version
await tape.save()

// Sync version
tape.saveSync()
```

### Utility Methods

#### `compileCache()`
Compile boundary data from all logs into a cache structure.

```typescript
const boundaryCache = tape.compileCache()
// Returns: Record<string, unknown>
```

## Types

### GenericExecutionRecord
A generic version of ExecutionRecord that can store execution data from any task without knowing the specific types at compile time:

```typescript
interface GenericExecutionRecord<TInput = unknown, TOutput = unknown, B extends Boundaries = Boundaries> extends ExecutionRecord<TInput, TOutput, B> {
}
```

The "Generic" prefix indicates that RecordTape can store logs from different tasks with varying input/output types. The default type parameters (`unknown`) allow the tape to work with any task execution without requiring specific type knowledge.

**Why Generic?**
- **Mixed Task Logs**: Store logs from multiple different tasks in the same tape
- **Runtime Flexibility**: Add logs without knowing task types at compile time
- **Type Safety**: Still maintains TypeScript type safety when types are known

### ExecutionRecord
Core execution data structure:

```typescript
interface ExecutionRecord<TInput, TOutput, B extends Boundaries> {
  input: TInput
  output?: TOutput | null
  error?: string
  boundaries: BoundaryLogsFor<B>
  taskName?: string
  metadata?: Record<string, string>
  type: 'success' | 'error' | 'pending'
}
```

## Usage Examples

### Basic Recording

```typescript
import { RecordTape } from '@forgehive/record-tape'

const tape = new RecordTape({ path: 'logs/user-service' })

// Record a successful execution
tape.push({
  input: { userId: 123 },
  output: { name: 'John Doe', email: 'john@example.com' },
  taskName: 'getUser',
  boundaries: {},
  type: 'success'
})

// Record an error
tape.push({
  input: { userId: 999 },
  error: 'User not found',
  taskName: 'getUser',
  boundaries: {},
  type: 'error'
})

await tape.save()
```

### Queue-like Processing

```typescript
import { RecordTape } from '@forgehive/record-tape'

const tape = new RecordTape({ path: 'logs/processing-queue' })

// Add several records
tape.push({
  input: { task: 'process-order-1' },
  output: { status: 'completed' },
  taskName: 'processOrder',
  boundaries: {},
  type: 'success'
})

tape.push({
  input: { task: 'process-order-2' },
  output: { status: 'completed' },
  taskName: 'processOrder',
  boundaries: {},
  type: 'success'
})

// Check how many records we have
console.log(`Total records: ${tape.getLength()}`) // 2

// Process records in FIFO order
while (tape.getLength() > 0) {
  const record = tape.shift()
  console.log(`Processing: ${record?.input.task}`)
}

console.log(`Remaining records: ${tape.getLength()}`) // 0
```

### With Boundary Data

```typescript
const tape = new RecordTape({ path: 'logs/api-calls' })

tape.push({
  input: { query: 'nodejs' },
  output: { results: ['result1', 'result2'] },
  taskName: 'searchRepositories',
  boundaries: {
    githubAPI: [
      {
        input: ['/search/repositories?q=nodejs'],
        output: { data: ['repo1', 'repo2'] },
        error: null
      }
    ]
  },
  type: 'success'
})
```

### Task Integration

```typescript
import { Task } from '@forgehive/task'
import { RecordTape } from '@forgehive/record-tape'

const tape = new RecordTape({ path: 'logs/my-task' })
const myTask = new Task(myFunction, { name: 'processData' })

// Set up automatic recording
tape.recordFrom(myTask)

// Now all task executions will be recorded
await myTask.safeRun({ data: 'test' })

// Save recorded data
await tape.save()
```

### Loading and Analyzing Logs

```typescript
const tape = new RecordTape({ path: 'logs/analysis' })

// Load existing logs
const logs = await tape.load()

// Analyze execution patterns
const successCount = logs.filter(log => log.type === 'success').length
const errorCount = logs.filter(log => log.type === 'error').length

console.log(`Success rate: ${(successCount / logs.length * 100).toFixed(1)}%`)

// Compile boundary cache for replay
const boundaryCache = tape.compileCache()
```

### File Format

The tape saves logs in a simple text format with one JSON object per line:

```
{"input":{"userId":123},"output":{"name":"John"},"type":"success","boundaries":{},"metadata":{},"taskName":"getUser"}
{"input":{"userId":999},"error":"User not found","type":"error","boundaries":{},"metadata":{},"taskName":"getUser"}
```

## Advanced Usage

### Custom Metadata

```typescript
tape.push(executionRecord, {
  requestId: 'req-123',
  userAgent: 'MyApp/1.0',
  timestamp: new Date().toISOString()
})
```

### Boundary Cache Compilation

```typescript
// After recording multiple executions with boundary data
const cache = tape.compileCache()

// Use cache for task replay
const replayTask = new Task(myFunction, {
  boundariesData: cache
})
```

## License

MIT License - see LICENSE file for details.