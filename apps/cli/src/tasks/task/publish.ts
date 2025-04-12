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

// TODO: Read from .forge/config.json
const API_KEY = 'b4b5a766fcd7dc2d059e8f96a57c8edd'
const API_SECRET = '2900246cb8bebcbeaadbe6348477592f42d62788d13fd4067588438bc11bf116'

const baseHiveUrl = 'http://localhost:4000'

const schema = new Schema({
  descriptorName: Schema.string()
})

const boundaries = {
  getCwd: async (): Promise<string> => {
    return process.cwd()
  },
  loadConf: loadConf.asBoundary(),
  bundleCreate: bundleCreate.asBoundary(),
  bundleLoad: bundleLoad.asBoundary(),
  readFileUtf8: async (filePath: string): Promise<string> => {
    return fs.readFile(filePath, 'utf-8')
  },
  readFileBinary: async (filePath: string): Promise<Buffer> => {
    return fs.readFile(filePath)
  },
  publishTask: async (data: any): Promise<any> => {
    const publishUrl = `${baseHiveUrl}/publish`

    console.log(`Publishing task to ${publishUrl}...`)
    const authToken = `${API_KEY}:${API_SECRET}`
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
    publishTask
  }) {
    const cwd = await getCwd()
    const forgeJson = await loadConf({})
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
    const response = await publishTask(data)

    console.log('Publish response:', response)
    return { descriptor: taskDescriptor, publishResponse: response }
  }
)
