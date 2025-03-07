import { Runner } from '@shadow/runner'
import { ParsedArgs } from 'minimist'

import { init } from './tasks/init'
import { createTaskCommand } from './tasks/task/createTask'

interface RunnerOutput {
  outcome: 'Success' | 'Failure'
  taskName: string
  result: unknown
}

// Define our custom parse result interface
interface ParseArgumentsResult {
  taskName: string;
  action: string;
  args: unknown;
}

// Create runner with the custom parse function
const runner = new Runner<ParsedArgs, RunnerOutput>((data: ParsedArgs): ParseArgumentsResult => {
  const { _, ...filteredObj } = data

  return {
    taskName: String(_[0]),
    action: String(_[1]),
    args: filteredObj
  }
})

runner.load('init', init)
runner.load('task:create', createTaskCommand)

// Override the handler to use our custom parse result
runner.handler = async function(data: ParsedArgs): Promise<RunnerOutput> {
  // Cast to our custom type to access the action property
  const parsedArgs = runner.parseArguments(data) as ParseArgumentsResult
  const { taskName, action, args } = parsedArgs
  console.log(taskName, action, args)

  const task = runner.getTask(taskName)
  if (!task) {
    throw new Error(`Task "${taskName}" not found`)
  }

  try {
    const result = await task.run(args)

    return {
      outcome: 'Success',
      taskName,
      result
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))

    return {
      outcome: 'Failure',
      taskName,
      result: {
        error: err.message,
        stack: err.stack
      }
    }
  }
}

export default runner
