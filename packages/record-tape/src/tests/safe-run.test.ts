import { RecordTape } from '../index'
import { createTask, Schema, type ExecutionRecord, type TaskRecord } from '@forgehive/task'

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
    const task = createTask({
      schema,
      boundaries,
      fn: async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    })

    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number; success: boolean }, typeof boundaries>()

    // Run the task with safeRun
    const [, , record] = await task.safeRun({ value: 5 })

    // Add task name and push to tape
    record.taskName = 'test-task'
    tape.push(record)

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the log contains one item
    expect(recordedLog).toHaveLength(1)

    const logItem = recordedLog[0]
    expect(logItem.taskName).toEqual('test-task')
    expect(logItem.type).toEqual('success')
    expect(logItem.input).toEqual({ value: 5 })
    expect(logItem.output).toEqual({ result: 10, success: true })
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
    const task = createTask({
      schema,
      boundaries,
      fn: async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    })

    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number; success: boolean }, typeof boundaries>()

    // Add listener to record the log items
    task.addListener((record: TaskRecord<{ value: number }, { result: number; success: boolean }>) => {
      // Add the record using push method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordWithTaskName = { ...record, taskName: 'test-task' } as any
      tape.push(recordWithTaskName)
    })

    // Run the task with safeRun
    const [result, error] = await task.safeRun({ value: 5 })

    // Verify the execution was successful
    expect(result).not.toBeNull()
    expect(error).toBeNull()

    if (result) {
      expect(result).toEqual({ result: 10, success: true })
    }

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the log was recorded correctly
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      type: 'success',
      input: { value: 5 },
      output: { result: 10, success: true },
      boundaries: {
        fetchData: [{
          input: [5],
          output: 10
        }]
      },
      metadata: {},
      taskName: 'test-task'
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
    const task = createTask({
      schema,
      boundaries,
      fn: async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    })

    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number; success: boolean }, typeof boundaries>()

    // Add listener to record the log items
    task.addListener((record: TaskRecord<{ value: number }, { result: number; success: boolean }>) => {
      // Add the record using push method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordWithTaskName = { ...record, taskName: 'test-task' } as any
      tape.push(recordWithTaskName)
    })

    // Run the task with safeRun with a value that will cause an error
    const [result, error] = await task.safeRun({ value: -5 })

    // Verify the execution failed as expected
    expect(result).toBeNull()
    expect(error).not.toBeNull()
    expect(error?.message).toContain('Value cannot be negative')

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the error log was recorded correctly
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      type: 'error',
      input: { value: -5 },
      error: 'Value cannot be negative',
      boundaries: {
        fetchData: [{
          input: [-5],
          error: 'Value cannot be negative'
        }]
      },
      metadata: {},
      taskName: 'test-task'
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
    const task = createTask({
      schema,
      boundaries,
      fn: async function ({ value }, { fetchData }) {
        const result = await fetchData(value)
        return { result, success: true }
      }
    })

    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number; success: boolean }, typeof boundaries>()

    // Run the task with safeRun with a value that will cause an error
    const [result, error, record] = await task.safeRun({ value: -5 })
    record.taskName = 'test-error'
    tape.push(record)

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
      type: 'error',
      input: { value: -5 },
      error: 'Value cannot be negative',
      boundaries: {
        fetchData: [{
          input: [-5],
          error: 'Value cannot be negative'
        }]
      },
      metadata: {},
      taskName: 'test-error'
    })
  })

  it('should handle custom execution records with push', async () => {
    // Create a record tape
    const tape = new RecordTape<{ value: number }, { result: number }, { fetchData: (n: number) => Promise<number> }>()

    // Create a custom execution record
    const customRecord: ExecutionRecord<{ value: number }, { result: number }, { fetchData: (n: number) => Promise<number> }> = {
      input: { value: 10 },
      output: { result: 20 },
      type: 'success',
      boundaries: {
        fetchData: [
          {
            input: [10],
            output: 20
          }
        ]
      }
    }

    // Push the custom record to the tape with custom metadata
    customRecord.taskName = 'custom-record'
    tape.push(customRecord)

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the log was recorded correctly
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      type: 'success',
      input: { value: 10 },
      output: { result: 20 },
      boundaries: {
        fetchData: [{
          input: [10],
          output: 20
        }]
      },
      metadata: {},
      taskName: 'custom-record'
    })
  })

  it('should handle execution records with Promise outputs correctly', async () => {
    // Create a record tape that accepts Promise outputs
    const tape = new RecordTape<{ value: number }, Promise<{ result: number }>, { fetchData: (n: number) => Promise<number> }>()

    // Create a custom execution record with a Promise output
    const customRecord: ExecutionRecord<{ value: number }, Promise<{ result: number }>, { fetchData: (n: number) => Promise<number> }> = {
      input: { value: 15 },
      output: Promise.resolve({ result: 30 }),
      type: 'success',
      boundaries: {
        fetchData: [
          {
            input: [15],
            output: 30
          }
        ]
      }
    }

    // Push the custom record to the tape
    customRecord.taskName = 'promise-record'
    tape.push(customRecord)

    // Get the recorded log from the tape
    const recordedLog = tape.getLog()

    // Verify the log was recorded correctly, with Promise output preserved
    expect(recordedLog).toHaveLength(1)
    expect(recordedLog[0]).toEqual({
      type: 'success',
      input: { value: 15 },
      output: Promise.resolve({ result: 30 }),
      boundaries: {
        fetchData: [{
          input: [15],
          output: 30
        }]
      },
      metadata: {},
      taskName: 'promise-record'
    })
  })
})
