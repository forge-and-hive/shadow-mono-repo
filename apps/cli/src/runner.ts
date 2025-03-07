import { Runner } from '@shadow/runner'
import { ParsedArgs } from 'minimist'

import { init } from './tasks/init'
import { createTaskCommand } from './tasks/task/createTask'

interface RunnerOutput {
  outcome: 'Success' | 'Failure'
  taskName: string
  result: unknown
}


const runner = new Runner<ParsedArgs, RunnerOutput>()

runner.load('init', init)
runner.load('task:create', createTaskCommand)

runner.parseArguments = function (data): { taskName: string, args: unknown } {
  const { _, ...filteredObj } = data

  return {
    taskName: String(_[0]),
    args: filteredObj
  }
}

runner.handler = async function(data: ParsedArgs): Promise<RunnerOutput> {
  const { taskName, args } = runner.parseArguments(data)

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
