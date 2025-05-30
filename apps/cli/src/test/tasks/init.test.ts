import { init } from '../../tasks/init'
import { createFsFromVolume, Volume } from 'memfs'
import path from 'path'
import { createMockBoundary } from '../testUtils'

describe('Init task', () => {
  let volume: InstanceType<typeof Volume>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fs: any
  let rootDir: string

  beforeEach(() => {
    // Create a new in-memory filesystem for each test
    volume = new Volume()
    fs = createFsFromVolume(volume)
    rootDir = '/'
  })

  afterEach(() => {
    jest.clearAllMocks()
    // Reset any boundary mocks after each test
    init.resetMocks()
  })

  it('should create forge.json with correct content in the filesystem', async () => {
    // Create mocks directly using Jest
    const saveFileFn = jest.fn().mockImplementation(async (filePath: string, content: string) => {
      const fullPath = path.join(rootDir, filePath)
      await (fs as { promises: { writeFile: (path: string, content: string) => Promise<void> } }).promises.writeFile(fullPath, content)
    })

    const getCwdFn = jest.fn().mockResolvedValue(rootDir)

    // Create wrapped boundary mocks
    const saveFileMock = createMockBoundary(saveFileFn)
    const getCwdMock = createMockBoundary(getCwdFn)

    // Mock the boundaries
    init.mockBoundary('saveFile', saveFileMock)
    init.mockBoundary('getCwd', getCwdMock)

    // Run the task
    await init.run({})

    // Read the created file
    const fileContent = await fs.promises.readFile(path.join(rootDir, 'forge.json'), 'utf-8')
    const config = JSON.parse(fileContent)

    // Verify the file content
    expect(config).toHaveProperty('project.name', 'BaseProject')
    expect(config).toHaveProperty('paths.logs', 'logs/')
    expect(config).toHaveProperty('paths.tasks', 'src/tasks/')
    expect(config).toHaveProperty('infra.region', 'us-west-2')
    expect(config).toHaveProperty('tasks')
    expect(config).toHaveProperty('runners')
  })

  it('should not create forge.json when dryRun is true', async () => {
    // Create mocks directly using Jest
    const saveFileFn = jest.fn()
    const getCwdFn = jest.fn().mockResolvedValue(rootDir)

    // Create wrapped boundary mocks
    const saveFileMock = createMockBoundary(saveFileFn)
    const getCwdMock = createMockBoundary(getCwdFn)

    // Mock the boundaries
    init.mockBoundary('saveFile', saveFileMock)
    init.mockBoundary('getCwd', getCwdMock)

    // Run the task with dryRun flag
    const result = await init.run({ dryRun: true })

    // Verify saveFile was not called
    expect(saveFileFn).not.toHaveBeenCalled()

    // Verify the returned config has the correct structure
    expect(result).toHaveProperty('project.name', 'BaseProject')
    expect(result).toHaveProperty('paths.logs', 'logs/')
    expect(result).toHaveProperty('paths.tasks', 'src/tasks/')
    expect(result).toHaveProperty('infra.region', 'us-west-2')
    expect(result).toHaveProperty('tasks')
    expect(result).toHaveProperty('runners')

    // Verify no file was created
    await expect(fs.promises.readFile(path.join(rootDir, 'forge.json'), 'utf-8')).rejects.toThrow()
  })
})
