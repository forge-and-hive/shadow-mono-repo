import { type ExecutionRecord, createTask, Schema } from '../index'

describe('Listener with boundaries', () => {
  it('Should add a listener to the task and capture boundaries', async () => {
    const tape: ExecutionRecord[] = []
    const task = createTask({
      name: 'test',
      schema: new Schema({
        value: Schema.number()
      }),
      boundaries: {
        getTen: async () => {
          return 10
        }
      },
      fn: async (argv, boundaries) => {
        const ten = await boundaries.getTen()
        return { value: argv.value, foo: ten > 5 }
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })
    expect(tape).toEqual([{
      input: { value: 5 },
      output: { value: 5, foo: true },
      boundaries: {
        getTen: [{
          input: [],
          output: 10,
          timing: expect.objectContaining({
            startTime: expect.any(Number),
            endTime: expect.any(Number),
            duration: expect.any(Number)
          })
        }]
      },
      taskName: 'test',
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'success'
    }])
  })

  it('Should add a listener to the task and capture boundaries with error', async () => {
    const tape: ExecutionRecord[] = []
    const task = createTask({
      name: 'test',
      schema: new Schema({
        value: Schema.number()
      }),
      boundaries: {
        getTen: async () => {
          throw new Error('Network error')
        }
      },
      fn: async (argv, boundaries) => {
        const ten = await boundaries.getTen()
        return { value: argv.value, foo: ten > 5 }
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    try {
      await task.run({ value: 5 })
    } catch (error) {
      // Expected error
    }

    expect(tape).toEqual([{
      input: { value: 5 },
      error: 'Network error',
      boundaries: {
        getTen: [{
          input: [],
          error: 'Network error',
          timing: expect.objectContaining({
            startTime: expect.any(Number),
            endTime: expect.any(Number),
            duration: expect.any(Number)
          })
        }]
      },
      taskName: 'test',
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'error'
    }])
  })

  it('Should add a listener to the task and capture boundaries with dynamic parameters', async () => {
    const tape: ExecutionRecord[] = []
    const task = createTask({
      name: 'test',
      schema: new Schema({}),
      boundaries: {
        addNumbers: async (a: number, b: number) => {
          return a + b
        }
      },
      fn: async (argv, boundaries) => {
        const sum = await boundaries.addNumbers(3, 7)
        return { value: sum, foo: sum > 5 }
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({})
    expect(tape).toEqual([{
      input: {},
      output: { value: 10, foo: true },
      boundaries: {
        addNumbers: [{
          input: [3, 7],
          output: 10,
          timing: expect.objectContaining({
            startTime: expect.any(Number),
            endTime: expect.any(Number),
            duration: expect.any(Number)
          })
        }]
      },
      taskName: 'test',
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'success'
    }])
  })

  it('Should add a listener to the task and capture boundaries with optional parameters', async () => {
    const tape: ExecutionRecord[] = []
    const task = createTask({
      name: 'test',
      schema: new Schema({
        value: Schema.number().optional()
      }),
      boundaries: {
        processValue: async (val?: number) => {
          return val || 0
        }
      },
      fn: async (argv, boundaries) => {
        const processed = await boundaries.processValue(argv.value)
        return { value: processed, foo: processed > 5 }
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: undefined })
    expect(tape).toEqual([{
      input: { value: undefined },
      output: { value: 0, foo: false },
      boundaries: {
        processValue: [{
          input: [undefined],
          output: 0,
          timing: expect.objectContaining({
            startTime: expect.any(Number),
            endTime: expect.any(Number),
            duration: expect.any(Number)
          })
        }]
      },
      taskName: 'test',
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'success'
    }])
  })

  it('Should add a listener to the task and capture boundaries with multiple calls', async () => {
    const tape: ExecutionRecord[] = []
    const task = createTask({
      name: 'test',
      schema: new Schema({
        value: Schema.number()
      }),
      boundaries: {
        multiplyByTwo: async (num: number) => {
          return num * 2
        }
      },
      fn: async (argv, boundaries) => {
        const doubled = await boundaries.multiplyByTwo(argv.value)
        const quadrupled = await boundaries.multiplyByTwo(doubled)
        return { foo: quadrupled > 10 }
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: 3 })
    expect(tape).toEqual([{
      input: { value: 3 },
      output: { foo: true },
      boundaries: {
        multiplyByTwo: [
          {
            input: [3],
            output: 6,
            timing: expect.objectContaining({
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              duration: expect.any(Number)
            })
          },
          {
            input: [6],
            output: 12,
            timing: expect.objectContaining({
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              duration: expect.any(Number)
            })
          }
        ]
      },
      taskName: 'test',
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'success'
    }])
  })

  it('Should add a listener to the task and capture boundaries with mixed results', async () => {
    const tape: ExecutionRecord[] = []
    const task = createTask({
      name: 'test',
      schema: new Schema({
        value: Schema.number()
      }),
      boundaries: {
        getResult: async (num: number) => {
          if (num > 5) {
            return num * 2
          }
          throw new Error('Number too small')
        }
      },
      fn: async (argv, boundaries) => {
        let result = 0
        try {
          result = await boundaries.getResult(argv.value)
        } catch (error) {
          // Continue with default
        }
        return result
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: 3 })
    expect(tape).toEqual([{
      input: { value: 3 },
      output: 0,
      boundaries: {
        getResult: [{
          input: [3],
          error: 'Number too small',
          timing: expect.objectContaining({
            startTime: expect.any(Number),
            endTime: expect.any(Number),
            duration: expect.any(Number)
          })
        }]
      },
      taskName: 'test',
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'success'
    }])
  })
})
