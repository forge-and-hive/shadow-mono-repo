# @forgehive/task

A powerful task management library for creating type-safe, boundary-separated tasks with validation.

## Installation

```bash
npm install @forgehive/task
```

## Overview

The `@forgehive/task` package provides a way to create strongly-typed tasks with:

- Input validation using schemas
- Boundary separation for better testability
- Execution modes (proxy, replay, etc.)
- Listener support for tracking task execution

## Basic Usage

Here's a simple example of creating a task:

```typescript
import { createTask, Schema } from '@forgehive/task';

// Define a schema for task input validation
const schema = new Schema({
  name: Schema.string(),
  age: Schema.number().optional()
});

// Define boundaries (external dependencies)
const boundaries = {
  saveToDatabase: async (data: any): Promise<void> => {
    // Implementation...
  },
  sendEmail: async (to: string, subject: string): Promise<boolean> => {
    // Implementation...
  }
};

// Create the task with type inference
const registerUser = createTask(
  schema,
  boundaries,
  async (argv, boundaries) => {
    // argv is typed based on the schema (has name: string, age?: number)
    console.log(`Registering user: ${argv.name}`);
    
    // Call boundaries with type safety
    await boundaries.saveToDatabase({ name: argv.name, age: argv.age });
    const emailSent = await boundaries.sendEmail(
      'admin@example.com',
      `New user registered: ${argv.name}`
    );
    
    return {
      success: true,
      emailSent,
      user: { name: argv.name, age: argv.age }
    };
  }
);

// Execute the task
const result = await registerUser.run({ name: 'John Doe', age: 30 });
```

## Type Safety

The `createTask` function provides full type inference:

- Input arguments are typed based on the schema
- Boundaries are typed based on the provided boundaries object
- Return type is inferred from the task function

## Advanced Usage

### Adding Listeners

You can add listeners to track task execution:

```typescript
registerUser.addListener((record) => {
  console.log('Task executed:', record);
  // record contains:
  // - input: The input arguments
  // - output: The task result (if successful)
  // - error: Error message (if failed)
  // - boundaries: Boundary execution data
});
```

### Execution Modes

Tasks support different execution modes:

- `proxy`: Normal execution (default)
- `proxy-pass`: Use recorded data if available, otherwise execute normally
- `proxy-catch`: Use recorded data if execution fails
- `replay`: Only use recorded data, fail if not available

```typescript
// Change execution mode
registerUser.setMode('replay');
```

### Boundary Data

You can provide pre-recorded boundary data:

```typescript
registerUser.setBoundariesData({
  saveToDatabase: [
    { input: [{ name: 'John', age: 30 }], output: undefined }
  ],
  sendEmail: [
    { input: ['admin@example.com', 'New user registered: John'], output: true }
  ]
});
```

## Real-World Example: CLI Task

Here's an example of a task used in a CLI application:

```typescript
import { createTask } from '@forgehive/task';
import { Schema } from '@forgehive/schema';
import path from 'path';
import fs from 'fs/promises';

// Define the schema with optional dryRun flag
const schema = new Schema({
  dryRun: Schema.boolean().optional()
});

// Define boundaries for file operations
const boundaries = {
  saveFile: async (path: string, content: string): Promise<void> => {
    await fs.writeFile(path, content);
  }
};

// Create the init task
export const init = createTask(
  schema,
  boundaries,
  async (argv, boundaries) => {
    // Handle the dryRun flag
    const isDryRun = Boolean(argv.dryRun);

    const shadowPath = path.join(process.cwd(), 'shadow.json');
    const config = {
      project: { name: 'MyProject' },
      // ... other config properties
    };

    const content = JSON.stringify(config, null, 2);

    // Conditionally create the file based on dryRun
    if (!isDryRun) {
      await boundaries.saveFile(shadowPath, content);
      console.log(`Created shadow.json at ${shadowPath}`);
    } else {
      console.log('Dry run, not creating shadow.json');
      console.log(content);
    }

    return config;
  }
);
```

## Testing Tasks

The boundary separation makes tasks easy to test:

```typescript
import { init } from './tasks/init';

describe('Init task', () => {
  it('should create a config file when dryRun is false', async () => {
    // Mock the saveFile boundary
    const saveFileMock = jest.fn();
    
    // Override the boundaries
    init.getBoundaries().saveFile = saveFileMock;
    
    // Run the task
    await init.run({ dryRun: false });
    
    // Verify the boundary was called
    expect(saveFileMock).toHaveBeenCalled();
  });
  
  it('should not create a file when dryRun is true', async () => {
    // Mock the saveFile boundary
    const saveFileMock = jest.fn();
    
    // Override the boundaries
    init.getBoundaries().saveFile = saveFileMock;
    
    // Run the task
    await init.run({ dryRun: true });
    
    // Verify the boundary was not called
    expect(saveFileMock).not.toHaveBeenCalled();
  });
});
```

## API Reference

### `createTask<S, B, R>(schema, boundaries, fn, config?)`

Creates a new task with type inference.

- `schema`: A Schema instance for input validation
- `boundaries`: An object containing boundary functions
- `fn`: The task function that receives validated input and boundaries
- `config`: Optional configuration (mode, boundariesData)

Returns a `TaskInstanceType` with methods for running and managing the task.

### `TaskInstanceType` Methods

- `run(argv?)`: Executes the task with the given arguments
- `addListener(fn)`: Adds a listener for task execution
- `removeListener()`: Removes the current listener
- `getMode()` / `setMode(mode)`: Get/set the execution mode
- `getBoundaries()`: Get the wrapped boundary functions
- `setBoundariesData(data)`: Set pre-recorded boundary data
- `validate(argv?)`: Validate input without running the task
- `isValid(argv?)`: Check if input is valid
- `asBoundary()`: Convert the task to a boundary function

## License

MIT 