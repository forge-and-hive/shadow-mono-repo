# Listen Execution Records Specification

## Code example

```typescript
import { Task } from '@forgehive/task'
import { createHiveLogClient } from '@forgehive/hive-sdk'

const client = createHiveLogClient({
  projectName: 'Mono repo sample project,
  metadata: {
  environment: 'main',
  }
})

// Simple version - logs all tasks automatically
Task.listenExecutionRecords(client.getListener())

// Manual version - for filtering tasks or removing PII
Task.listenExecutionRecords(async (record) => {
  if (record.taskName !== 'secret task'){
      const log = await client.sendLog(record, {
        environment: 'main',
      })
  }
})
```

That way when a task is executed:

```typescript
import { getPrice } from '../tasks/stock/getPrice'

// Express route example
app.get('/', async (req, res) => {
  const [result, error] = await getPrice.safeRun({
    ticker: req.query.ticker
  })

  if (error) {
    return HTTPError(error)
  }

  return result
})
```

The execution record will automatically be sent to the global listener, which can then send it to the Hive logging service.

## Overview

This specification defines three key enhancements to the ForgeHive task framework:

1. **Enhanced sendLog API**: Accept ExecutionRecord directly, extracting taskName automatically
2. **New listenExecutionRecords feature**: Global listener functionality for monitoring all task executions
3. **New getListener method**: Simplified helper method for automatic logging

## SendLog API Enhancement

### Current API
```typescript
await client.sendLog(taskName: string, logItem: LogItemInput, metadata?: Metadata)
```

### Enhanced API (Breaking Change)
```typescript
// New simplified API: accept ExecutionRecord directly
await client.sendLog(record: ExecutionRecord, metadata?: Metadata)

// Legacy API removed for ExecutionRecord objects
// await client.sendLog(taskName: string, logItem: LogItemInput, metadata?: Metadata) // No longer supported for ExecutionRecord
```

### Implementation Changes

#### Type Definition Updates
```typescript
// Add ExecutionRecord import/type
import type { ExecutionRecord } from '@forgehive/task'

// New simplified method signature
class HiveLogClient {
  async sendLog(record: ExecutionRecord<any, any, any>, metadata?: Metadata): Promise<'success' | 'error' | 'silent'>
}
```

#### Implementation Strategy
```typescript
async sendLog(record: ExecutionRecord<any, any, any>, metadata?: Metadata): Promise<'success' | 'error' | 'silent'> {
  // Extract taskName from record
  const taskName = record.taskName || 'unknown-task'

  // Convert ExecutionRecord to LogItemInput format
  const logItem = {
    input: record.input,
    output: record.output,
    error: record.error,
    boundaries: record.boundaries,
    metadata: record.metadata
  }

  // Use existing internal implementation
  return this._sendLogInternal(taskName, logItem, metadata)
}
```

## GetListener Helper Method

### Simple Integration API
The `getListener` method provides a simplified way to automatically log all task executions without manual setup.

```typescript
class HiveLogClient {
  getListener(metadata?: Metadata): (record: ExecutionRecord<any, any, any>) => Promise<void>
}
```

### Implementation
```typescript
getListener(metadata?: Metadata): (record: ExecutionRecord<any, any, any>) => Promise<void> {
  return async (record: ExecutionRecord<any, any, any>) => {
    await this.sendLog(record, metadata)
  }
}
```

### Usage Examples
```typescript
// Automatic logging of all tasks
Task.listenExecutionRecords(client.getListener())

// With metadata
Task.listenExecutionRecords(client.getListener({
  environment: 'production',
  version: '1.0.0'
}))
```

### Manual vs Automatic Approach

#### When to use `getListener()` (Simple Version)
- **Auto-logging all tasks**: No filtering needed
- **Consistent metadata**: Same metadata for all executions
- **Quick setup**: Minimal configuration required

#### When to use Manual Implementation
- **Task filtering**: Need to exclude certain tasks (e.g., secret tasks, health checks)
- **PII removal**: Need to sanitize sensitive data from records
- **Conditional logging**: Different behavior based on task type or execution result
- **Custom metadata**: Dynamic metadata based on execution context

