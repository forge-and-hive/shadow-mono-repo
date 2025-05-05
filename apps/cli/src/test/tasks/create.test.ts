import { createTaskCommand } from '../../tasks/task/createTask'
import { createFsFromVolume, Volume } from 'memfs'
import path from 'path'
import { ForgeConf } from '../../tasks/types'

// Verify the task file content
const expectedContent = `// TASK: newTask
// Run this task with:
// forge task:run sample:newTask

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

newTask.setDescription(description)
`

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
    // Reset any boundary mocks after each test
    createTaskCommand.resetMocks()
  })

  it('should create a new task file with correct content and update forge.json', async () => {
    // Create mocks directly using mockBoundary
    const persistTaskFn = jest.fn().mockImplementation(async (dir: string, fileName: string, content: string, cwd: string) => {
      const fullPath = path.join(cwd, dir, fileName)
      await (fs as { promises: { writeFile: (path: string, content: string) => Promise<void> } }).promises.writeFile(fullPath, content)
      return { path: fullPath }
    })

    // Mock persistConf to use our in-memory fs
    const persistConfFn = jest.fn().mockImplementation(async (conf: ForgeConf, cwd: string) => {
      const forgePath = path.join(cwd, 'forge.json')
      await (fs as { promises: { writeFile: (path: string, content: string) => Promise<void> } }).promises.writeFile(forgePath, JSON.stringify(conf, null, 2))
    })

    // Mock getCwd to return our root directory
    const getCwdFn = jest.fn().mockResolvedValue(rootDir)

    // Use the new mockBoundary method to mock the boundaries
    createTaskCommand.mockBoundary('persistTask', persistTaskFn)
    createTaskCommand.mockBoundary('persistConf', persistConfFn)
    createTaskCommand.mockBoundary('getCwd', getCwdFn)

    // Run the task
    const taskName = 'sample:new-task'
    await createTaskCommand.run({ descriptorName: taskName })

    // Read the created task file
    const fileContent = await fs.promises.readFile(path.join(rootDir, 'src/tasks/sample', 'newTask.ts'), 'utf-8')

    expect(fileContent).toBe(expectedContent)

    // Read the updated forge.json
    const forgeContent = await fs.promises.readFile(path.join(rootDir, 'forge.json'), 'utf-8')
    const forgeConf = JSON.parse(forgeContent)
    expect(forgeConf.tasks['sample:newTask']).toBeDefined()
  })
})
