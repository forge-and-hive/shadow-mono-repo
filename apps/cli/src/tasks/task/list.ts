// TASK: list
// Run this task with:
// forge task:run task:list

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

import { load as loadConf } from '../conf/load'
import { type ForgeConf } from '../types'

const description = 'List all available tasks in the current project'

const schema = new Schema({
  // No arguments needed
})

const boundaries = {
  loadConf: loadConf.asBoundary()
}

export const list = createTask(
  schema,
  boundaries,
  async function (argv, { loadConf }) {
    // Load forge configuration
    const forge: ForgeConf = await loadConf({})

    console.log('Available tasks:')
    console.log('===============================================')

    const tasks = forge.tasks
    const taskNames = Object.keys(tasks).sort()

    if (taskNames.length === 0) {
      console.log('No tasks found in forge.json')
      return { taskCount: 0, tasks: [] }
    }

    // Find the longest task name for alignment
    const maxNameLength = Math.max(...taskNames.map(name => name.length))

    taskNames.forEach((taskName) => {
      const task = tasks[taskName]
      const paddedName = taskName.padEnd(maxNameLength + 1)
      console.log(`• ${paddedName} - ${task.path}`)
    })

    return {
      taskCount: taskNames.length
    }
  }
)

list.setDescription(description)