```typescript
// Manual version for filtering and PII removal
Task.listenExecutionRecords(async (record) => {
  // Filter out secret tasks
  if (record.taskName === 'secret-task') {
    return
  }

  // Remove PII from input/output
  const sanitizedRecord = {
    ...record,
    input: sanitizeInput(record.input),
    output: sanitizeOutput(record.output)
  }

  await client.sendLog(sanitizedRecord, {
    environment: process.env.NODE_ENV,
    userId: getCurrentUserId()
  })
})
```

## ListenExecutionRecords New Feature

### Current State
- No global listener functionality exists
- Only instance-level listeners via `task.addListener(fn)`
- No way to monitor all task executions globally

### New Feature Implementation

#### Global Listener API
```typescript
// New static method on Task class
Task.listenExecutionRecords((record) => {
  console.log('Task executed:', record.taskName)
})

// With async support
Task.listenExecutionRecords(async (record) => {
  await client.sendLog(record, { environment: 'production' })
})
```

#### Error Isolation
- Listener errors don't affect task execution
- Failed listeners are logged but don't throw
- Configurable timeout for async listeners (default: 5 seconds)

#### Implementation Details
```typescript
// New static property and method on Task class
class Task {
  private static globalListener?: (record: ExecutionRecord<any, any, any>) => void | Promise<void>

  static listenExecutionRecords(listener: (record: ExecutionRecord<any, any, any>) => void | Promise<void>): void {
    this.globalListener = listener
  }

  // New method to emit to global listener
  private static async emitExecutionRecord(record: ExecutionRecord<any, any, any>) {
    if (this.globalListener) {
      try {
        // Support both sync and async listeners
        const result = this.globalListener(record)
        if (result instanceof Promise) {
          // Add timeout for async listeners
          await Promise.race([
            result,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Listener timeout')), 5000)
            )
          ])
        }
      } catch (error) {
        // Log error but don't affect task execution
        console.error('ExecutionRecord listener error:', error)
      }
    }
  }

  // Called from safeRun, safeReplay, and run methods
  private emitBoth(record: ExecutionRecord<any, any, any>) {
    // Emit to instance listener (existing functionality)
    this.emit(record)

    // Emit to global listener (new functionality)
    Task.emitExecutionRecord(record)
  }
}
```

## Migration Guide

### Breaking Changes

#### SendLog API Breaking Change
**Note: This is an intentional breaking change that we accept for better developer experience.**

```typescript
// Before (will break)
client.sendLog(record.taskName, record)

// After (required change)
client.sendLog(record)
```

The new API requires updating all existing `sendLog` calls to use the simplified signature when working with ExecutionRecord objects.

### For New Code
```typescript
// New global listener setup (this is a completely new feature)
Task.listenExecutionRecords(async (record) => {
  await client.sendLog(record, { environment: 'production' })
})
```

### Benefits
1. **Simplified Integration**: No need to extract taskName manually
2. **Async Support**: Listeners can perform async operations safely
3. **Error Resilience**: Listener failures don't break task execution
4. **Backward Compatibility**: Existing code continues to work
5. **Type Safety**: Full TypeScript support for ExecutionRecord

## Implementation Plan

### Phase 1: SendLog Enhancement
1. Update sendLog method to accept ExecutionRecord directly (breaking change)
2. Remove backward compatibility for ExecutionRecord objects
3. Add getListener helper method
4. Update TypeScript definitions

### Phase 2: ListenExecutionRecords Feature
1. Add static globalListener property to Task class
2. Implement listenExecutionRecords static method
3. Add async support and error isolation
4. Update emission logic in safeRun, safeReplay, and run methods

### Phase 3: Testing & Documentation
1. Add integration tests for both automatic and manual approaches
2. Test error scenarios and timeout handling
3. Test PII filtering and task exclusion scenarios
4. Update documentation with usage examples