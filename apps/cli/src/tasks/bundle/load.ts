// TASK: load
// Run this task with:
// forge task:run bundle:load

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

const schema = new Schema({
  bundlePath: Schema.string()
})

const boundaries = {}

export const load = createTask({
  schema,
  boundaries,
  fn: async function ({ bundlePath }) {
    // Dynamically import the bundle from the specified path
    const bundle = await import(bundlePath)

    return bundle
  }
})
