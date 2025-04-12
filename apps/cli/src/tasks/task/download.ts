// TASK: download
// Run this task with:
// forge task:run task:download --descriptorName [name] --uuid [task-uuid]

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import axios from 'axios'
import path from 'path'
import fs from 'fs/promises'
import { camelCase } from '../../utils/camelCase'
import { load as loadConf } from '../conf/load'
import { type ForgeConf } from '../types'

// TODO: Read from .forge/config.json
const API_KEY = 'b4b5a766fcd7dc2d059e8f96a57c8edd'
const API_SECRET = '2900246cb8bebcbeaadbe6348477592f42d62788d13fd4067588438bc11bf116'

const baseHiveUrl = 'http://localhost:4000'

const schema = new Schema({
  descriptorName: Schema.string(),
  uuid: Schema.string()
})

const boundaries = {
  downloadTask: async (uuid: string): Promise<any> => {
    const downloadUrl = `${baseHiveUrl}/download`

    console.log(`Downloading task from ${downloadUrl}...`)

    const authToken = `${API_KEY}:${API_SECRET}`
    const response = await axios.post(downloadUrl, { uuid }, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    return response.data
  },
  loadConf: loadConf.asBoundary(),
  getCwd: async (): Promise<string> => {
    return process.cwd()
  },
  parseTaskName: async (taskDescriptor: string): Promise<{
    descriptor: string
    taskName: string
    fileName: string
    dir?: string
  }> => {
    const res: string[] = taskDescriptor.split(':')

    if (res.length === 1) {
      return {
        descriptor: `${camelCase(res[0])}`,
        taskName: `${camelCase(res[0])}`,
        fileName: `${camelCase(res[0])}.ts`
      }
    }

    return {
      dir: res[0],
      descriptor: `${res[0]}:${camelCase(res[1])}`,
      taskName: `${camelCase(res[1])}`,
      fileName: `${camelCase(res[1])}.ts`
    }
  },
  persistTask: async (dir: string, fileName: string, content: string): Promise<{ path: string }> => {
    const dirPath = path.resolve(dir)
    const taskPath = path.resolve(dirPath, fileName)

    await fs.mkdir(dirPath, { recursive: true })
    await fs.writeFile(taskPath, content, 'utf-8')


    return {
      path: taskPath.toString()
    }
  },
  persistConf: async (forge: ForgeConf, cwd: string): Promise<void> => {
    const forgePath = path.join(cwd, 'forge.json')
    await fs.writeFile(forgePath, JSON.stringify(forge, null, 2))
  },
  checkTaskExists: async (dir: string, fileName: string): Promise<boolean> => {
    const taskPath = path.resolve(dir, fileName)

    try {
      await fs.access(taskPath)
      return true
    } catch {
      return false
    }
  }
}

export const download = createTask(
  schema,
  boundaries,
  async function ({ descriptorName, uuid }, {
    downloadTask,
    getCwd,
    parseTaskName,
    persistTask,
    loadConf,
    persistConf,
    checkTaskExists
  }) {
    console.log(`Attempting to download task with descriptor: ${descriptorName} and uuid: ${uuid}`)

    // Parse descriptor name to get task details
    const { taskName, fileName, descriptor, dir } = await parseTaskName(descriptorName)
    const cwd = await getCwd()
    const forge = await loadConf({})

    let taskPath: string = path.join(cwd, forge.paths.tasks)

    if (dir !== undefined) {
      taskPath = path.join(taskPath, dir)
    }

    // Check if task already exists
    const taskExists = await checkTaskExists(taskPath, fileName)
    if (taskExists) {
      console.log(`Task ${descriptor} already exists at ${taskPath}/${fileName}`)
      return {
        error: 'Task already exists',
        taskPath: `${taskPath}/${fileName}`,
        descriptor
      }
    }

    // Download from hive api server
    const response = await downloadTask(uuid)

    console.log('Download response:', response)

    console.log(`
    ==================================================
    Starting task download!
    Creating: ${taskName}
    Dir:  ${dir ?? ''}
    Into: ${taskPath}
    ==================================================
    `)

    console.log('Writing task file:', taskPath, fileName)
    console.log('Source code:', response.sourceCode)
    await persistTask(taskPath, fileName, response.sourceCode)

    // Update forge.json with the new task
    if (forge.tasks === undefined) {
      forge.tasks = {}
    }

    forge.tasks[descriptor] = {
      path: `${taskPath}/${fileName}`,
      handler: response.handler
    }

    console.log('Forge:', forge)

    await persistConf(forge, cwd)

    return {
      taskPath,
      fileName,
      descriptor,
      handler: response.handler
    }
  }
)
