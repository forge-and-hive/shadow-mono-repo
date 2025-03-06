import { Task } from '@shadow/task'
import { Schema } from '@shadow/schema'
import path from 'path'
import fs from 'fs/promises'

import { type ShadowConf } from './types'

const schema = new Schema({
  dryRun: Schema.boolean().optional()
})

const boundaries = {
  saveFile: async (path: string, content: string): Promise<void> => {
    await fs.writeFile(path, content)
  }
}

export const init = new Tas(async function (argv, { saveFile }) {
  console.log('argv =>', argv)

  const shadowPath = path.join(process.cwd(), 'shadow.json')
  const config: ShadowConf = {
    project: {
      name: 'ChangeMePls'
    },
    paths: {
      logs: 'logs/',
      tasks: 'src/tasks/',
      runners: 'src/runners/',
      fixtures: 'src/tests/fixtures',
      tests: 'src/tests/'
    },
    infra: {
      region: 'us-west-2',
      bucket: ''
    },
    tasks: {},
    runners: {}
  }

  await saveFile(shadowPath, JSON.stringify(config, null, 2))
  console.log('shadow.json has been created')

  return config
}, {
  boundaries,
  validate: schema
})
