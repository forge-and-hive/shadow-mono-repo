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

/**
 * Mock specific stock price responses for testing
 */
export const mockStockPrices = {
  AAPL: 175.50,
  MSFT: 325.75,
  GOOG: 140.20,
  META: 450.30,
  AMZN: 178.25,
  VOO: 420.15,
  VTI: 240.80,
  default: 100.00
}

/**
 * Creates a mock for the fetchStockPrice boundary that returns
 * predefined prices for specific tickers
 */
export const createFetchStockPriceMock = (): jest.Mock => {
  return jest.fn().mockImplementation((ticker: string) => {
    const price = mockStockPrices[ticker as keyof typeof mockStockPrices] || mockStockPrices.default
    return Promise.resolve({ price })
  })
}
