// TASK: remove
// Run this task with:
// forge task:run task:remove

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

import path from 'path'
import fs from 'fs/promises'
import { load } from '../conf/load'
import { type ShadowConf } from '../types'

const schema = new Schema({
  descriptorName: Schema.string()
})

const boundaries = {
  loadConf: load.asBoundary(),
  persistConf: async (shadow: ShadowConf): Promise<void> => {
    const shadowPath = path.join(process.cwd(), 'shadow.json')
    await fs.writeFile(shadowPath, JSON.stringify(shadow, null, 2))
  },
  deleteFile: async (filePath: string): Promise<void> => {
    await fs.unlink(filePath)
  }
}

export const remove = createTask(
  schema,
  boundaries,
  async function ({ descriptorName }, { loadConf, persistConf, deleteFile }) {
    // Load shadow configuration
    const shadow: ShadowConf = await loadConf({})

    // Check if the task exists in shadow.json
    if (!shadow.tasks[descriptorName]) {
      throw new Error(`Task '${descriptorName}' not found in shadow.json`)
    }

    // Get the task file path
    const taskFilePath = path.join(process.cwd(), shadow.tasks[descriptorName].path)

    console.log(`
    ==================================================
    Removing task: ${descriptorName}
    File path: ${taskFilePath}
    ==================================================
    `)

    // Delete the task file
    await deleteFile(taskFilePath)

    // Remove the task from shadow.json
    delete shadow.tasks[descriptorName]

    // Save the updated shadow.json
    await persistConf(shadow)

    return {
      status: 'Ok',
      message: `Task '${descriptorName}' has been successfully removed`
    }
  }
)
