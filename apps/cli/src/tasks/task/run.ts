// TASK: run
// Run this task with:
// shadow-cli task:run

import path from 'path'
import fs from 'fs/promises'

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import { RecordTape } from '@forgehive/record-tape'

import { create as bundleCreate } from '../bundle/create'
import { load as bundleLoad } from '../bundle/load'
import { load as loadConf } from '../conf/load'
import { type ShadowConf } from '../types'

// For now, we'll use a simple schema without the record type
// TODO: Use Schema.record once it's properly built and available
const schema = new Schema({
  descriptorName: Schema.string(),
  args: Schema.mixedRecord()
  // args will be passed directly without schema validation for now
})

const boundaries = {
  loadConf: loadConf.asBoundary(),
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
  }
}

export const run = createTask(
  schema,
  boundaries,
  async function ({ descriptorName, args }, { loadConf, bundleCreate, bundleLoad, verifyLogFolder }) {
    // Load shadow configuration
    const shadow: ShadowConf = await loadConf({})
    const taskDescriptor = shadow.tasks[descriptorName as keyof typeof shadow.tasks]

    if (taskDescriptor === undefined) {
      throw new Error('Task is not defined on shadow.json')
    }

    // Verify if log folder exists
    const logFolderPath = path.join(process.cwd(), shadow.paths.logs)
    const logFolderExists = await verifyLogFolder(logFolderPath)
    if (!logFolderExists) {
      throw new Error(`Log folder "${logFolderPath}" does not exist`)
    }

    // Prepare paths
    const logsPath = path.join(logFolderPath, descriptorName)
    const entryPoint = path.join(process.cwd(), taskDescriptor.path)
    const outputFile = path.resolve(__dirname, '../.builds', `${descriptorName}.js`)

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

    tape.recordFrom(descriptorName, task)

    // Run the task with provided arguments
    let result
    try {
      result = await task.run(args)
    } catch (error) {
      await tape.save()
      throw error
    }

    await tape.save()

    return result
  }
)
