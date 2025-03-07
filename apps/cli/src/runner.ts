import { Runner, RunnerParsedArguments } from '@shadow/runner'
import { ParsedArgs } from 'minimist'

import { init } from './tasks/init'
import { createTaskCommand } from './tasks/task/createTask'

interface CliParsedArguments extends RunnerParsedArguments {
  action: string;
}

const runner = new Runner((data: ParsedArgs): CliParsedArguments => {
  const { _, ...filteredObj } = data

  return {
    taskName: String(_[0]),
    action: String(_[1]),
    args: filteredObj
  }
})

// Load tasks
runner.load('init', init)
runner.load('task:create', createTaskCommand)

// Set handler
runner.setHandler(async (data: ParsedArgs): Promise<unknown> => {
  const parsedArgs = runner.parseArguments(data)
  const { taskName, action, args } = parsedArgs
  console.log(taskName, action, args)

  const task = runner.getTask(taskName)
  if (!task) {
    throw new Error(`Task "${taskName}" not found`)
  }

  try {
    let result

    if (taskName === 'task:create') {
      result = await task.run({ descriptorName: action })
    } else {
      result = await task.run(args)
    }

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
})

export default runner
