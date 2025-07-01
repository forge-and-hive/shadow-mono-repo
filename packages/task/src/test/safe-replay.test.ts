import { Schema } from '@forgehive/schema'
import { createTask, ExecutionRecord } from '../index'

describe('safeReplay functionality tests', () => {
  // Common variables
  let prices: Record<string, number>
  let boundaries: {
    fetchData: (ticker: string) => Promise<number>
  }

  // ToDo: Add correct type for schema and getTickerPrice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schema: Schema<Record<string, any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getTickerPrice: any // Using any temporarily until we implement safeReplay

  beforeEach(() => {
    // Create a schema for the task
    schema = new Schema({
      ticker: Schema.string()
    })

    // Mock price data
    prices = {
      'AAPL': 150.23
    }

    // Define the boundaries
    boundaries = {
      fetchData: async (ticker: string): Promise<number> => {
        // check if the ticker is in the prices object
        if (!prices[ticker as keyof typeof prices]) {
          throw new Error(`Ticker ${ticker} not found in prices`)
        }

        return prices[ticker as keyof typeof prices]
      }
    }

    // Create the task using createTask
    getTickerPrice = createTask({
      name: 'getTickerPrice',
      schema,
      boundaries,
      fn: async ({ ticker }, { fetchData }) => {
        const price = await fetchData(ticker)
        return {
          ticker,
          price
        }
      }
    })
  })

  it('Should replay a previous execution using the execution log and replay the fetchData boundary', async () => {
    // Create a manual execution log
    const executionLog: ExecutionRecord = {
      input: { ticker: 'AAPL' },
      output: {
        ticker: 'AAPL',
        price: 160.23
      },
      boundaries: {
        fetchData: [
          {
            input: ['AAPL'],
            output: 160.23
          }
        ]
      }
    }

    // No safeReplay method yet, this will be implemented later
    // This will be our test for that functionality
    const [replayResult, replayError, replayLog] = await getTickerPrice.safeReplay(
      executionLog
    )

    // Verify the replay execution
    expect(replayError).toBeNull()
    expect(replayResult).toMatchObject({
      ticker: 'AAPL',
      price: 150.23
    })

    expect(replayLog).toMatchObject({
      input: { ticker: 'AAPL' },
      output: {
        ticker: 'AAPL',
        price: 150.23
      },
      boundaries: {
        fetchData: [
          {
            input: ['AAPL'],
            output: 150.23,
          }
        ]
      }
    })
  })

  it('Should execute with mixed boundaries modes', async () => {
    // Create a manual execution log for testing
    const executionLog: ExecutionRecord = {
      input: { ticker: 'AAPL' },
      output: {
        ticker: 'AAPL',
        price: 160.23
      },
      boundaries: {
        fetchData: [
          {
            input: ['AAPL'],
            output: 160.23
          }
        ]
      }
    }

    // Use mixed mode - replay for fetchData but execute logAccess
    const [replayResult, replayError, replayLog] = await getTickerPrice.safeReplay(
      executionLog,
      {
        boundaries: {
          fetchData: 'replay',
        }
      }
    )

    // Verify the replay execution
    expect(replayError).toBeNull()
    expect(replayResult).toMatchObject({
      ticker: 'AAPL',
      price: 160.23
    })

    expect(replayLog).toMatchObject({
      input: { ticker: 'AAPL' },
      output: {
        ticker: 'AAPL',
        price: 160.23
      },
      boundaries: {
        fetchData: [
          {
            input: ['AAPL'],
            output: 160.23
          }
        ]
      }
    })
  })

  it('Should properly handle errors in boundary replay mode', async () => {
    // Create a manual execution log with an error in the boundary
    const executionLog: ExecutionRecord = {
      input: { ticker: 'AAPL' },
      output: null,
      error: 'API error: Rate limit exceeded',
      boundaries: {
        fetchData: [
          {
            input: ['AAPL'],
            error: 'API error: Rate limit exceeded'
          }
        ]
      }
    }

    // Use replay mode for fetchData
    const [replayResult, replayError, replayLog] = await getTickerPrice.safeReplay(
      executionLog,
      {
        boundaries: {
          fetchData: 'replay',
        }
      }
    )

    // Verify the replay execution - should have an error
    expect(replayResult).toBeNull()
    expect(replayError).not.toBeNull()
    expect(replayError?.message).toBe('API error: Rate limit exceeded')

    // The log should contain the error from the boundary
    expect(replayLog.error).toBeDefined()
    expect(replayLog.boundaries.fetchData[0].error).toBe('API error: Rate limit exceeded')
  })

  it('Should handle boundaries with both output and error as null', async () => {
    // Create a manual execution log with null output and error in the boundary
    const executionLog: ExecutionRecord = {
      input: { ticker: 'AAPL' },
      output: { ticker: 'AAPL', price: 160.23 },
      boundaries: {
        fetchData: [
          {
            input: ['AAPL'],
            output: 160.23,
            error: null
          }
        ]
      }
    }

    // Use replay mode for fetchData
    const [replayResult, replayError, replayLog] = await getTickerPrice.safeReplay(
      executionLog,
      {
        boundaries: {
          fetchData: 'replay',
        }
      }
    )

    // Verify the replay execution
    expect(replayError).toBeNull()
    expect(replayResult).toMatchObject({
      ticker: 'AAPL',
      price: 160.23
    })

    // The log should contain the output from the boundary
    expect(replayLog.output).toMatchObject({
      ticker: 'AAPL',
      price: 160.23
    })
    expect(replayLog.boundaries.fetchData[0].output).toBe(160.23)
    expect(replayLog.boundaries.fetchData[0].error).toBeNull()
  })
})
