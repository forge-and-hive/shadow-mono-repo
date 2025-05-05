import { getPrice } from '../tasks/stock/getPrice'
import { createMockBoundary } from './testUtils'

describe('Sample Project Tests', () => {
  it('should demonstrate basic boundary mocking', async () => {
    // Create a mock for the fetchStockPrice boundary with a fixed price
    const mockFetchPrice = jest.fn().mockResolvedValue({ price: 42 })
    const fetchStockPriceMock = createMockBoundary(mockFetchPrice)

    // Mock the boundary
    getPrice.mockBoundary('fetchStockPrice', fetchStockPriceMock)

    // Make sure to clean up after the test
    try {
      // Run the task with any ticker
      const result = await getPrice.run({ ticker: 'ANY' })

      // Result should have our mocked price
      expect(result).toEqual({
        ticker: 'ANY',
        price: 42
      })

      // Verify our mock was called
      expect(mockFetchPrice).toHaveBeenCalledWith('ANY')
    } finally {
      // Clean up by resetting mocks
      getPrice.resetMocks()
    }
  })
})