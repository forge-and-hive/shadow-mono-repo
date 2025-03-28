import { Runner, RunnerParsedArguments } from '@forgehive/runner'
import { ParsedArgs } from 'minimist'

import { init } from './tasks/init'
import { info } from './tasks/conf/info'

import { createTaskCommand } from './tasks/task/createTask'
import { run as taskRunCommand } from './tasks/task/run'
import { remove as taskRemoveCommand } from './tasks/task/remove'

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

// Config commands
runner.load('init', init)
runner.load('info', info)

// Task commands
runner.load('task:create', createTaskCommand)
runner.load('task:run', taskRunCommand)
runner.load('task:remove', taskRemoveCommand)

// Set handler
runner.setHandler(async (data: ParsedArgs): Promise<unknown> => {
  const parsedArgs = runner.parseArguments(data)
  const { taskName, action, args } = parsedArgs

  console.log('========================================')
  console.log('Running:', taskName, action, args)
  console.log('========================================')

  const task = runner.getTask(taskName)
  if (!task) {
    throw new Error(`Task "${taskName}" not found`)
  }

  try {
    let result

    const taskWithDescriptor = ['task:create', 'task:remove']
    if (taskWithDescriptor.includes(taskName)) {
      result = await task.run({ descriptorName: action })
    } else if (taskName === 'task:run') {
      result = await task.run({
        descriptorName: action,
        args
      })
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
