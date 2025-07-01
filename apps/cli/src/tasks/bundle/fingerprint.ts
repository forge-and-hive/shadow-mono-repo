// TASK: fingerprint
// Run this task with:
// forge task:run bundle:fingerprint --descriptorName task-name

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import * as esbuild from 'esbuild'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

import { load as loadConf } from '../conf/load'
import { analyzeTaskFile, TaskFingerprintOutput } from '../../utils/taskAnalysis'

interface TaskFingerprint {
  name: string
  description?: string
  location: {
    file: string
    line: number
    column: number
  }
  inputSchema: {
    type: string
    properties: Record<string, any>
  }
  outputType: {
    type: string
    properties?: Record<string, any>
  }
  boundaries: string[]
  hash: string
}

interface FingerprintResult {
  tasks: TaskFingerprintOutput[]
  buildInfo: {
    entryPoint: string
    outputFile: string
    fingerprintsFile?: string
    totalTasks: number
    buildTimestamp: string
  }
}

const description = 'Generate task bundle with comprehensive fingerprinting and type extraction'

const schema = new Schema({
  descriptorName: Schema.string(),
  filePath: Schema.string().optional()
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

// esbuild plugin for fingerprinting
function taskFingerprintPlugin(): esbuild.Plugin {
  return {
    name: 'task-fingerprint',
    setup(build) {
      const fingerprints: TaskFingerprint[] = []

      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        const sourceCode = await fs.readFile(args.path, 'utf-8')

        // Only analyze files that contain createTask
        if (sourceCode.includes('createTask')) {
          const taskFingerprint = analyzeTaskFile(sourceCode, args.path)
          if (taskFingerprint) {
            // Convert to full TaskFingerprint for plugin compatibility
            const fullFingerprint: TaskFingerprint = {
              name: path.basename(args.path, '.ts'),
              description: taskFingerprint.description,
              location: {
                file: args.path,
                line: 1,
                column: 1
              },
              inputSchema: taskFingerprint.inputSchema,
              outputType: taskFingerprint.outputType,
              boundaries: taskFingerprint.boundaries,
              hash: 'generated-hash'
            }
            fingerprints.push(fullFingerprint)
          }
        }

        return null // Let esbuild handle the file normally
      })

      build.onEnd((result) => {
        // Store fingerprints for later use
        (result as any).fingerprints = fingerprints
      })
    }
  }
}

export const fingerprint = createTask(
  schema,
  boundaries,
  async function ({ descriptorName, filePath }, {
    getCwd,
    loadConf,
    readFile,
    writeFile,
    ensureForgeFolder
  }) {
    // If filePath is provided, analyze that file directly and return JSON
    if (filePath) {
      console.log(`Analyzing task file: ${filePath}`)
      const sourceCode = await readFile(filePath)
      const fingerprintOutput = analyzeTaskFile(sourceCode, filePath)

      if (!fingerprintOutput) {
        throw new Error('Could not extract fingerprint from task file: ' + filePath)
      }

      return {
        taskFingerprint: fingerprintOutput
      }
    }

    // Original bundle logic when no filePath is provided
    const cwd = await getCwd()
    const forgeJson = await loadConf({})

    const taskDescriptor = forgeJson.tasks[descriptorName as keyof typeof forgeJson.tasks]

    if (taskDescriptor === undefined) {
      throw new Error(`Task "${descriptorName}" is not defined in forge.json`)
    }

    const entryPoint = path.join(cwd, taskDescriptor.path)
    const forgePath = await ensureForgeFolder()
    const outputFile = path.join(forgePath, `${descriptorName}.js`)
    const fingerprintsFile = path.join(forgePath, `${descriptorName}.fingerprints.json`)

    console.log(`Generating bundle with fingerprints for task: ${descriptorName}`)
    console.log(`Entry point: ${entryPoint}`)
    console.log(`Output: ${outputFile}`)

    // Build with fingerprinting plugin
    const result = await esbuild.build({
      entryPoints: [entryPoint],
      outfile: outputFile,
      bundle: true,
      minify: true,
      platform: 'node',
      sourcemap: true,
      plugins: [taskFingerprintPlugin()],
      metafile: true
    })

    // Extract fingerprints from build result
    const taskFingerprints = (result as any).fingerprints || []

    // Convert to simplified output format (remove name, location, hash)
    const simplifiedFingerprints: TaskFingerprintOutput[] = taskFingerprints.map((fp: TaskFingerprint) => ({
      description: fp.description,
      inputSchema: fp.inputSchema,
      outputType: fp.outputType,
      boundaries: fp.boundaries
    }))

    // Create fingerprint result
    const fingerprintResult: FingerprintResult = {
      tasks: simplifiedFingerprints,
      buildInfo: {
        entryPoint,
        outputFile,
        fingerprintsFile,
        totalTasks: simplifiedFingerprints.length,
        buildTimestamp: new Date().toISOString()
      }
    }

    // Write fingerprints to file
    await writeFile(fingerprintsFile, JSON.stringify(fingerprintResult, null, 2))

    console.log(`Generated ${taskFingerprints.length} task fingerprints`)
    console.log(`Fingerprints saved to: ${fingerprintsFile}`)

    return {
      outputFile,
      fingerprintsFile,
      taskFingerprints: {
        totalTasks: taskFingerprints.length,
        tasks: taskFingerprints.map((fp: TaskFingerprint) => ({
          name: fp.name,
          inputType: fp.inputSchema.type,
          outputType: fp.outputType.type,
          boundaryCount: fp.boundaries.length,
          hash: fp.hash
        }))
      }
    }
  }
)

fingerprint.setDescription(description)
