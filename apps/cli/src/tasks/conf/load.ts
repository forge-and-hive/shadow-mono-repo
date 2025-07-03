import fs from 'fs/promises'
import path from 'path'

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

import { type ForgeConf } from '../types'

const schema = new Schema({})

const boundaries = {
  readFile: async (filePath: string): Promise<string> => {
    return await fs.readFile(filePath, 'utf-8')
  }
}

export const load = createTask({
  schema,
  boundaries,
  fn: async function (_, { readFile }) {
    const forgePath = path.join(process.cwd(), 'forge.json')

    const content = await readFile(forgePath)
    return JSON.parse(content) as ForgeConf
  }
})
