# Forge CLI Task Guidelines

This document outlines the standard patterns and best practices for creating tasks in the Forge CLI.

## Task Structure

All tasks should follow this standard structure:

```typescript
// TASK: [task_name]
// Run this task with:
// forge task:run [namespace]:[task_name]

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
// Import any additional dependencies

// Define the schema for task arguments
const schema = new Schema({
  // Define parameters with appropriate Schema types
  paramName: Schema.string(), // or other Schema types
})

// Define boundaries (if needed)
const boundaries = {
  // Add boundary functions if needed
  // Otherwise, use an empty object
}

// Export the task
export const taskName = createTask(
  schema,
  boundaries,
  async function ({ /* destructured parameters */ }) {
    // Task implementation

    // Return appropriate result
    return result
  }
)
```

## Examples

### Bundle Creation Task

```typescript
import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import esbuild from 'esbuild'

const schema = new Schema({
  entryPoint: Schema.string(),
  outputFile: Schema.string()
})

const boundaries = {}

export const create = createTask(
  schema,
  boundaries,
  async function ({ entryPoint, outputFile }) {
    // Build using esbuild
    await esbuild.build({
      entryPoints: [entryPoint],
      outfile: outputFile,
      bundle: true,
      minify: true,
      platform: 'node',
      sourcemap: true
    })

    console.log(`Bundle created successfully: ${outputFile}`)

    return { outputFile }
  }
)
```

### Bundle Loading Task

```typescript
import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

const schema = new Schema({
  bundlePath: Schema.string()
})

const boundaries = {}

export const load = createTask(
  schema,
  boundaries,
  async function ({ bundlePath }) {
    // Dynamically import the bundle from the specified path
    const bundle = await import(bundlePath)

    console.log(`Bundle loaded successfully from: ${bundlePath}`)

    // Return the default export from the bundle
    return bundle.default
  }
)
```

## Best Practices

1. **Parameter Naming**: Use clear, descriptive names for parameters
2. **Schema Validation**: Always define a schema for task arguments
3. **Destructuring**: Use parameter destructuring in the task function
4. **Boundaries**: Use boundaries for external dependencies that might need mocking in tests
5. **Return Values**: Return meaningful values that can be used by other tasks
6. **Documentation**: Include comments explaining complex logic
7. **Error Handling**: Implement appropriate error handling for robust tasks

## Schema Types

Common schema types include:

- `Schema.string()` - For string parameters
- `Schema.number()` - For numeric parameters
- `Schema.boolean()` - For boolean flags
- `Schema.object()` - For complex objects
- `Schema.array()` - For arrays

## Running Tasks

Tasks can be run using the CLI:

```bash
forge task:run [namespace]:[task_name] --paramName=value
```

For example:

```bash
forge task:run bundle:create --entryPoint=src/index.ts --outputFile=dist/bundle.js
```