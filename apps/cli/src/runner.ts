import { Runner, RunnerParsedArguments } from '@shadow/runner'
import { ParsedArgs } from 'minimist'

import { init } from './tasks/init'
import { createTaskCommand } from './tasks/task/createTask'

interface RunnerOutput {
  outcome: 'Success' | 'Failure'
  taskName: string
  result: unknown
}

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

runner.setHandler(async (data: ParsedArgs): Promise<RunnerOutput> => {
  const { taskName, action, args } = runner.parseArguments(data)
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

runner.load('init', init)
runner.load('task:create', createTaskCommand)

export default runner
