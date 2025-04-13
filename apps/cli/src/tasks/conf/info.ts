// TASK: info
// Run this task with:
// forge task:run conf:info

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import * as fs from 'fs'
import * as path from 'path'

import { loadCurrent as loadCurrentProfile } from '../auth/loadCurrent'

const schema = new Schema({})

const boundaries = {
  readFile: async (filePath: string): Promise<string> => fs.promises.readFile(filePath, 'utf-8'),
  loadCurrentProfile: loadCurrentProfile.asBoundary()
}

export const info = createTask(
  schema,
  boundaries,
  async function (_argv, { loadCurrentProfile, readFile }) {
    const packageJsonPath = path.join(__dirname, '../../../package.json')


    const packageJsonContent = await readFile(packageJsonPath)
    const packageJson = JSON.parse(packageJsonContent)

    const profile = await loadCurrentProfile({})

    return {
      version: packageJson.version,
      profile: {
        name: profile.name,
        url: profile.url,
        apiKey: profile.apiKey
      }
    }
  }
)
