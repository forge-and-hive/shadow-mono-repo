// TASK: create
// Run this task with:
// shadow-cli bundle:create

import { createTask } from '@shadow/task'
import { Schema } from '@shadow/schema'

const schema = new Schema({
  // Add your schema definitions here
  // example: myParam: Schema.string()
})

const boundaries = {
  // Add your boundary functions here
  // example: readFile: async (path: string) => fs.readFile(path, 'utf-8')
}

export const create = createTask(
  schema,
  boundaries,
  async function (argv, boundaries) {
    console.log(argv, boundaries)
    // Your task implementation goes here
    const status = { status: 'Ok' }

    return status
  }
)
