# ForgeHive Sample Project

A sample project demonstrating the use of `@forgehive/task` and `@forgehive/hive-sdk` packages.

## Overview

This project showcases how to use the ForgeHive framework's task execution and logging capabilities to build a type-safe application with automatic execution logging.

## Features

- Task execution using `@forgehive/task`
- Automatic execution logging using `@forgehive/hive-sdk`
- Global execution listeners with `Task.listenExecutionRecords()`
- **NEW**: Comprehensive metrics collection with `setMetrics` boundary
- **NEW**: Performance timing tracking for all task executions
- Type-safe operations with TypeScript
- PII filtering and task filtering examples

## Getting Started

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run the project
pnpm start
```

## Project Structure

- `src/tasks/` - Contains task definitions
- `src/scripts/` - Example scripts demonstrating different logging approaches
  - `listenExecutionRecords.ts` - Global listener setup
  - `manualFiltering.ts` - Manual logging with filtering and PII removal
  - `directLogging.ts` - Direct sendLog usage for one-off logging
  - **NEW**: `metricsDemo.ts` - Comprehensive metrics collection demonstration
  - **NEW**: `stockMetrics.ts` - Real-world stock metrics example
- `src/test/` - Test files

## New: Automatic Execution Logging

This project now demonstrates the new `listenExecutionRecords` functionality:

```typescript
import { Task } from '@forgehive/task'
import { createHiveLogClient } from '@forgehive/hive-sdk'

const client = createHiveLogClient({ projectName: 'My Project' })

// Simple: automatically log all task executions
Task.listenExecutionRecords(client.getListener())

// Advanced: manual filtering and PII removal
Task.listenExecutionRecords(async (record) => {
  if (record.taskName !== 'secret task') {
    await client.sendLog(record, { environment: 'prod' })
  }
})
```

## Examples

### Run with ts-node (Recommended for development)
```bash
# Global listener example
npx ts-node src/scripts/listenExecutionRecords.ts

# Manual filtering example
npx ts-node src/scripts/manualFiltering.ts

# Direct logging example
npx ts-node src/scripts/directLogging.ts
```

### Run Built Examples
```bash
# Build first
pnpm build

# Then run any example
node dist/scripts/listenExecutionRecords.js
node dist/scripts/manualFiltering.js
node dist/scripts/directLogging.js
```

### New: Metrics Collection Examples
```bash
# Comprehensive metrics demonstration
pnpm demo:metrics

# Stock price with business and performance metrics
pnpm demo:stock-metrics
```

## Metrics Collection

The sample project now demonstrates the new metrics collection functionality:

```typescript
import { createTask } from '@forgehive/task'

const task = createTask({
  name: 'userProcessor',
  boundaries: { /* your boundaries */ },
  fn: async (input, { setMetrics, /* other boundaries */ }) => {
    // Collect business metrics
    await setMetrics({
      type: 'business',
      name: 'users_processed',
      value: 1
    })

    // Collect performance metrics
    await setMetrics({
      type: 'performance', 
      name: 'api_response_time',
      value: 250
    })

    // Collect error tracking metrics
    await setMetrics({
      type: 'error',
      name: 'failed_requests',
      value: 0
    })

    return result
  }
})

// Execution records now include:
// - metrics: Metric[] - All collected metrics
// - timing: TimingInfo - Main function execution timing
// - boundaries with timing for each boundary call
```

For more examples, see the scripts in `src/scripts/`. 