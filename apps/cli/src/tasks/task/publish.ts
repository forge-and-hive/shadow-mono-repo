// TASK: publish
// Run this task with:
// forge task:run task:publish --descriptorMame task-name

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import axios from 'axios'

import path from 'path'
import fs from 'fs/promises'
import os from 'os'

import { load as loadConf } from '../conf/load'
import { create as bundleCreate } from '../bundle/create'
import { load as bundleLoad } from '../bundle/load'
import { loadCurrent as loadCurrentProfile } from '../auth/loadCurrent'
import { Profile } from '../types'

const schema = new Schema({
  descriptorName: Schema.string()
})

const boundaries = {
  getCwd: async (): Promise<string> => {
    return process.cwd()
  },
  loadConf: loadConf.asBoundary(),
  loadCurrentProfile: loadCurrentProfile.asBoundary(),
  bundleCreate: bundleCreate.asBoundary(),
  bundleLoad: bundleLoad.asBoundary(),
  readFileUtf8: async (filePath: string): Promise<string> => {
    return fs.readFile(filePath, 'utf-8')
  },
  readFileBinary: async (filePath: string): Promise<Buffer> => {
    return fs.readFile(filePath)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publishTask: async (data: any, profile: Profile): Promise<any> => {
    const publishUrl = `${profile.url}/api/tasks/publish`

    console.log(`Publishing task to ${publishUrl}...`)
    const authToken = `${profile.apiKey}:${profile.apiSecret}`
    const response = await axios.post(publishUrl, data, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    return response.data
  },

  ensureBuildsFolder: async (): Promise<string> => {
    const buildsPath = path.join(os.homedir(), '.forge', 'builds')
    try {
      await fs.access(buildsPath)
    } catch {
      await fs.mkdir(buildsPath, { recursive: true })
    }

    return buildsPath
  }
}

export const publish = createTask(
  schema,
  boundaries,
  async function ({ descriptorName }, {
    getCwd,
    ensureBuildsFolder,
    loadConf,
    bundleCreate,
    bundleLoad,
    readFileUtf8,
    readFileBinary,
    publishTask,
    loadCurrentProfile
  }) {
    const cwd = await getCwd()
    const forgeJson = await loadConf({})
    const profile = await loadCurrentProfile({})

    const taskDescriptor = forgeJson.tasks[descriptorName as keyof typeof forgeJson.tasks]
    const projectName = forgeJson.project.name

    if (taskDescriptor === undefined) {
      throw new Error('Task is not defined on forge.json')
    }

    const entryPoint = path.join(cwd, taskDescriptor.path)
    const buildsPath = await ensureBuildsFolder()
    const outputFile = path.join(buildsPath, `${descriptorName}.js`)

    console.log('entryPoint:', entryPoint)
    console.log('buildsPath:', buildsPath)
    console.log('outputFile:', outputFile)

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
    const description = task.getDescription() ?? ''
    const schema = task.getSchema() || new Schema({})
    const schemaDescriptor = schema.describe()

    // Read the task file content and bundle
    const sourceCode = await readFileUtf8(entryPoint)
    const bundleContent = await readFileBinary(outputFile)

    const data = {
      ...taskDescriptor,
      taskName: descriptorName,
      projectName,
      description,
      schemaDescriptor: JSON.stringify(schemaDescriptor),
      sourceCode,
      bundle: bundleContent.toString('base64')
    }

    // Publish to hive api server
    const response = await publishTask(data, profile)

    console.log('Publish response:', response)
    return { descriptor: taskDescriptor, publishResponse: response }
  }
)
