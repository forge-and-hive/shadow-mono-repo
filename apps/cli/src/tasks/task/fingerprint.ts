// TASK: fingerprint
// Run this task with:
// forge task:run task:fingerprint --descriptorName task-name

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

import { load as loadConf } from '../conf/load'
import { analyzeTaskFile, TaskFingerprintOutput } from '../../utils/taskAnalysis'

interface FingerprintAnalysis {
  taskFingerprint: TaskFingerprintOutput
}

const description = 'Analyze a specific task and generate detailed fingerprint without bundling'

const schema = new Schema({
  descriptorName: Schema.string()
})

const boundaries = {
  getCwd: async (): Promise<string> => {
    return process.cwd()
  },
  loadConf: loadConf.asBoundary(),
  readFile: async (filePath: string): Promise<string> => {
    return fs.readFile(filePath, 'utf-8')
  },
  writeFile: async (filePath: string, content: string): Promise<void> => {
    return fs.writeFile(filePath, content)
  },
  ensureForgeFolder: async (): Promise<string> => {
    const forgePath = path.join(os.homedir(), '.forge')
    try {
      await fs.access(forgePath)
    } catch {
      await fs.mkdir(forgePath, { recursive: true })
    }
    return forgePath
  }
}

export const fingerprint = createTask(
  schema,
  boundaries,
  async function ({ descriptorName }, {
    getCwd,
    loadConf,
    readFile,
    writeFile,
    ensureForgeFolder
  }) {
    const cwd = await getCwd()
    const forgeJson = await loadConf({})

    const taskDescriptor = forgeJson.tasks[descriptorName as keyof typeof forgeJson.tasks]

    if (taskDescriptor === undefined) {
      throw new Error(`Task "${descriptorName}" is not defined in forge.json`)
    }

    const filePath = path.join(cwd, taskDescriptor.path)
    const forgePath = await ensureForgeFolder()
    const fingerprintFile = path.join(forgePath, `${descriptorName}.task-fingerprint.json`)

    console.log(`Analyzing task: ${descriptorName}`)
    console.log(`Task file: ${filePath}`)

    // Read and analyze the task file using the utility function
    const sourceCode = await readFile(filePath)
    const taskFingerprint = analyzeTaskFile(sourceCode, filePath)

    if (!taskFingerprint) {
      throw new Error('Could not extract fingerprint from task file: ' + filePath)
    }

    // Create analysis result - clean output without extra fields
    const analysis: FingerprintAnalysis = {
      taskFingerprint
    }

    // Write fingerprint to file
    await writeFile(fingerprintFile, JSON.stringify(analysis, null, 2))

    console.log('Task fingerprint generated successfully')
    console.log(`Input properties: ${Object.keys(taskFingerprint.inputSchema.properties).join(', ')}`)
    console.log(`Boundaries: ${taskFingerprint.boundaries.join(', ')}`)
    console.log(`Fingerprint saved to: ${fingerprintFile}`)

    return {
      taskName: descriptorName,
      fingerprint: taskFingerprint,
      fingerprintFile,
      analysis: {
        inputSchemaProps: Object.keys(taskFingerprint.inputSchema.properties),
        boundaryCount: taskFingerprint.boundaries.length,
        hasDescription: !!taskFingerprint.description,
        outputType: taskFingerprint.outputType.type
      }
    }
  }
)

fingerprint.setDescription(description)
