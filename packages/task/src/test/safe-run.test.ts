import { createTask, Schema, type TaskRecord } from '../index'

interface BoundaryData {
  input: unknown[];
  output?: unknown;
  error?: string;
}

type BoundaryRecord = Record<string, BoundaryData[]>;

describe('Task safeRun tests', () => {
  it('returns [null, result, record] on successful execution', async () => {
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
    const [error, result, record] = await successTask.safeRun({ value: 5 })

    // Verify success case
    expect(error).toBeNull()
    expect(result).toEqual({ result: 10, success: true })
    expect(record).not.toBeNull()
    expect(record).toHaveProperty('fetchData')
    const typedRecord = record as BoundaryRecord
    expect(typedRecord.fetchData).toHaveLength(1)
    expect(typedRecord.fetchData[0]).toEqual({
      input: [5],
      output: 10
    })
  })

  it('returns [error, null, record] on failed execution', async () => {
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
    const [error, result, record] = await errorTask.safeRun({ value: -5 })

    // Verify error case
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toContain('Value cannot be negative')
    expect(result).toBeNull()
    expect(record).not.toBeNull()
    expect(record).toHaveProperty('fetchData')
    const typedRecord = record as BoundaryRecord
    expect(typedRecord.fetchData).toHaveLength(1)
    expect(typedRecord.fetchData[0]).toEqual({
      input: [-5],
      error: 'Value cannot be negative'
    })
  })

  it('returns [error, null, record] on schema validation failure', async () => {
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
    const [error, result, record] = await validationTask.safeRun({ value: 0 })

    // Verify validation error case
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toContain('Value must be positive')
    expect(result).toBeNull()
    expect(record).not.toBeNull()
    const typedRecord = record as unknown as TaskRecord
    expect(typedRecord.input).toEqual({ value: 0 })
    expect(typedRecord.error).toContain('Value must be positive')
    expect(typedRecord.boundaries).toEqual({})
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
    const [error, result, record] = await multiBoundaryTask.safeRun({ values: [1, 2, 3] })

    // Verify success
    expect(error).toBeNull()
    expect(result).toEqual({
      doubled: [2, 4, 6],
      total: 12
    })

    // Verify record structure
    expect(record).not.toBeNull()
    expect(record).toHaveProperty('doubleValue')
    expect(record).toHaveProperty('sumValues')
    const typedRecord = record as BoundaryRecord
    expect(typedRecord.doubleValue).toHaveLength(3)
    expect(typedRecord.sumValues).toHaveLength(1)
    expect(typedRecord.doubleValue[0]).toEqual({ input: [1], output: 2 })
    expect(typedRecord.doubleValue[1]).toEqual({ input: [2], output: 4 })
    expect(typedRecord.doubleValue[2]).toEqual({ input: [3], output: 6 })
    expect(typedRecord.sumValues[0]).toEqual({ input: [[2, 4, 6]], output: 12 })
  })
})
