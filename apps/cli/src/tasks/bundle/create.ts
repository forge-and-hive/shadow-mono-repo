// TASK: create
// Run this task with:
// shadow-cli bundle:create

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import esbuild from 'esbuild'

const schema = new Schema({
  entryPoint: Schema.string(),
  outputFile: Schema.string()
})

const boundaries = {}

export const create = createTask(
  schema,
  boundaries,
  async function ({ entryPoint, outputFile }) {
    // Build using esbuild
    await esbuild.build({
      entryPoints: [entryPoint],
      outfile: outputFile,
      bundle: true,
      minify: true,
      platform: 'node',
      sourcemap: true
    })

    return { outputFile }
  }
)
