import { init } from '../../tasks/init'
import { type WrappedBoundaryFunction } from '@shadow/task'

// Mock fs/promises
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined)
}))

describe('Init task', () => {
  // Save original console.log
  const originalConsoleLog = console.log
  let consoleOutput: string[] = []

  // Create a properly typed mock for the boundary function
  const createBoundaryMock = () => {
    const mockFn = jest.fn().mockResolvedValue(undefined)
    const boundaryMock = mockFn as unknown as WrappedBoundaryFunction

    // Add required methods to satisfy the interface
    boundaryMock.getTape = jest.fn().mockReturnValue([])
    boundaryMock.setTape = jest.fn()
    boundaryMock.getMode = jest.fn().mockReturnValue('proxy')
    boundaryMock.setMode = jest.fn()
    boundaryMock.startRun = jest.fn()
    boundaryMock.stopRun = jest.fn()
    boundaryMock.getRunData = jest.fn().mockReturnValue([])

    return boundaryMock
  }

  // Mock console.log before each test
  beforeEach(() => {
    consoleOutput = []
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '))
    })
  })

  // Restore console.log after each test
  afterEach(() => {
    console.log = originalConsoleLog
    jest.clearAllMocks()
  })

  it('should create a config file when dryRun is false', async () => {
    // Create a properly typed mock for the saveFile boundary
    const saveFileMock = createBoundaryMock()

    // Override the boundaries
    init.getBoundaries().saveFile = saveFileMock

    // Run the task
    const result = await init.run({ dryRun: false })

    // Verify the boundary was called with the correct path and content
    expect(saveFileMock).toHaveBeenCalledTimes(1)
    // Access the calls directly from the jest mock function
    const mockFn = saveFileMock as unknown as jest.Mock
    expect(mockFn.mock.calls[0][0]).toContain('shadow.json')

    // Verify the config structure
    expect(result).toHaveProperty('project.name', 'ChangeMePls')
    expect(result).toHaveProperty('paths.logs', 'logs/')
    expect(result).toHaveProperty('paths.tasks', 'src/tasks/')
    expect(result).toHaveProperty('infra.region', 'us-west-2')

    // Verify console output
    expect(consoleOutput.some(msg => msg.includes('Created shadow.json'))).toBe(true)
  })

  it('should not create a file when dryRun is true', async () => {
    // Create a properly typed mock for the saveFile boundary
    const saveFileMock = createBoundaryMock()

    // Override the boundaries
    init.getBoundaries().saveFile = saveFileMock

    // Run the task
    const result = await init.run({ dryRun: true })

    // Verify the boundary was not called
    expect(saveFileMock).not.toHaveBeenCalled()

    // Verify the config structure is still returned
    expect(result).toHaveProperty('project.name', 'ChangeMePls')
    expect(result).toHaveProperty('paths.logs', 'logs/')
    expect(result).toHaveProperty('paths.tasks', 'src/tasks/')
    expect(result).toHaveProperty('infra.region', 'us-west-2')

    // Verify console output
    expect(consoleOutput.some(msg => msg.includes('Dry run, not creating shadow.json'))).toBe(true)
  })

  it('should handle both undefined and false dryRun values as non-dry runs', async () => {
    // Create a properly typed mock for the saveFile boundary
    const saveFileMock = createBoundaryMock()

    // Override the boundaries
    init.getBoundaries().saveFile = saveFileMock

    // Run the task with undefined dryRun (should create file)
    await init.run({})

    // Verify the boundary was called
    expect(saveFileMock).toHaveBeenCalledTimes(1)

    // Reset mock
    jest.clearAllMocks()
    const newSaveFileMock = createBoundaryMock()
    init.getBoundaries().saveFile = newSaveFileMock

    // Run the task with false dryRun (should create file)
    await init.run({ dryRun: false })

    // Verify the boundary was called
    expect(newSaveFileMock).toHaveBeenCalledTimes(1)
  })
})
