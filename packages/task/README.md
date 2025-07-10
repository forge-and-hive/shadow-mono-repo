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

## Adding Metadata to Task Execution

Tasks automatically provide a `setMetadata` boundary that allows you to add custom metadata to execution records. This metadata is useful for tracking, debugging, and analytics.

### Basic Usage

```typescript
import { createTask, Schema } from '@forgehive/task';

const schema = new Schema({
  userId: Schema.string(),
  operation: Schema.string()
});

const boundaries = {
  processPayment: async (amount: number): Promise<string> => {
    // Payment processing logic
    return 'payment-id-123';
  }
};

const processUserAction = createTask({
  schema,
  boundaries,
  fn: async ({ userId, operation }, { processPayment, setMetadata }) => {
    // Add metadata at the beginning
    await setMetadata('userId', userId);
    await setMetadata('environment', 'production');

    if (operation === 'payment') {
      await setMetadata('step', 'processing-payment');
      const paymentId = await processPayment(100);

      await setMetadata('step', 'payment-completed');
      await setMetadata('paymentId', paymentId);

      return { success: true, paymentId };
    }

    await setMetadata('step', 'completed');
    return { success: true };
  }
});
```

### Metadata in Execution Records

When you run a task, the metadata appears in the execution record:

```typescript
const [result, error, record] = await processUserAction.safeRun({
  userId: 'user-123',
  operation: 'payment'
});

console.log(record.metadata);
// Output:
// {
//   userId: 'user-123',
//   environment: 'production',
//   step: 'payment-completed',
//   paymentId: 'payment-id-123'
// }
```

### Key Features

- **Dynamic Updates**: Metadata can be updated multiple times during execution
- **Error Preservation**: Metadata is preserved even if the task fails
- **Replay Support**: Metadata is properly handled during task replays
- **No Boundary Logs**: `setMetadata` calls don't appear in boundary execution logs
- **Type Safe**: Full TypeScript support with intellisense

### Practical Example: User Registration

```typescript
const registerUser = createTask({
  schema: new Schema({
    email: Schema.string(),
    plan: Schema.string()
  }),
  boundaries: {
    validateEmail: async (email: string) => true,
    createUser: async (userData: any) => ({ id: 'user-123' }),
    sendWelcomeEmail: async (email: string) => true
  },
  fn: async ({ email, plan }, { validateEmail, createUser, sendWelcomeEmail, setMetadata }) => {
    // Track the registration flow
    await setMetadata('registrationFlow', 'started');
    await setMetadata('plan', plan);
    await setMetadata('timestamp', Date.now().toString());

    // Validate email
    await setMetadata('step', 'validating-email');
    const isValidEmail = await validateEmail(email);

    if (!isValidEmail) {
      await setMetadata('step', 'validation-failed');
      throw new Error('Invalid email');
    }

    // Create user
    await setMetadata('step', 'creating-user');
    const user = await createUser({ email, plan });
    await setMetadata('userId', user.id);

    // Send welcome email
    await setMetadata('step', 'sending-welcome-email');
    await sendWelcomeEmail(email);

    await setMetadata('step', 'completed');
    await setMetadata('registrationFlow', 'success');

    return { userId: user.id, success: true };
  }
});
```

### Using Metadata for Analytics

Metadata is particularly useful for tracking task performance and user behavior:

```typescript
// Add listener to track analytics
registerUser.addListener((record) => {
  // Send metadata to analytics service
  analytics.track('task_executed', {
    taskName: record.taskName,
    success: record.type === 'success',
    metadata: record.metadata,
    duration: Date.now() - parseInt(record.metadata?.timestamp || '0')
  });
});
```

### Environment-Specific Metadata

Tasks automatically receive environment metadata when executed in different contexts:

- **CLI execution**: `environment: 'cli'`
- **Lambda execution**: `environment: 'hive-lambda'`
- **Custom contexts**: Pass metadata through `safeRun(args, context)`

You can combine this with your custom metadata:

```typescript
const [result, error, record] = await task.safeRun(
  { userId: 'user-123' },
  { executionContext: 'background-job', version: '1.2.3' }
);

// record.metadata will contain both your custom metadata and the context
```

## License

MIT