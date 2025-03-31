import { type WrappedBoundaryFunction } from '@forgehive/task'

export const createBoundaryMock = (): WrappedBoundaryFunction => {
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
