import { Task, createTask, Schema } from '../index'

describe('Task.listenExecutionRecords', () => {
  let mockListener: jest.Mock
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    mockListener = jest.fn()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    // Clear any existing global listener
    Task.globalListener = undefined
  })

  afterEach(() => {
    // Clean up global listener after each test
    Task.globalListener = undefined
    consoleErrorSpy.mockRestore()
  })

  describe('static listenExecutionRecords method', () => {
    it('should set global listener', () => {
      Task.listenExecutionRecords(mockListener)
      expect(Task.globalListener).toBe(mockListener)
    })

    it('should replace existing global listener', () => {
      const firstListener = jest.fn()
      const secondListener = jest.fn()

      Task.listenExecutionRecords(firstListener)
      expect(Task.globalListener).toBe(firstListener)

      Task.listenExecutionRecords(secondListener)
      expect(Task.globalListener).toBe(secondListener)
    })
  })

  describe('global listener execution', () => {
    it('should call global listener when task is executed via safeRun', async () => {
      Task.listenExecutionRecords(mockListener)

      const schema = new Schema({
        value: Schema.number()
      })

      const testTask = createTask({
        schema,
        boundaries: {},
        fn: async (input: { value: number }) => ({ result: input.value * 2 })
      })

      await testTask.safeRun({ value: 5 })

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { value: 5 },
          output: { result: 10 },
          type: 'success'
        })
      )
    })

    it('should call global listener when task is executed via run', async () => {
      Task.listenExecutionRecords(mockListener)

      const schema = new Schema({
        value: Schema.number()
      })

      const testTask = createTask({
        schema,
        boundaries: {},
        fn: async (input: { value: number }) => ({ result: input.value * 2 })
      })

      await testTask.run({ value: 3 })

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { value: 3 },
          output: { result: 6 },
          type: 'success'
        })
      )
    })

    it('should call global listener when task fails', async () => {
      Task.listenExecutionRecords(mockListener)

      const schema = new Schema({})

      const errorTask = createTask({
        schema,
        boundaries: {},
        fn: async () => {
          throw new Error('Test error')
        }
      })

      await errorTask.safeRun({})

      expect(mockListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {},
          error: 'Test error',
          type: 'error'
        })
      )
    })

    it('should call both instance and global listeners', async () => {
      const instanceListener = jest.fn()
      Task.listenExecutionRecords(mockListener)

      const schema = new Schema({
        value: Schema.number()
      })

      const testTask = createTask({
        schema,
        boundaries: {},
        fn: async (input: { value: number }) => ({ result: input.value * 2 })
      })

      testTask.addListener(instanceListener)
      await testTask.safeRun({ value: 7 })

      expect(instanceListener).toHaveBeenCalledTimes(1)
      expect(mockListener).toHaveBeenCalledTimes(1)

      const expectedRecord = expect.objectContaining({
        input: { value: 7 },
        output: { result: 14 },
        type: 'success'
      })

      expect(instanceListener).toHaveBeenCalledWith(expectedRecord)
      expect(mockListener).toHaveBeenCalledWith(expectedRecord)
    })

    it('should work when no global listener is set', async () => {
      // No global listener set
      const schema = new Schema({
        value: Schema.number()
      })

      const testTask = createTask({
        schema,
        boundaries: {},
        fn: async (input: { value: number }) => ({ result: input.value * 2 })
      })

      // Should not throw error
      await expect(testTask.safeRun({ value: 1 })).resolves.toBeDefined()
    })
  })

  describe('async listener support', () => {
    it('should support async global listeners', async () => {
      const asyncListener = jest.fn().mockImplementation(async (_record) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return Promise.resolve()
      })

      Task.listenExecutionRecords(asyncListener)

      const schema = new Schema({
        value: Schema.number()
      })

      const testTask = createTask({
        schema,
        boundaries: {},
        fn: async (input: { value: number }) => ({ result: input.value * 2 })
      })

      await testTask.safeRun({ value: 4 })

      expect(asyncListener).toHaveBeenCalledTimes(1)
      expect(asyncListener).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { value: 4 },
          output: { result: 8 },
          type: 'success'
        })
      )
    })

    it('should timeout async listeners after 5 seconds', async () => {
      const slowListener = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 6000)) // 6 seconds
      })

      Task.listenExecutionRecords(slowListener)

      const schema = new Schema({
        value: Schema.number()
      })

      const testTask = createTask({
        schema,
        boundaries: {},
        fn: async (input: { value: number }) => ({ result: input.value * 2 })
      })

      await testTask.safeRun({ value: 1 })

      // Wait a bit for the timeout to occur and be logged
      await new Promise(resolve => setTimeout(resolve, 5100))

      expect(slowListener).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ExecutionRecord listener error:',
        expect.any(Error)
      )
    }, 7000) // Increase test timeout to allow for the 5 second timeout + buffer
  })

  describe('error handling', () => {
    it('should catch and log listener errors without affecting task execution', async () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })

      Task.listenExecutionRecords(errorListener)

      const schema = new Schema({
        value: Schema.number()
      })

      const testTask = createTask({
        schema,
        boundaries: {},
        fn: async (input: { value: number }) => ({ result: input.value * 2 })
      })

      const [result, error] = await testTask.safeRun({ value: 5 })

      // Task should complete successfully despite listener error
      expect(result).toEqual({ result: 10 })
      expect(error).toBeNull()

      // Listener should have been called
      expect(errorListener).toHaveBeenCalledTimes(1)

      // Error should have been logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ExecutionRecord listener error:',
        expect.any(Error)
      )
    })

    it('should catch and log async listener errors', async () => {
      const asyncErrorListener = jest.fn().mockImplementation(async () => {
        throw new Error('Async listener error')
      })

      Task.listenExecutionRecords(asyncErrorListener)

      const schema = new Schema({
        value: Schema.number()
      })

      const testTask = createTask({
        schema,
        boundaries: {},
        fn: async (input: { value: number }) => ({ result: input.value * 2 })
      })

      const [result, error] = await testTask.safeRun({ value: 3 })

      // Wait a bit for the async error to be logged
      await new Promise(resolve => setTimeout(resolve, 50))

      // Task should complete successfully
      expect(result).toEqual({ result: 6 })
      expect(error).toBeNull()

      // Error should have been logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ExecutionRecord listener error:',
        expect.any(Error)
      )
    })
  })
})
