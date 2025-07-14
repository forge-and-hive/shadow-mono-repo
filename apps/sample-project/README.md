# ForgeHive Sample Project

A sample project demonstrating the use of `@forgehive/task` and `@forgehive/hive-sdk` packages.

## Overview

This project showcases how to use the ForgeHive framework's task execution and logging capabilities to build a type-safe application with automatic execution logging.

## Features

- Task execution using `@forgehive/task`
- Automatic execution logging using `@forgehive/hive-sdk`
- Global execution listeners with `Task.listenExecutionRecords()`
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
  - `basicExample.ts` - Simple usage from the specification
  - `sendLogs.ts` - Comprehensive examples with filtering and PII removal
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

### Run Basic Example
```bash
pnpm build && node dist/scripts/basicExample.js
```

### Run Comprehensive Examples
```bash
pnpm build && node dist/scripts/sendLogs.js
```

For more examples, see the scripts in `src/scripts/`. 