# @forgehive/runner

A task runner library for managing and executing tasks with proper type safety and error handling.

## Installation

```bash
npm install @forgehive/runner
```

## Overview

The `@forgehive/runner` package provides a way to manage and execute tasks with:

- Type-safe task execution
- Custom argument parsing
- Task description and schema inspection
- Error handling

## Basic Usage

Here's a simple example of using the runner:

```typescript
import { Runner } from '@forgehive/runner';
import { Task, Schema } from '@forgehive/task';

// Create a runner
const runner = new Runner();

// Create a task
const task = new Task(({ name }: { name: string }) => {
  return `Hello, ${name}!`;
});

// Load the task
runner.load('greet', task);

// Run the task
const result = await runner.run('greet', { name: 'John' });
console.log(result); // "Hello, John!"
```

## Custom Argument Parsing

You can provide custom argument parsing:

```typescript
interface CustomArgs {
  task: string;
  args: {
    name: string;
    age: number;
  };
}

const runner = new Runner<CustomArgs>((data) => ({
  taskName: data.task,
  args: data.args
}));

// Now the runner expects data in this format
await runner.run('greet', { name: 'John', age: 30 });
```

## Task Description

You can inspect task details:

```typescript
const runner = new Runner();
const task = new Task(({ name }: { name: string }) => {
  return `Hello, ${name}!`;
});
task.setDescription('A greeting task');

runner.load('greet', task);

// Get task details
const details = runner.describe();
console.log(details);
// {
//   greet: {
//     name: 'greet',
//     description: 'A greeting task',
//     schema: { ... }
//   }
// }
```

## API Reference

### `Runner` Class

- `constructor(parseArgumentsFn?)`: Creates a new runner with optional custom argument parsing
- `load(name: string, task: TaskInstanceType)`: Loads a task with the given name
- `run(name: string, args: unknown)`: Runs a task with the given arguments
- `getTask(name: string)`: Gets a task by name
- `getTasks()`: Gets all loaded tasks
- `getTaskList()`: Gets list of task names
- `describe()`: Returns details about all loaded tasks
- `setHandler(handlerFn)`: Sets a custom handler for task execution

### Types

- `RunnerParsedArguments`: Base interface for parsed arguments
- `TaskRecord`: Record type for task data

## License

MIT 