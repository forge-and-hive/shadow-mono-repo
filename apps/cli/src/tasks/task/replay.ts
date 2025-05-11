// TASK: replay
// Run this task with:
// forge task:run task:replay

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import fs from 'fs/promises'

// Define the fixture structure type
interface Fixture {
  fixtureUUID: string;
  name: string;
  type: 'success' | 'error';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  boundaries: Record<string, unknown>;
  context: Record<string, unknown>;
}

const description = 'Replay a task execution from a specified path'

const schema = new Schema({
  path: Schema.string()
})

const boundaries = {
  readFixture: async (filePath: string): Promise<Fixture> => {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const parsedData = JSON.parse(fileContent) as Fixture

    return parsedData
  }
}

export const replay = createTask(
  schema,
  boundaries,
  async function (argv, { readFixture }) {
    console.log('Input path:', argv.path)

    // Read the file from the provided path
    const fixture = await readFixture(argv.path)

    // Parse the content as JSON
    console.log('UUID:', fixture.fixtureUUID)
    console.log('Name:', fixture.name)
    console.log('Type:', fixture.type)
    console.log('Context:', fixture.context)

    console.log('Replay with:', {
      input: fixture.input,
      output: fixture.output,
      boundaries: fixture.boundaries,
    })


    const status = {
      fixture: fixture
    }

    return status
  }
)

replay.setDescription(description)
