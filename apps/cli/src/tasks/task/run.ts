// TASK: run
// Run this task with:
// shadow-cli task:run

import path from 'path'
import { createTask } from '@shadow/task'
import { Schema } from '@shadow/schema'

import { create as bundleCreate } from '../bundle/create'
import { load as bundleLoad } from '../bundle/load'
import { load as loadConf } from '../conf/load'
import { type ShadowConf } from '../types'

// For now, we'll use a simple schema without the record type
// TODO: Use Schema.record once it's properly built and available
const schema = new Schema({
  descriptorName: Schema.string()
  // args will be passed directly without schema validation for now
})

const boundaries = {
  loadConf: loadConf.asBoundary(),
  bundleCreate: bundleCreate.asBoundary(),
  bundleLoad: bundleLoad.asBoundary()
}

export const run = createTask(
  schema,
  boundaries,
  async function ({ descriptorName }, { loadConf, bundleCreate, bundleLoad }) {
    // Get args from process.argv or other sources as needed
    const args = {} // This would normally come from CLI arguments

    // Load shadow configuration
    const shadow: ShadowConf = await loadConf({})
    const taskDescriptor = shadow.tasks[descriptorName as keyof typeof shadow.tasks]

    if (taskDescriptor === undefined) {
      throw new Error('Task is not defined on shadow.json')
    }

    // Prepare paths
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

    // Run the task with provided arguments
    const result = await task.run(args)

    return result
  }
)
