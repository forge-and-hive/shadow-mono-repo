import { createTask, Schema } from '../index'

describe('Task safeRun tests', () => {
  it('returns [null, result, logItem] on successful execution', async () => {
    // Create a simple schema
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries
    const boundaries = {
      fetchData: async (value: number): Promise<number> => {
        return value * 2
      }
    }

    // Create the task
    const successTask = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    )

    // Call safeRun with valid input
    const [error, result, logItem] = await successTask.safeRun({ value: 5 })

    // Verify success case
    expect(error).toBeNull()
    expect(result).toEqual({ result: 10, success: true })
    expect(logItem).not.toBeNull()
    expect(logItem).toHaveProperty('boundaries.fetchData')
    expect(logItem.boundaries.fetchData).toHaveLength(1)

    // useful to check types on logItem
    const data = logItem.boundaries.fetchData[0]
    expect(data.input).toEqual([5])
    expect(data.output).toEqual(10)
    expect(data.error).toBeUndefined()
  })

  it('returns [error, null, logItem] on failed execution', async () => {
    // Create a simple schema
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries with a function that will throw an error
    const boundaries = {
      fetchData: async (value: number): Promise<number> => {
        if (value < 0) {
          throw new Error('Value cannot be negative')
        }
        return value * 2
      }
    }

    // Create the task
    const errorTask = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    )

    // Call safeRun with problematic input that will cause an error
    const [error, result, logItem] = await errorTask.safeRun({ value: -5 })

    // Verify error case
    expect(error).not.toBeNull()
    expect(error?.message).toContain('Value cannot be negative')
    expect(result).toBeNull()
    expect(logItem).not.toBeNull()
    expect(logItem).toHaveProperty('boundaries.fetchData')
    expect(logItem.boundaries.fetchData).toHaveLength(1)

    const data = logItem.boundaries.fetchData[0]
    expect(data.input).toEqual([-5])
    expect(data.error).toContain('Value cannot be negative')
    expect(data.output).toBeUndefined()
  })

  it('returns [error, null, logItem] on schema validation failure', async () => {
    // Create a schema that requires a positive number
    const schema = new Schema({
      value: Schema.number().min(1, 'Value must be positive')
    })

    // Define the boundaries
    const boundaries = {
      fetchData: async (value: number): Promise<number> => {
        return value * 2
      }
    }

    // Create the task
    const validationTask = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    )

    // Call safeRun with invalid input that will fail schema validation
    const [error, result, logItem] = await validationTask.safeRun({ value: 0 })

    // Verify validation error case
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toContain('Value must be positive')
    expect(result).toBeNull()
    expect(logItem).not.toBeNull()
    expect(logItem.input).toEqual({ value: 0 })
    expect(logItem.error).toContain('Value must be positive')
    expect(logItem.boundaries).toEqual({
      fetchData: []
    })
  })

  it('properly calls the listener with safeRun and run', async () => {
    // Create a schema
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries
    const boundaries = {
      fetchData: async (value: number): Promise<number> => {
        return value * 2
      }
    }

    // Create the task
    const listenerTask = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return result
      }
    )

    // Create a mock listener
    const originalListener = jest.fn()
    listenerTask.addListener(originalListener)

    // Call safeRun - this should call the listener once
    await listenerTask.safeRun({ value: 10 })

    // Run the task normally - this should call the listener again through safeRun
    await listenerTask.run({ value: 20 })

    // The original listener should have been called for both runs
    expect(originalListener).toHaveBeenCalledTimes(2)

    // First call should be for safeRun with value 10
    expect(originalListener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        input: { value: 10 },
        output: 20,
        boundaries: {
          fetchData: expect.any(Array)
        }
      })
    )

    // Second call should be for run with value 20
    expect(originalListener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: { value: 20 },
        output: 40,
        boundaries: {
          fetchData: expect.any(Array)
        }
      })
    )
  })

  it('handles multiple boundary calls correctly', async () => {
    // Create a schema
    const schema = new Schema({
      values: Schema.array(Schema.number())
    })

    // Define multiple boundaries
    const boundaries = {
      doubleValue: async (value: number): Promise<number> => {
        return value * 2
      },
      sumValues: async (values: number[]): Promise<number> => {
        return values.reduce((sum, val) => sum + val, 0)
      }
    }

    // Create a task that uses multiple boundaries
    const multiBoundaryTask = createTask(
      schema,
      boundaries,
      async function ({ values }, { doubleValue, sumValues }) {
        const doubled = await Promise.all(values.map(value => doubleValue(value)))
        const total = await sumValues(doubled)
        return { doubled, total }
      }
    )

    // Call safeRun
    const [error, result, logItem] = await multiBoundaryTask.safeRun({ values: [1, 2, 3] })

    // Verify success
    expect(error).toBeNull()
    expect(result).toEqual({
      doubled: [2, 4, 6],
      total: 12
    })

    // Verify logItem structure
    expect(logItem).not.toBeNull()
    expect(logItem).toHaveProperty('boundaries.doubleValue')
    expect(logItem).toHaveProperty('boundaries.sumValues')

    expect(logItem.boundaries.doubleValue).toHaveLength(3)
    expect(logItem.boundaries.sumValues).toHaveLength(1)
    expect(logItem.boundaries.doubleValue[0]).toEqual({ input: [1], output: 2 })
    expect(logItem.boundaries.doubleValue[1]).toEqual({ input: [2], output: 4 })
    expect(logItem.boundaries.doubleValue[2]).toEqual({ input: [3], output: 6 })
    expect(logItem.boundaries.sumValues[0]).toEqual({ input: [[2, 4, 6]], output: 12 })
  })
})
