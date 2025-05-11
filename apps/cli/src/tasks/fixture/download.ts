// TASK: download
// Run this task with:
// forge task:run fixture:download

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

const description = 'Add task description here'

const schema = new Schema({
  // Add your schema definitions here
  // example: myParam: Schema.string()
})

const boundaries = {
  // Add your boundary functions here
  // example: readFile: async (path: string) => fs.readFile(path, 'utf-8')
}

export const download = createTask(
  schema,
  boundaries,
  async function (argv, boundaries) {
    console.log('input:', argv)
    console.log('boundaries:', boundaries)
    // Your task implementation goes here
    const status = { status: 'Ok' }

    return status
  }
)

download.setDescription(description)
