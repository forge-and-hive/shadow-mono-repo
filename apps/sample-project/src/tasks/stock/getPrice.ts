// TASK: getPrice
// Run this task with:
// shadow-cli task:run stock:getPrice

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

export const getPrice = createTask(
  schema,
  boundaries,
  async function (_argv, _boundary) {
    const status = { status: 'Its alive!!!!' }

    return status
  }
)
