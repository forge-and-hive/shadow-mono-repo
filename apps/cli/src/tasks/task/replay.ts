// TASK: replay
// Run this task with:
// forge task:run task:replay

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import axios from 'axios'

import { create as bundleCreate } from '../bundle/create'
import { load as bundleLoad } from '../bundle/load'
import { load as loadConf } from '../conf/load'
import { loadCurrent as loadCurrentProfile } from '../auth/loadCurrent'
import { type ForgeConf, type Profile } from '../types'

// Define the fixture structure type
interface Fixture {
  fixtureUUID: string;
  name: string;
  type: 'success' | 'error';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  boundaries: Record<string, unknown>;
  context: Record<string, unknown>;
}

const description = 'Replay a task execution from a specified path'

const schema = new Schema({
  path: Schema.string()
})

const boundaries = {
  readFixture: async (filePath: string): Promise<Fixture> => {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const parsedData = JSON.parse(fileContent) as Fixture

    return parsedData
  },
  loadConf: loadConf.asBoundary(),
  loadCurrentProfile: loadCurrentProfile.asBoundary(),
  bundleCreate: bundleCreate.asBoundary(),
  bundleLoad: bundleLoad.asBoundary(),
  ensureBuildsFolder: async (): Promise<string> => {
    const buildsPath = path.join(os.homedir(), '.forge', 'builds')
    try {
      await fs.access(buildsPath)
    } catch {
      await fs.mkdir(buildsPath, { recursive: true })
    }

    return buildsPath
  },
  verifyLogFolder: async (logsPath: string): Promise<boolean> => {
    // return true if the folder exists
    try {
      await fs.access(logsPath)
    } catch (error) {
      return false
    }

    return true
  },
  sendLogToAPI: async (profile: Profile, projectName: string, taskName: string, logItem: unknown, fixtureUUID: string): Promise<boolean> => {
    try {
      const logsUrl = `${profile.url}/api/tasks/log-ingest`
      const authToken = `${profile.apiKey}:${profile.apiSecret}`

      await axios.post(logsUrl, {
        projectName,
        taskName,
        logItem: JSON.stringify(logItem),
        replayFrom: fixtureUUID
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('===============================================')
      console.log('Log sent to API... ', profile.name, profile.url)
      console.log('Replay from fixture UUID:', fixtureUUID)

      return true
    } catch (e) {
      const error = e as Error
      console.error('Failed to send log to API:', error.message)
      return false
    }
  }
}

export const replay = createTask(
  schema,
  boundaries,
  async function (argv, { readFixture, loadConf, loadCurrentProfile, bundleCreate, bundleLoad, ensureBuildsFolder, verifyLogFolder, sendLogToAPI }) {
    console.log('Input path:', argv.path)

    // Read the file from the provided path
    const fixture = await readFixture(argv.path)

    // Log fixture details
    console.log('==================================================')
    console.log('UUID:', fixture.fixtureUUID)
    console.log('Name:', fixture.name)
    console.log('Context:', fixture.context)
    console.log('==================================================')
    console.log('Replay:', fixture.input)
    console.log('==================================================')
    // Load forge configuration
    const forge: ForgeConf = await loadConf({})
    const taskName = fixture.name
    const taskDescriptor = forge.tasks[taskName as keyof typeof forge.tasks]
    const projectName = forge.project.name

    if (taskDescriptor === undefined) {
      throw new Error(`Task ${taskName} is not defined in forge.json`)
    }

    // Try to load profile, but continue if not found
    let profile = null
    try {
      profile = await loadCurrentProfile({})
    } catch (error) {
      // Profile not found or not configured, continue without it
      console.log('No profile found, logs will not be sent to remote API')
    }

    // Verify if log folder exists
    const logFolderPath = path.join(process.cwd(), forge.paths.logs)
    const logFolderExists = await verifyLogFolder(logFolderPath)
    if (!logFolderExists) {
      throw new Error(`Log folder "${logFolderPath}" does not exist`)
    }

    // Prepare paths
    const entryPoint = path.join(process.cwd(), taskDescriptor.path)
    const buildsPath = await ensureBuildsFolder()
    const outputFile = path.join(buildsPath, `${taskName}.js`)

    // Bundle the task
    await bundleCreate({
      entryPoint,
      outputFile
    })

    // Load the bundled task
    const bundle = await bundleLoad({
      bundlePath: outputFile
    })

    // Get the task handler
    const task = bundle[taskDescriptor.handler]

    if (!task) {
      throw new Error(`Handler "${taskDescriptor.handler}" not found in bundle`)
    }

    // Perform the replay
    const [result, error, record] = await task.safeReplay(
      {
        input: fixture.input,
        output: fixture.output,
        boundaries: fixture.boundaries,
      },
      {
        boundaries: {} // Default to using proxy mode for all boundaries
      }
    )

    // Send the log to API if profile is available
    if (profile) {
      try {
        await sendLogToAPI(profile, projectName, taskName, record, fixture.fixtureUUID)
      } catch (e) {
        console.error('Failed to send log to API:', e)
      }
    }

    if (error) {
      throw new Error(error.message)
    }

    return result
  }
)

replay.setDescription(description)
