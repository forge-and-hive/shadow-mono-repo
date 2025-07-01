import { Schema } from '@forgehive/schema'
import { createTask, ExecutionRecord } from '../index'

describe('Complex boundary replay tests', () => {
  // Define types for our portfolio data
  type Stock = {
    ticker: string;
    quantity: number;
  }

  type Portfolio = {
    id: string;
    userId: string;
    stocks: Stock[];
  }

  // Test data
  let priceData: Record<string, number>
  let portfolioData: Record<string, Portfolio>

  // Boundaries for the portfolio task
  let boundaries: {
    fetchPrice: (ticker: string) => Promise<number>;
    fetchPortfolio: (userId: string) => Promise<Portfolio>;
  }

  // The task - using eslint-disable to allow any type for this test
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let calculatePortfolioValue: any

  beforeEach(() => {
    // Setup mock data
    priceData = {
      'AAPL': 182.63,
      'MSFT': 421.90,
      'GOOGL': 171.04,
      'AMZN': 184.72
    }

    portfolioData = {
      'user1': {
        id: 'portfolio1',
        userId: 'user1',
        stocks: [
          { ticker: 'AAPL', quantity: 10 },
          { ticker: 'MSFT', quantity: 5 },
          { ticker: 'GOOGL', quantity: 8 }
        ]
      },
      'user2': {
        id: 'portfolio2',
        userId: 'user2',
        stocks: [
          { ticker: 'AMZN', quantity: 15 },
          { ticker: 'MSFT', quantity: 3 }
        ]
      }
    }

    // Define boundaries with realistic functions
    boundaries = {
      fetchPrice: async (ticker: string): Promise<number> => {
        // Check if we have a price for this ticker
        if (!priceData[ticker]) {
          throw new Error(`Price data not available for ticker: ${ticker}`)
        }
        return priceData[ticker]
      },
      fetchPortfolio: async (userId: string): Promise<Portfolio> => {
        // Check if we have a portfolio for this user
        if (!portfolioData[userId]) {
          throw new Error(`Portfolio not found for user: ${userId}`)
        }
        return portfolioData[userId]
      }
    }

    // Create a schema for the task
    const schema = new Schema({
      userId: Schema.string()
    })

    // Create the portfolio value calculation task
    calculatePortfolioValue = createTask({
      name: 'calculatePortfolioValue',
      schema,
      boundaries,
      fn: async ({ userId }, { fetchPortfolio, fetchPrice }) => {
        // First fetch the portfolio for the user
        const portfolio = await fetchPortfolio(userId)

        // Then calculate the value of each stock and the total portfolio value
        const stocksWithValue = await Promise.all(
          portfolio.stocks.map(async (stock) => {
            const price = await fetchPrice(stock.ticker)
            const value = price * stock.quantity

            return {
              ticker: stock.ticker,
              quantity: stock.quantity,
              price,
              value
            }
          })
        )

        // Calculate total value
        const totalValue = stocksWithValue.reduce((sum, stock) => sum + stock.value, 0)

        // Return portfolio value information
        return {
          id: portfolio.id,
          userId: portfolio.userId,
          totalValue,
          stocks: stocksWithValue
        }
      }
    })
  })

  it('Should calculate portfolio value using multiple boundaries', async () => {
    // Run the task for user1
    const result = await calculatePortfolioValue.run({ userId: 'user1' })

    // Verify the structure of the result
    expect(result).toHaveProperty('id', 'portfolio1')
    expect(result).toHaveProperty('userId', 'user1')
    expect(result).toHaveProperty('totalValue')
    expect(result).toHaveProperty('stocks')

    // Verify portfolio calculations
    expect(result.stocks).toHaveLength(3)

    // Calculate expected values
    const expectedTotalValue =
      (priceData['AAPL'] * 10) +
      (priceData['MSFT'] * 5) +
      (priceData['GOOGL'] * 8)

    // Verify total value matches expected
    expect(result.totalValue).toBeCloseTo(expectedTotalValue)

    // Verify each stock's value
    const applStock = result.stocks.find((s: { ticker: string }) => s.ticker === 'AAPL')
    expect(applStock).toBeDefined()
    expect(applStock?.price).toBe(priceData['AAPL'])
    expect(applStock?.value).toBeCloseTo(priceData['AAPL'] * 10)

    const msftStock = result.stocks.find((s: { ticker: string }) => s.ticker === 'MSFT')
    expect(msftStock).toBeDefined()
    expect(msftStock?.price).toBe(priceData['MSFT'])
    expect(msftStock?.value).toBeCloseTo(priceData['MSFT'] * 5)

    const googlStock = result.stocks.find((s: { ticker: string }) => s.ticker === 'GOOGL')
    expect(googlStock).toBeDefined()
    expect(googlStock?.price).toBe(priceData['GOOGL'])
    expect(googlStock?.value).toBeCloseTo(priceData['GOOGL'] * 8)
  })

  it('Should replay portfolio calculation from an execution log', async () => {
    // First create a portfolio value calculation execution log
    const executionLog: ExecutionRecord = {
      input: { userId: 'user1' },
      output: {
        id: 'portfolio1',
        userId: 'user1',
        totalValue: 4363.02,
        stocks: [
          { ticker: 'AAPL', quantity: 10, price: 190.50, value: 1905.00 },
          { ticker: 'MSFT', quantity: 5, price: 405.75, value: 2028.75 },
          { ticker: 'GOOGL', quantity: 8, price: 161.16, value: 429.27 }
        ]
      },
      boundaries: {
        fetchPortfolio: [
          {
            input: ['user1'],
            output: {
              id: 'portfolio1',
              userId: 'user1',
              stocks: [
                { ticker: 'AAPL', quantity: 10 },
                { ticker: 'MSFT', quantity: 5 },
                { ticker: 'GOOGL', quantity: 8 }
              ]
            }
          }
        ],
        fetchPrice: [
          {
            input: ['AAPL'],
            output: 190.50
          },
          {
            input: ['MSFT'],
            output: 405.75
          },
          {
            input: ['GOOGL'],
            output: 161.16
          }
        ]
      }
    }

    // Use replay mode for all boundaries
    const [replayResult, replayError, replayLog] = await calculatePortfolioValue.safeReplay(
      executionLog,
      {
        boundaries: {
          fetchPortfolio: 'replay',
          fetchPrice: 'replay'
        }
      }
    )

    // Verify there was no error
    expect(replayError).toBeNull()

    // Verify the replayed result
    expect(replayResult).toHaveProperty('id', 'portfolio1')
    expect(replayResult).toHaveProperty('userId', 'user1')
    expect(replayResult).toHaveProperty('totalValue', 5223.03)
    expect(replayResult).toHaveProperty('stocks')
    expect(replayResult.stocks).toHaveLength(3)

    // Check values match the execution log exactly
    const applStock = replayResult.stocks.find((s: { ticker: string }) => s.ticker === 'AAPL')
    expect(applStock?.price).toBe(190.50)
    expect(applStock?.value).toBe(1905.00)

    // Verify that boundary calls were properly replayed
    expect(replayLog.boundaries.fetchPortfolio).toHaveLength(1)
    expect(replayLog.boundaries.fetchPrice).toHaveLength(3)
  })

  it('Should handle errors during replay', async () => {
    // Create an execution log with an error in one of the price fetches
    const executionLog: ExecutionRecord = {
      input: { userId: 'user1' },
      error: 'Price data not available for ticker: GOOGL',
      boundaries: {
        fetchPortfolio: [
          {
            input: ['user1'],
            output: {
              id: 'portfolio1',
              userId: 'user1',
              stocks: [
                { ticker: 'AAPL', quantity: 10 },
                { ticker: 'MSFT', quantity: 5 },
                { ticker: 'GOOGL', quantity: 8 }
              ]
            }
          }
        ],
        fetchPrice: [
          {
            input: ['AAPL'],
            output: 190.50
          },
          {
            input: ['MSFT'],
            output: 405.75
          },
          {
            input: ['GOOGL'],
            error: 'Price data not available for ticker: GOOGL'
          }
        ]
      }
    }

    // Use replay mode for all boundaries
    const [replayResult, replayError, replayLog] = await calculatePortfolioValue.safeReplay(
      executionLog,
      {
        boundaries: {
          fetchPortfolio: 'replay',
          fetchPrice: 'replay'
        }
      }
    )

    // Verify error was properly replayed
    expect(replayResult).toBeNull()
    expect(replayError).not.toBeNull()
    expect(replayError?.message).toBe('Price data not available for ticker: GOOGL')

    // Verify that boundary calls were properly replayed up to the error
    expect(replayLog.boundaries.fetchPortfolio).toHaveLength(1)
    expect(replayLog.boundaries.fetchPrice).toHaveLength(3)

    // Check the error in the boundary
    const googPriceCall = replayLog.boundaries.fetchPrice.find(
      (call: { input?: unknown[] }) => call.input && call.input[0] === 'GOOGL'
    )
    expect(googPriceCall).toBeDefined()
    expect(googPriceCall?.error).toBe('Price data not available for ticker: GOOGL')
  })

  it('Should support mixed replay with some boundaries in replay mode and others in proxy mode', async () => {
    // Update prices for the test
    priceData['AAPL'] = 195.00 // Different from replay data

    // Create an execution log with historical data
    const executionLog: ExecutionRecord = {
      input: { userId: 'user1' },
      output: {
        id: 'portfolio1',
        userId: 'user1',
        totalValue: 4363.02,
        stocks: [
          { ticker: 'AAPL', quantity: 10, price: 190.50, value: 1905.00 },
          { ticker: 'MSFT', quantity: 5, price: 405.75, value: 2028.75 },
          { ticker: 'GOOGL', quantity: 8, price: 161.16, value: 429.27 }
        ]
      },
      boundaries: {
        fetchPortfolio: [
          {
            input: ['user1'],
            output: {
              id: 'portfolio1',
              userId: 'user1',
              stocks: [
                { ticker: 'AAPL', quantity: 10 },
                { ticker: 'MSFT', quantity: 5 },
                { ticker: 'GOOGL', quantity: 8 }
              ]
            }
          }
        ],
        fetchPrice: [
          {
            input: ['AAPL'],
            output: 190.50
          },
          {
            input: ['MSFT'],
            output: 405.75
          },
          {
            input: ['GOOGL'],
            output: 161.16
          }
        ]
      }
    }

    // Use replay mode for portfolio but proxy mode for prices
    const [replayResult, replayError, replayLog] = await calculatePortfolioValue.safeReplay(
      executionLog,
      {
        boundaries: {
          fetchPortfolio: 'replay', // Use replay for portfolio
          fetchPrice: 'proxy'       // Use proxy (real execution) for prices
        }
      }
    )

    // Verify there was no error
    expect(replayError).toBeNull()

    // The result should reflect the updated AAPL price of 195.00
    expect(replayResult).toHaveProperty('id', 'portfolio1')
    expect(replayResult).toHaveProperty('userId', 'user1')

    // Calculate expected value with current prices
    const expectedValue =
      (priceData['AAPL'] * 10) +   // AAPL: 195.00 * 10
      (priceData['MSFT'] * 5) +    // MSFT: 421.90 * 5
      (priceData['GOOGL'] * 8)    // GOOGL: 171.04 * 8

    expect(replayResult.totalValue).toBeCloseTo(expectedValue)

    // Check AAPL price reflects the current price, not the replay data
    const applStock = replayResult.stocks.find((s: { ticker: string }) => s.ticker === 'AAPL')
    expect(applStock?.price).toBe(195.00)
    expect(applStock?.value).toBeCloseTo(195.00 * 10)

    // Verify the log shows the mixed sources correctly
    expect(replayLog.boundaries.fetchPortfolio).toHaveLength(1)
    expect(replayLog.boundaries.fetchPrice).toHaveLength(3)
  })
})
