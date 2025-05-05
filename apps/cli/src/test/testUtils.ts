import { type WrappedBoundaryFunction } from '@forgehive/task'

/**
 * Creates a mock boundary function that implements the WrappedBoundaryFunction interface
 *
 * @param mockFn Optional Jest mock function to use as the base function
 * @returns A wrapped boundary function compatible with task.mockBoundary()
 */
export const createMockBoundary = (mockFn?: jest.Mock): WrappedBoundaryFunction => {
  // Use provided mock or create a new one
  const baseMockFn = mockFn || jest.fn().mockResolvedValue(undefined)

  // Create a proper boundary function object that extends the mock function
  const boundaryMock = Object.assign(
    baseMockFn,
    {
      getTape: jest.fn().mockReturnValue([]),
      setTape: jest.fn(),
      getMode: jest.fn().mockReturnValue('proxy'),
      setMode: jest.fn(),
      startRun: jest.fn(),
      stopRun: jest.fn(),
      getRunData: jest.fn().mockReturnValue([])
    }
  ) as WrappedBoundaryFunction

  return boundaryMock
}