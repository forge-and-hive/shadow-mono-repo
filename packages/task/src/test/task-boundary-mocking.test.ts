import { createTask, Schema } from '../index'
import { createMockBoundary } from '../utils/mock'

describe('Task boundary mocking', () => {
  it('can mock specific boundaries for testing', async () => {
    // Create a schema for the task
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries
    const boundaries = {
      fetchExternalData: async (int: number): Promise<number> => {
        // This would normally fetch data from an external source
        return int * 2
      }
    }

    // Create the task using createTask
    const multiplyTask = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchExternalData }) {
        const result = value * await fetchExternalData(value)
        return result
      }
    )

    // Create mock for fetchExternalData boundary that returns a specific value
    const mockFetchData = jest.fn().mockResolvedValue(5)
    const wrappedMockFetchData = createMockBoundary(mockFetchData)

    // Mock only the fetchExternalData boundary, leaving logData boundary as is
    multiplyTask.mockBoundary('fetchExternalData', wrappedMockFetchData)

    // Run the task with mocked boundary
    const result = await multiplyTask.run({ value: 3 })

    // Verify the correct result was returned
    // Since fetchExternalData is mocked to always return 5, result should be 3 * 5 = 15
    expect(result).toBe(15)

    // Verify the mock was called with correct arguments
    expect(mockFetchData).toHaveBeenCalledWith(3)
    expect(mockFetchData).toHaveBeenCalledTimes(1)

    // Reset the mocks
    multiplyTask.resetMocks()

    // Run the task again, now with original boundaries
    const result2 = await multiplyTask.run({ value: 3 })

    // With original boundaries, result should be 3 * (3 * 2) = 18
    expect(result2).toBe(18)
  })

  it('can mock multiple boundaries at once', async () => {
    // Create a schema for the task
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries
    const boundaries = {
      doubleValue: async (int: number): Promise<number> => {
        return int * 2
      },
      tripleValue: async (int: number): Promise<number> => {
        return int * 3
      }
    }

    // Create the task
    const calculateTask = createTask(
      schema,
      boundaries,
      async function ({ value }, { doubleValue, tripleValue }) {
        const doubled = await doubleValue(value)
        const tripled = await tripleValue(value)
        return doubled + tripled
      }
    )

    // Create wrapped mock functions
    const mockDoubleValue = jest.fn().mockResolvedValue(10)
    const mockTripleValue = jest.fn().mockResolvedValue(20)

    // Mock both boundaries
    calculateTask.mockBoundary('doubleValue', createMockBoundary(mockDoubleValue))
    calculateTask.mockBoundary('tripleValue', createMockBoundary(mockTripleValue))

    // Run the task with both mocked boundaries
    const result = await calculateTask.run({ value: 5 })

    // Result should be 10 + 20 = 30
    expect(result).toBe(30)

    // Reset only the doubleValue mock
    calculateTask.resetMock('doubleValue')

    // Run the task with only tripleValue mocked
    const result2 = await calculateTask.run({ value: 5 })

    // Result should be (5 * 2) + 20 = 30
    expect(result2).toBe(30)

    // Reset all mocks
    calculateTask.resetMocks()

    // Run the task with original boundaries
    const result3 = await calculateTask.run({ value: 5 })

    // Result should be (5 * 2) + (5 * 3) = 25
    expect(result3).toBe(25)
  })
})
