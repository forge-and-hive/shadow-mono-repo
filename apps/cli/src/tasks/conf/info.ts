// TASK: info
// Run this task with:
// forge task:run conf:info

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import * as fs from 'fs'
import * as path from 'path'

const schema = new Schema({
  // No parameters needed for this task
})

const boundaries = {
  readFile: async (filePath: string): Promise<string> => fs.promises.readFile(filePath, 'utf-8')
}

export const info = createTask(
  schema,
  boundaries,
  async function (_argv, boundaries) {
    const packageJsonPath = path.join(__dirname, '../../../package.json')
    console.log('packageJsonPath', packageJsonPath)

    const packageJsonContent = await boundaries.readFile(packageJsonPath)
    const packageJson = JSON.parse(packageJsonContent)

    return {
      version: packageJson.version
    }
  }
)
