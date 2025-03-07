import fs from 'fs/promises'
import path from 'path'
import { createTask } from '@shadow/task'
import { Schema } from '@shadow/schema'

import { type ShadowConf } from '../types'

const schema = new Schema({})

const boundaries = {
  readFile: async (filePath: string): Promise<string> => {
    return await fs.readFile(filePath, 'utf-8')
  }
}

export const load = createTask(
  schema,
  boundaries,
  async function (_, { readFile }) {
    const shadowPath = path.join(process.cwd(), 'shadow.json')

    const content = await readFile(shadowPath)
    return JSON.parse(content) as ShadowConf
  }
)
