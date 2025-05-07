import { getPrice } from '../tasks/stock/getPrice'
import { createMockBoundary, createFetchStockPriceMock, mockStockPrices } from './testUtils'

describe('Stock Price Task', () => {
  afterEach(() => {
    // Reset all mocks after each test
    getPrice.resetMocks()
  })

  it('should fetch the correct price for a given ticker', async () => {
    // Create a mock for the fetchStockPrice boundary
    const fetchStockPriceMock = createMockBoundary(createFetchStockPriceMock())

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Test with AAPL ticker
    const result = await getPrice.run({ ticker: 'AAPL' })

    // Assert the result matches our mock data
    expect(result).toEqual({
      ticker: 'AAPL',
      price: mockStockPrices.AAPL
    })

    // Verify the boundary was called with the correct parameters
    expect(fetchStockPriceMock).toHaveBeenCalledWith('AAPL')
  })

  it('should fetch price for multiple tickers', async () => {
    // Create a mock for the fetchStockPrice boundary
    const fetchStockPriceMock = createMockBoundary(createFetchStockPriceMock())

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Test with VOO ticker
    const result1 = await getPrice.run({ ticker: 'VOO' })
    expect(result1).toEqual({
      ticker: 'VOO',
      price: mockStockPrices.VOO
    })

    // Test with MSFT ticker
    const result2 = await getPrice.run({ ticker: 'MSFT' })
    expect(result2).toEqual({
      ticker: 'MSFT',
      price: mockStockPrices.MSFT
    })

    // Verify the boundary was called twice with different parameters
    expect(fetchStockPriceMock).toHaveBeenCalledTimes(2)
    expect(fetchStockPriceMock).toHaveBeenCalledWith('VOO')
    expect(fetchStockPriceMock).toHaveBeenCalledWith('MSFT')
  })

  it('should use safeRun to handle the result with boundaries data', async () => {
    // Create a mock for the fetchStockPrice boundary
    const fetchStockPriceMock = createMockBoundary(createFetchStockPriceMock())

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Use safeRun to get both the result and boundaries data
    const [result, error, record] = await getPrice.safeRun({ ticker: 'AMZN' })

    // Check there's no error
    expect(error).toBeNull()

    // Check the result
    expect(result).toEqual({
      ticker: 'AMZN',
      price: mockStockPrices.AMZN
    })

    // Verify we have boundary data
    expect(record.boundaries).toBeDefined()
    expect(record.boundaries).toHaveProperty('fetchStockPrice')

    // Check that the boundary has the expected structure
    expect(record.boundaries.fetchStockPrice).toBeInstanceOf(Array)
    if (record.boundaries.fetchStockPrice.length > 0) {
      const boundaryCall = record.boundaries.fetchStockPrice[0]
      expect(boundaryCall).toHaveProperty('input')
      expect(boundaryCall).toHaveProperty('output')
      expect(boundaryCall.input).toEqual(['AMZN'])
      expect(boundaryCall.output).toEqual({ price: mockStockPrices.AMZN })
    }
  })

  it('should handle unknown tickers with default price', async () => {
    // Create a mock for the fetchStockPrice boundary
    const fetchStockPriceMock = createMockBoundary(createFetchStockPriceMock())

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Test with an unknown ticker
    const result = await getPrice.run({ ticker: 'UNKNOWN' })

    // Should return the default price
    expect(result).toEqual({
      ticker: 'UNKNOWN',
      price: mockStockPrices.default
    })
  })
})
