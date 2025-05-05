import { type WrappedBoundaryFunction, type Mode } from './boundary'

/**
 * Creates a wrapped boundary function from any function
 * This is framework-agnostic and can be used with or without testing libraries like Jest
 *
 * @param fn The function to wrap as a boundary
 * @param options Optional configuration for the mock boundary
 * @returns A function wrapped as a WrappedBoundaryFunction
 */
export function createMockBoundary<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    getTape?: () => Array<any>,
    setTape?: (tape: Array<any>) => void,
    getMode?: () => Mode,
    setMode?: (mode: Mode) => void,
    getRunData?: () => Array<any>
  } = {}
): WrappedBoundaryFunction {
  // Use provided functions or create simple implementations
  const mockGetTape = options.getTape || (() => [])
  const mockSetTape = options.setTape || (() => {})
  const mockGetMode = options.getMode || (() => 'proxy')
  const mockSetMode = options.setMode || (() => {})
  const mockGetRunData = options.getRunData || (() => [])

  // Empty functions for start/stop run
  const mockStartRun = () => {}
  const mockStopRun = () => {}

  // Cast the function to a WrappedBoundaryFunction
  const wrappedFn = fn as unknown as WrappedBoundaryFunction

  // Add required methods to satisfy the interface
  wrappedFn.getTape = mockGetTape
  wrappedFn.setTape = mockSetTape
  wrappedFn.getMode = mockGetMode
  wrappedFn.setMode = mockSetMode
  wrappedFn.startRun = mockStartRun
  wrappedFn.stopRun = mockStopRun
  wrappedFn.getRunData = mockGetRunData

  return wrappedFn
}

/**
 * Creates a mock boundary with Jest mock functions
 * This is designed to convert a jest.Mock into a properly typed WrappedBoundaryFunction
 *
 * @param mockFn Jest mock function to convert to a boundary function
 * @returns A function wrapped as a WrappedBoundaryFunction with Jest mock methods
 */
export function createJestBoundaryMock(mockFn: jest.Mock): WrappedBoundaryFunction {
  // Check if we're in a Jest environment
  if (typeof jest === 'undefined') {
    throw new Error('Jest is not available in this environment')
  }

  // Create jest mock functions for all the required methods
  const getTape = jest.fn().mockReturnValue([])
  const setTape = jest.fn()
  const getMode = jest.fn().mockReturnValue('proxy')
  const setMode = jest.fn()
  const getRunData = jest.fn().mockReturnValue([])

  return createMockBoundary(mockFn, {
    getTape,
    setTape,
    getMode,
    setMode,
    getRunData
  })
}
