import { type WrappedBoundaryFunction, type Mode, type BoundaryRecord } from './boundary'

/**
 * Creates a wrapped boundary function from any function
 * This is framework-agnostic and can be used with or without testing libraries like Jest
 *
 * @param fn The function to wrap as a boundary
 * @param options Optional configuration for the mock boundary
 * @returns A function wrapped as a WrappedBoundaryFunction
 */
export function createMockBoundary<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: {
    getTape?: () => Array<BoundaryRecord>,
    setTape?: (tape: Array<BoundaryRecord>) => void,
    getMode?: () => Mode,
    setMode?: (mode: Mode) => void,
    getRunData?: () => Array<BoundaryRecord>
  } = {}
): WrappedBoundaryFunction {
  // Use provided functions or create simple implementations
  const mockGetTape = options.getTape || ((): BoundaryRecord[] => [])
  const mockSetTape = options.setTape || ((_tape: BoundaryRecord[]): void => {})
  const mockGetMode = options.getMode || ((): Mode => 'proxy')
  const mockSetMode = options.setMode || ((_mode: Mode): void => {})
  const mockGetRunData = options.getRunData || ((): BoundaryRecord[] => [])

  // Empty functions for start/stop run
  const mockStartRun = (): void => {}
  const mockStopRun = (): void => {}

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
