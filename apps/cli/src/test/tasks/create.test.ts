import { createTaskCommand } from '../../tasks/task/createTask'
import { createFsFromVolume, Volume } from 'memfs'
import path from 'path'
import { createBoundaryMock } from '../utils'

describe('Create task', () => {
  let volume: InstanceType<typeof Volume>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fs: any
  let rootDir: string

  beforeEach(() => {
    // Create a new in-memory filesystem for each test
    volume = new Volume()
    fs = createFsFromVolume(volume)
    rootDir = '/'

    // Create the tasks directory
    fs.mkdirSync(path.join(rootDir, 'src', 'tasks'), { recursive: true })
    fs.mkdirSync(path.join(rootDir, 'src', 'tasks', 'sample'), { recursive: true })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create a new task file with correct content', async () => {
    // Create properly typed mocks for the boundaries
    const persistTaskMock = createBoundaryMock()
    const persistTaskFn = persistTaskMock as unknown as jest.Mock

    // Override the persistTask implementation to use our in-memory fs
    persistTaskFn.mockImplementation(async (dir: string, fileName: string, content: string) => {
      const fullPath = path.join(rootDir, dir, fileName)
      await (fs as { promises: { writeFile: (path: string, content: string) => Promise<void> } }).promises.writeFile(fullPath, content)
      return { path: fullPath }
    })

    // Override the boundaries
    createTaskCommand.getBoundaries().persistTask = persistTaskMock

    // Run the task
    const taskName = 'sample:new-task'
    await createTaskCommand.run({ descriptorName: taskName })

    // Read the created file
    const fileContent = await fs.promises.readFile(path.join(rootDir, 'src/tasks/sample', 'newTask.ts'), 'utf-8')

    // Verify the file content
    const expectedContent = `// TASK: newTask
// Run this task with:
// forge task:run sample:newTask

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

const schema = new Schema({
  // Add your schema definitions here
  // example: myParam: Schema.string()
})

const boundaries = {
  // Add your boundary functions here
  // example: readFile: async (path: string) => fs.readFile(path, 'utf-8')
}

export const newTask = createTask(
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
`

    expect(fileContent).toBe(expectedContent)
  })
})
