# Task Creation Command

This directory contains the implementation of the `task:create` command, which allows you to create new tasks in your project.

## Usage

```bash
# Create a task named "myTask"
shadow task:create myTask

# Create a task in a subdirectory
shadow task:create myDir:myTask
```

## How It Works

The command:

1. Parses the task descriptor name (e.g., "myTask" or "myDir:myTask")
2. Loads the shadow.json configuration
3. Generates the task file from an inline template
4. Creates the task file in the appropriate directory
5. Updates the shadow.json configuration with the new task

## Template

The task template is embedded directly in the code as a string constant (`TASK_TEMPLATE`). This approach eliminates the need for external template files and makes the code more reliable.

If you need to modify the template, edit the `TASK_TEMPLATE` constant in `createTask.ts`.

## Example Output

```typescript
// TASK: myTask
// Run this task with: shadow myTask

import { createTask } from '@shadow/task'
import { Schema } from '@shadow/schema'

// Remove this comment once you add the params options that the task allows
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TaskArgv {}

const schema = new Schema({
  // Add your schema definitions here
  // example: myParam: Schema.string()
})

const boundaries = {
  // Add your boundary functions here
  // example: readFile: async (path: string) => fs.readFile(path, 'utf-8')
}

export const myTask = createTask(
  schema,
  boundaries,
  async function (argv, boundaryFns) {
    // Your task implementation goes here
    const status = { status: 'Ok' }

    return status
  }
) 