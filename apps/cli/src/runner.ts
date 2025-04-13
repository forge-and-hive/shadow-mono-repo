import { Runner, RunnerParsedArguments } from '@forgehive/runner'
import { ParsedArgs } from 'minimist'

import { init } from './tasks/init'
import { info } from './tasks/conf/info'

import { createTaskCommand } from './tasks/task/createTask'
import { run as taskRunCommand } from './tasks/task/run'
import { remove as taskRemoveCommand } from './tasks/task/remove'

import { create as createRunner } from './tasks/runner/create'
import { remove as removeRunner } from './tasks/runner/remove'
import { bundle as bundleRunner } from './tasks/runner/bundle'
import { publish as publishTask } from './tasks/task/publish'
import { download as downloadTask } from './tasks/task/download'

import { add as addProfile } from './tasks/auth/add'

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
runner.load('task:publish', publishTask)
runner.load('task:download', downloadTask)

// Runner commands
runner.load('runner:create', createRunner)
runner.load('runner:remove', removeRunner)
runner.load('runner:bundle', bundleRunner)

// Auth commands
runner.load('auth:add', addProfile)

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

    const commandsWithDescriptor = ['task:create', 'task:remove', 'task:publish']
    const commandsWithRunner = ['runner:create', 'runner:remove']

    if (commandsWithDescriptor.includes(taskName)) {
      console.log('Running:', taskName, action)
      result = await task.run({ descriptorName: action })
    } else if (commandsWithRunner.includes(taskName)) {
      result = await task.run({
        runnerName: action
      })
    } else if (taskName === 'runner:bundle') {
      const paths = args as { targetPath: string }

      result = await task.run({
        runnerName: action,
        targetPath: paths.targetPath
      })
    } else if (taskName === 'task:download') {
      const { uuid } = args as { uuid: string }

      result = await task.run({
        descriptorName: action,
        uuid
      })
    } else if (taskName === 'task:run') {
      result = await task.run({
        descriptorName: action,
        args
      })
    } else if (taskName === 'auth:add') {
      const { apiKey, apiSecret, url } = args as { name: string, apiKey: string, apiSecret: string, url: string }

      result = await task.run({
        name: action,
        apiKey,
        apiSecret,
        url
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
