// TASK: download
// Run this task with:
// forge task:run fixture:download --uuid [fixture-uuid]

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import axios from 'axios'
import path from 'path'
import fs from 'fs/promises'
import { loadCurrent as loadCurrentProfile } from '../auth/loadCurrent'
import { load as loadConf } from '../conf/load'
import { Profile } from '../types'

// Define the Fixture data structure
interface FixtureData {
  name: string;
  [key: string]: unknown;
}

interface FixtureResponse {
  fixture: FixtureData;
  [key: string]: unknown;
}

const description = 'Download a fixture by UUID to a path based on task descriptor returned from API'

const schema = new Schema({
  uuid: Schema.string()
})

const boundaries = {
  loadCurrentProfile: loadCurrentProfile.asBoundary(),
  loadConf: loadConf.asBoundary(),
  downloadFixture: async (uuid: string, profile: Profile): Promise<FixtureResponse> => {
    const downloadUrl = `${profile.url}/api/fixture/${uuid}`

    console.log(`Downloading fixture from ${downloadUrl}...`)

    const authToken = `${profile.apiKey}:${profile.apiSecret}`
    const response = await axios.get(downloadUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    return response.data
  },
  getCwd: async (): Promise<string> => {
    return process.cwd()
  },
  persistFixture: async (filePath: string, data: FixtureData): Promise<{ path: string }> => {
    const dirPath = path.dirname(filePath)

    await fs.mkdir(dirPath, { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')

    return {
      path: filePath
    }
  },
  checkFileExists: async (filePath: string): Promise<boolean> => {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
}

export const download = createTask(
  schema,
  boundaries,
  async function ({ uuid }, {
    downloadFixture,
    getCwd,
    persistFixture,
    checkFileExists,
    loadCurrentProfile,
    loadConf
  }) {
    console.log('==================================================')
    console.log(`Attempting to download fixture with uuid: ${uuid}`)

    const profile = await loadCurrentProfile({})
    const cwd = await getCwd()
    const forge = await loadConf({})

    // Download from hive api server first to get the task descriptor
    let response
    try {
      response = await downloadFixture(uuid, profile)
    } catch (e: unknown) {
      const error = e as { status?: number, message: string }
      console.error('Error downloading fixture:', error.message, error.status)

      if (error.status === 404) {
        throw new Error('Fixture not found')
      }

      throw new Error('Failed to download fixture')
    }

    // Extract task descriptor from the response
    const taskName = response.fixture.name

    // Determine the output path using forge fixtures path and task descriptor
    const fixturesBasePath = forge.paths.fixtures || 'fixtures'
    const fixtureDir = path.join(fixturesBasePath, taskName)
    const fixturePath = path.join(fixtureDir, `${uuid}.json`)
    const filePath = path.resolve(cwd, fixturePath)

    console.log(`Fixture will be saved to: ${filePath}`)

    // Check if file already exists
    const fileExists = await checkFileExists(filePath)
    if (fileExists) {
      console.log(`Fixture will be updated at ${filePath}`)
    }

    console.log(`
    ==================================================
    Starting fixture download!
    Fixture UUID: ${uuid}
    Task Name: ${taskName}
    Saving to: ${filePath}
    ==================================================
    Replay with: forge task:replay --path ${filePath}
    ==================================================
    `)

    // Persist fixture to file
    await persistFixture(filePath, response.fixture)

    return {
      status: 'Downloaded',
      path: filePath
    }
  }
)

download.setDescription(description)
