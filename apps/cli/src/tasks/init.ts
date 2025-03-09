import path from 'path'
import fs from 'fs/promises'

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

import { type ShadowConf } from './types'

const schema = new Schema({
  dryRun: Schema.boolean().optional()
})

const boundaries = {
  saveFile: async (path: string, content: string): Promise<void> => {
    await fs.writeFile(path, content)
  }
}

// Create a task with type inference from schema and boundaries
export const init = createTask(
  schema,
  boundaries,
  async function (argv, { saveFile }) {
    console.log('argv =>', argv)

    // Handle the dryRun flag
    const isDryRun = Boolean(argv.dryRun)

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

    const content = JSON.stringify(config, null, 2)

    if (!isDryRun) {
      await saveFile(shadowPath, content)
      console.log(`Created shadow.json at ${shadowPath}`)
    } else {
      console.log('Dry run, not creating shadow.json')
      console.log(content)
    }

    return config
  }
)
