// TASK: load
// Run this task with:
// shadow-cli bundle:load

import { createTask } from '@shadow/task'
import { Schema } from '@shadow/schema'

const schema = new Schema({
  bundlePath: Schema.string()
})

const boundaries = {}

export const load = createTask(
  schema,
  boundaries,
  async function ({ bundlePath }) {
    // Dynamically import the bundle from the specified path
    const bundle = await import(bundlePath)

    console.log(`Bundle loaded successfully from: ${bundlePath}`, bundle)

    return bundle
  }
)
