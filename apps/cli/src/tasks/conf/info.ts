// TASK: info
// Run this task with:
// forge task:run conf:info

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import * as fs from 'fs'
import * as path from 'path'

import { loadCurrent as loadCurrentProfile } from '../auth/loadCurrent'
import { load as loadConfig } from '../conf/load'

const schema = new Schema({})

const boundaries = {
  readFile: async (filePath: string): Promise<string> => fs.promises.readFile(filePath, 'utf-8'),
  loadConfig: loadConfig.asBoundary(),
  loadCurrentProfile: loadCurrentProfile.asBoundary()
}

export const info = createTask({
  schema,
  boundaries,
  fn: async function (_argv, { loadCurrentProfile, loadConfig, readFile }) {
    const packageJsonPath = path.join(__dirname, '../../../package.json')

    const packageJsonContent = await readFile(packageJsonPath)
    const packageJson = JSON.parse(packageJsonContent)

    const info = {
      version: packageJson.version,
      profile: {},
      paths: {}
    }

    const config = await loadConfig({})

    info.paths = {
      logs: config.paths.logs,
      fixtures: config.paths.fixtures,
      fingerprints: config.paths.fingerprints
    }

    let profile
    try {
      profile = await loadCurrentProfile({})

      info.profile = {
        name: profile.name,
        url: profile.url,
        apiKey: profile.apiKey
      }
    } catch (error) {
      console.log('No default profile set. Please run forge task:run auth:add to create a profile.')
    }

    return info
  }
})
