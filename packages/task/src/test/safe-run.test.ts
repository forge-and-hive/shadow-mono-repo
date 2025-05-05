import { createTask, Schema } from '../index'

describe('Task safeRun tests', () => {
  it('returns [null, result, boundaryLogs] on successful execution', async () => {
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
    const [error, result, boundaryLogs] = await successTask.safeRun({ value: 5 })

    // Verify success case
    expect(error).toBeNull()
    expect(result).toEqual({ result: 10, success: true })
    expect(boundaryLogs).not.toBeNull()
    expect(boundaryLogs).toHaveProperty('fetchData')
  })

  it('returns [error, null, boundaryLogs] on failed execution', async () => {
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
    const [error, result, boundaryLogs] = await errorTask.safeRun({ value: -5 })

    // Verify error case
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toContain('Value cannot be negative')
    expect(result).toBeNull()
    expect(boundaryLogs).not.toBeNull()
    expect(boundaryLogs).toHaveProperty('fetchData')
  })

  it('returns [error, null, null] on schema validation failure', async () => {
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
    const [error, result, boundaryLogs] = await validationTask.safeRun({ value: 0 })

    // Verify validation error case
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toContain('Value must be positive')
    expect(result).toBeNull()
    expect(boundaryLogs).toBeNull() // No boundary calls were made due to validation failure
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
        output: 20
      })
    )

    // Second call should be for run with value 20
    expect(originalListener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: { value: 20 },
        output: 40
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
    const [error, result, boundaryLogs] = await multiBoundaryTask.safeRun({ values: [1, 2, 3] })

    // Verify success
    expect(error).toBeNull()
    expect(result).toEqual({
      doubled: [2, 4, 6],
      total: 12
    })

    // Verify boundary logs for both boundaries
    expect(boundaryLogs).not.toBeNull()
    expect(boundaryLogs).toHaveProperty('doubleValue')
    expect(boundaryLogs).toHaveProperty('sumValues')

    // Check that doubleValue was called 3 times (once for each input value)
    // @ts-expect-error - we know the boundaryLogs is not null here
    expect(boundaryLogs.doubleValue).toHaveLength(3)

    // Check that sumValues was called once with the doubled values
    // @ts-expect-error - we know the boundaryLogs is not null here
    expect(boundaryLogs.sumValues).toHaveLength(1)
    // @ts-expect-error - we know the boundaryLogs is not null here
    expect(boundaryLogs.sumValues[0].input).toEqual([[2, 4, 6]])
  })
})
