import { Schema } from '@forgehive/schema'
import { createTask, ExecutionRecord } from '../index'

describe('safeReplay functionality tests', () => {
  // Common variables
  let schema: Schema<Record<string, any>>
  let prices: Record<string, number>
  let boundaries: {
    fetchData: (ticker: string) => Promise<number>
  }
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
    getTickerPrice = createTask(
      schema,
      boundaries,
      async ({ ticker }, { fetchData }) => {
        const price = await fetchData(ticker)
        return {
          ticker,
          price
        }
      }
    )
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
            output: 160.23,
            error: null
          }
        ]
      }
    }

    // No safeReplay method yet, this will be implemented later
    // This will be our test for that functionality
    const [replayResult, replayError, replayLog] = await getTickerPrice.safeReplay(
      executionLog
    )

    console.log('============')
    console.log('replayResult', replayResult)
    console.log('replayError', replayError)
    console.log('replayLog', replayLog)
    console.log('============')

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
            error: null
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
            output: 160.23,
            error: null
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

    console.log('============')
    console.log('replayResult', replayResult)
    console.log('replayError', replayError)
    console.log('replayLog', replayLog)
    console.log('============')

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
            output: 160.23,
            error: null
          }
        ]
      }
    })
  })
})