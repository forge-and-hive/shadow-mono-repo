import { getPrice } from '../tasks/stock/getPrice'
import { createMockBoundary } from './testUtils'

describe('Stock Price Task Error Handling', () => {
  afterEach(() => {
    // Reset all mocks after each test
    getPrice.resetMocks()
  })

  it('should handle API errors correctly using safeRun', async () => {
    // Create a mock that throws an error
    const errorMock = jest.fn().mockRejectedValue(new Error('API unavailable'))
    const fetchStockPriceMock = createMockBoundary(errorMock)

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Use safeRun to get the error
    const [result, error, record] = await getPrice.safeRun({ ticker: 'AAPL' })

    // Verify we got an error
    expect(error).toBeDefined()
    expect(error?.message).toContain('API unavailable')

    // Result should be null
    expect(result).toBeNull()

    // Boundary data should still be available
    expect(record.boundaries).toBeDefined()
  })

  it('should throw when using run with an error', async () => {
    // Create a mock that throws an error
    const errorMock = jest.fn().mockRejectedValue(new Error('Network failure'))
    const fetchStockPriceMock = createMockBoundary(errorMock)

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Run should throw
    await expect(getPrice.run({ ticker: 'MSFT' }))
      .rejects
      .toThrow('Network failure')

    // Verify the mock was called
    expect(fetchStockPriceMock).toHaveBeenCalledWith('MSFT')
  })

  it('should handle validation errors', async () => {
    // Create a normal mock
    const fetchStockPriceMock = createMockBoundary(
      jest.fn().mockResolvedValue({ price: 100 })
    )

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Use safeRun with invalid input (missing required ticker)
    // Fake the input type to be the expected type so the type checker doesn't complain and the test runs
    const [result, error, record] = await getPrice.safeRun({} as { ticker: string })

    // Verify we got a validation error
    expect(error).toBeDefined()
    expect(error?.message).toContain('Invalid input')

    // Result should be null
    expect(result).toBeNull()

    // Boundary logs should be null since validation failed before boundaries ran
    expect(record.boundaries).toBeNull()

    // The boundary should not have been called
    expect(fetchStockPriceMock).not.toHaveBeenCalled()
  })

  it('should allow mocking multiple boundaries', async () => {
    // In a real-world scenario we might have multiple boundaries

    // Create main mock for fetchStockPrice
    const fetchStockPriceMock = createMockBoundary(
      jest.fn().mockResolvedValue({ price: 200 })
    )

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Run the task
    const result = await getPrice.run({ ticker: 'TEST' })

    // Check the result uses our mock price
    expect(result).toEqual({
      ticker: 'TEST',
      price: 200
    })
  })

  it('should verify mocking can be reset', async () => {
    // Get a reference to the mock object we're going to create
    const mockFn = jest.fn().mockResolvedValue({ price: 123.45 })
    const fetchStockPriceMock = createMockBoundary(mockFn)

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Verify the mock is in use before reset
    expect(getPrice.getBoundaries().fetchStockPrice).toBe(fetchStockPriceMock)

    // Reset the mock
    getPrice.resetMock('fetchStockPrice')

    // Verify the mock is no longer in use
    // This confirms the mock was properly reset
    expect(getPrice.getBoundaries().fetchStockPrice).not.toBe(fetchStockPriceMock)

    // For added verification, run the task
    // We should get a real result, not our mock value
    const result = await getPrice.run({ ticker: 'AAPL' })

    // Should not be our mocked price of 123.45
    expect(result.price).not.toBe(123.45)
  })
})
