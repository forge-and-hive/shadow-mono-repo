// TASK: run
// Run this task with:
// shadow-cli task:run

import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import axios from 'axios'

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import { RecordTape } from '@forgehive/record-tape'

import { create as bundleCreate } from '../bundle/create'
import { load as bundleLoad } from '../bundle/load'
import { load as loadConf } from '../conf/load'
import { loadCurrent as loadCurrentProfile } from '../auth/loadCurrent'
import { type ForgeConf, type Profile } from '../types'

// For now, we'll use a simple schema without the record type
// TODO: Use Schema.record once it's properly built and available
const schema = new Schema({
  descriptorName: Schema.string(),
  args: Schema.mixedRecord()
  // args will be passed directly without schema validation for now
})

const boundaries = {
  loadConf: loadConf.asBoundary(),
  loadCurrentProfile: loadCurrentProfile.asBoundary(),
  bundleCreate: bundleCreate.asBoundary(),
  bundleLoad: bundleLoad.asBoundary(),
  verifyLogFolder: async (logsPath: string): Promise<boolean> => {
    // return true if the folder exists
    try {
      await fs.access(logsPath)
    } catch (error) {
      return false
    }

    return true
  },
  ensureBuildsFolder: async (): Promise<string> => {
    const buildsPath = path.join(os.homedir(), '.forge', 'builds')
    try {
      await fs.access(buildsPath)
    } catch {
      await fs.mkdir(buildsPath, { recursive: true })
    }

    return buildsPath
  },
  sendLogToAPI: async (profile: Profile, projectName: string, taskName: string, logItem: unknown): Promise<boolean> => {
    try {
      const logsUrl = `${profile.url}/api/tasks/log-ingest`
      const authToken = `${profile.apiKey}:${profile.apiSecret}`

      await axios.post(logsUrl, {
        projectName,
        taskName,
        logItem: JSON.stringify(logItem)
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('===============================================')
      console.log('Log sent to API... ', profile.name, profile.url)

      return true
    } catch (e) {
      const error = e as Error
      console.error('Failed to send log to API:', error.message)
      return false
    }
  }
}

export const run = createTask(
  schema,
  boundaries,
  async function ({ descriptorName, args }, {
    loadConf,
    bundleCreate,
    bundleLoad,
    verifyLogFolder,
    ensureBuildsFolder,
    loadCurrentProfile,
    sendLogToAPI
  }) {
    // Load forge configuration
    const forge: ForgeConf = await loadConf({})
    const taskDescriptor = forge.tasks[descriptorName as keyof typeof forge.tasks]
    const projectName = forge.project.name

    if (taskDescriptor === undefined) {
      throw new Error('Task is not defined on forge.json')
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
    const logsPath = path.join(logFolderPath, descriptorName)
    const entryPoint = path.join(process.cwd(), taskDescriptor.path)
    const buildsPath = await ensureBuildsFolder()
    const outputFile = path.join(buildsPath, `${descriptorName}.js`)

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

    // Setup record tape
    let tape = new RecordTape({
      path: logsPath
    })

    // load record tape
    try {
      await tape.load()

      // Need to figure out how to handle the log length
      // and other options for the RecordTape
      // For now, we'll just keep the implementation simple
      const maxLogLength = 9
      const log = tape.getLog()

      if (log.length > maxLogLength) {
        const newTape = new RecordTape({
          path: logsPath,
          log: log.slice(-maxLogLength)
        })

        tape = newTape
      }
    } catch (_error) {
      // if the tape is not found, create a new one on saving
    }

    // Run the task with provided arguments
    const [result, error, record] = await task.safeRun(args)
    const logItem = tape.push(descriptorName, record, {
      enviroment: 'cli'
    })
    await tape.save()

    if (profile) {
      try {
        await sendLogToAPI(profile, projectName, descriptorName, logItem)
      } catch (e) {
        console.error('Failed to send log to API:', e)
      }
    }

    if (error) {
      throw error
    }

    return result
  }
)
