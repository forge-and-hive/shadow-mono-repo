import { RecordTape } from '../index'
import { createTask, Schema, type ExecutionRecord, type Boundaries, type TaskRecord } from '@forgehive/task'

describe('RecordTape safeRun integration tests', () => {
  it('should record log items directly from safeRun result', async () => {
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
    const task = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    )

    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number; success: boolean }, typeof boundaries>()

    // Run the task with safeRun and directly use the logItem
    const [result, error, record] = await task.safeRun({ value: 5 })
    tape.push('test-task', record)

    // Verify the execution was successful
    expect(error).toBeNull()
    expect(result).toEqual({ result: 10, success: true })

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the log was recorded correctly
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      name: 'test-task',
      type: 'success',
      input: { value: 5 },
      output: { result: 10, success: true },
      boundaries: {
        fetchData: [{
          input: [5],
          output: 10,
          error: null
        }]
      }
    })
  })

  it('should record log items from safeRun successfully', async () => {
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
    const task = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    )

    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number; success: boolean }, typeof boundaries>()

    // Add listener to record the log items
    task.addListener((record: TaskRecord<{ value: number }, { result: number; success: boolean }>) => {
      // Manually ensure boundary records have error field for consistency with safeRun
      if (record.boundaries && record.boundaries.fetchData && Array.isArray(record.boundaries.fetchData)) {
        record.boundaries.fetchData = record.boundaries.fetchData.map((entry: any) => ({
          ...entry,
          error: entry.error ?? null,
          output: entry.output ?? null
        }))
      }

      tape.addLogItem('test-task', record)
    })

    // Run the task with safeRun
    const [result, error, record] = await task.safeRun({ value: 5 })

    // Verify the execution was successful
    expect(error).toBeNull()
    expect(result).toEqual({ result: 10, success: true })

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the log was recorded correctly
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      name: 'test-task',
      type: 'success',
      input: { value: 5 },
      output: { result: 10, success: true },
      boundaries: {
        fetchData: [{
          input: [5],
          output: 10,
          error: null
        }]
      }
    })
  })

  it('should record error log items from safeRun', async () => {
    // Create a schema
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
    const task = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    )

    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number; success: boolean }, typeof boundaries>()

    // Add listener to record the log items
    task.addListener((record: TaskRecord<{ value: number }, { result: number; success: boolean }>) => {
      // Manually ensure boundary records have error field for consistency with safeRun
      if (record.boundaries && record.boundaries.fetchData && Array.isArray(record.boundaries.fetchData)) {
        record.boundaries.fetchData = record.boundaries.fetchData.map((entry: any) => ({
          ...entry,
          error: entry.error ?? null,
          output: entry.output ?? null
        }))
      }

      tape.addLogItem('test-task', record)
    })

    // Run the task with safeRun with a value that will cause an error
    const [result, error, record] = await task.safeRun({ value: -5 })

    // Verify the execution failed as expected
    expect(result).toBeNull()
    expect(error).not.toBeNull()
    expect(error?.message).toContain('Value cannot be negative')

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the error log was recorded correctly
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      name: 'test-task',
      type: 'error',
      input: { value: -5 },
      error: 'Value cannot be negative',
      boundaries: {
        fetchData: [{
          input: [-5],
          output: null,
          error: 'Value cannot be negative'
        }]
      }
    })
  })

  it('should handle error records directly with push', async () => {
    // Create a schema
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
    const task = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    )

    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number; success: boolean }, typeof boundaries>()

    // Run the task with safeRun with a value that will cause an error
    const [result, error, record] = await task.safeRun({ value: -5 })

    // Push the error record directly
    tape.push('test-error', record)

    // Verify the execution failed as expected
    expect(result).toBeNull()
    expect(error).not.toBeNull()
    expect(error instanceof Error).toBe(true)
    if (error instanceof Error) {
      expect(error.message).toContain('Value cannot be negative')
    }

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the error log was recorded correctly
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      name: 'test-error',
      type: 'error',
      input: { value: -5 },
      error: 'Value cannot be negative',
      boundaries: {
        fetchData: [{
          input: [-5],
          output: null,
          error: 'Value cannot be negative'
        }]
      }
    })
  })

  it('should handle custom execution records with push', async () => {
    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number }, { fetchData: (n: number) => Promise<number> }>()

    // Create a custom execution record
    const customRecord: ExecutionRecord<{ value: number }, { result: number }, { fetchData: (n: number) => Promise<number> }> = {
      input: { value: 10 },
      output: { result: 20 },
      boundaries: {
        fetchData: [
          {
            input: [10],
            output: 20,
            error: null
          }
        ]
      }
    }

    // Push the custom record
    tape.push('custom-record', customRecord)

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the log was recorded correctly
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      name: 'custom-record',
      type: 'success',
      input: { value: 10 },
      output: { result: 20 },
      boundaries: {
        fetchData: [{
          input: [10],
          output: 20,
          error: null
        }]
      }
    })
  })

  it('should handle execution records with Promise outputs correctly', async () => {
    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number }, { fetchData: (n: number) => Promise<number> }>()

    // Create a custom execution record with a Promise output
    const promiseResult = Promise.resolve({ result: 30 });
    const promiseRecord: ExecutionRecord<{ value: number }, Promise<{ result: number }>, { fetchData: (n: number) => Promise<number> }> = {
      input: { value: 15 },
      output: promiseResult,
      boundaries: {
        fetchData: [
          {
            input: [15],
            output: 30,
            error: null
          }
        ]
      }
    }

    // Push the record with Promise output
    tape.push('promise-record', promiseRecord)

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the log was recorded correctly, with Promise output set to null
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      name: 'promise-record',
      type: 'success',
      input: { value: 15 },
      output: null, // Promise output should be set to null
      boundaries: {
        fetchData: [{
          input: [15],
          output: 30,
          error: null
        }]
      }
    })
  })
})