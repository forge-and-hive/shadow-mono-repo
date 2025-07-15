import { createTask, Schema, ExecutionRecord, BoundaryTapeData } from '../index'

// Need to add proxy cache mode to the boundaries
describe('Boundaries tasks tests', () => {
  it('Indentity + boundaries test', async () => {
    // Create a schema for the task
    const schema = new Schema({})

    // Define the boundaries
    const boundaries = {
      fetchExternalData: async (): Promise<{ foo: boolean }> => {
        return { foo: false }
      }
    }

    // Create the task using createTask
    const indentity = createTask({
      name: 'indentity',
      schema,
      boundaries,
      fn: async (argv, boundaries) => {
        const externalData = await boundaries.fetchExternalData()
        return { ...externalData, ...argv }
      }
    })

    const object = await indentity.run({ bar: true })
    const { foo } = await indentity.run({ foo: true })

    expect(object).toEqual({ bar: true, foo: false })
    expect(foo).toBe(true)
  })

  it('Indentity test with tape data', async () => {
    // Create a schema for the task
    const schema = new Schema({})

    // Define the boundaries
    const boundaries = {
      fetchExternalData: async (): Promise<{ foo: boolean }> => {
        // Return an empty implementation, the actual data will come from boundariesData
        return { foo: false }
      }
    }

    // Create the task using createTask with boundariesData
    const indentity = createTask({
      name: 'indentity',
      schema,
      boundaries,
      fn: async (argv, boundaries) => {
        const externalData = await boundaries.fetchExternalData()
        return { ...externalData, ...argv }
      },
      boundariesData: {
        fetchExternalData: [
          {
            input: [],
            output: { foo: false },
            timing: {
              startTime: 1000,
              endTime: 1100,
              duration: 100
            }
          }
        ]
      },
      mode: 'proxy-pass'
    })

    const object = await indentity.run({ bar: true })
    const { foo } = await indentity.run({ foo: true })

    expect(object).toEqual({ bar: true, foo: false })
    expect(foo).toBe(true)
  })

  it('Add task with boundaries test', async () => {
    // Create a schema for the task that accepts a number
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries
    const boundaries = {
      fetchExternalData: async (int: number): Promise<number> => {
        return int * 2
      }
    }

    // Create the task using createTask
    const add = createTask({
      name: 'add',
      schema,
      boundaries,
      fn: async function (argv, boundaries) {
        const externalData: number = await boundaries.fetchExternalData(1)
        return argv.value + externalData
      }
    })

    const six = await add.run({ value: 4 })
    const seven = await add.run({ value: 5 })

    expect(six).toBe(6)
    expect(seven).toBe(7)
  })

  it('Add task + boundaries + tape test', async () => {
    // Create a schema for the task that accepts a number
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries
    const boundaries = {
      fetchExternalData: async (int: number): Promise<number> => {
        return int * 2
      }
    }

    // Create the task using createTask with boundariesData
    const add = createTask({
      name: 'add',
      schema,
      boundaries,
      fn: async function (argv, boundaries) {
        const externalData: number = await boundaries.fetchExternalData(argv.value)
        return argv.value + externalData
      },
      boundariesData: {
        fetchExternalData: [
          {
            input: [4],
            output: 2,
            timing: {
              startTime: 1000,
              endTime: 1100,
              duration: 100
            }
          }
        ]
      },
      mode: 'proxy-pass'
    })

    const six = await add.run({ value: 4 }) // From tape data
    const fifteen = await add.run({ value: 5 })

    expect(six).toBe(6)
    expect(fifteen).toBe(15)
  })

  it('Multiple parallel task runs with boundaries', async () => {
    // Define a type for the boundary data structure we expect
    type BoundaryData = {
      input: unknown[];
      output?: unknown;
      timing?: {
        startTime: number;
        endTime: number;
        duration: number;
      };
    };

    // Define a type for the record boundaries
    interface RecordBoundaries {
      fetchExternalData: BoundaryData[];
    }

    // Use the correct type definition for records
    const records: ExecutionRecord[] = []

    // Create a schema for the task that accepts a number
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries with a function that returns different values based on input
    const boundaries = {
      fetchExternalData: async (int: number): Promise<number> => {
        return int * 2
      }
    }

    // Create the task using createTask
    const multiplyTask = createTask({
      name: 'multiplyTask',
      schema,
      boundaries,
      fn: async function ({ value }, { fetchExternalData}) {
        const externalData: number = await fetchExternalData(value)
        return value * externalData
      }
    })

    multiplyTask.addListener((record) => {
      records.push(record)
    })

    // Run multiple tasks in parallel
    const results = await Promise.all([
      multiplyTask.run({ value: 2 }),
      multiplyTask.run({ value: 3 }),
      multiplyTask.run({ value: 4 })
    ])

    // Check the results
    expect(results).toEqual([8, 18, 32])

    // Test records array
    // Should have exactly 3 elements (one for each task run)
    expect(records.length).toBe(3)

    // Sort records by input value for consistent testing
    const sortedRecords = [...records].sort((a, b) => (a.input as {value: number}).value - (b.input as {value: number}).value)

    // Check record for first task (value: 2)
    expect(sortedRecords[0].input).toEqual({ value: 2 })
    expect(sortedRecords[0].output).toBe(8)

    // Use type assertion to access the boundary data safely
    const boundaries0 = sortedRecords[0].boundaries as unknown as RecordBoundaries
    expect(boundaries0.fetchExternalData).toHaveLength(1)
    expect(boundaries0.fetchExternalData[0].input).toEqual([2])
    expect(boundaries0.fetchExternalData[0].output).toBe(4)
    expect(boundaries0.fetchExternalData[0].timing).toEqual(expect.objectContaining({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number)
    }))

    // Check record for second task (value: 3)
    expect(sortedRecords[1].input).toEqual({ value: 3 })
    expect(sortedRecords[1].output).toBe(18)

    // Use type assertion to access the boundary data safely
    const boundaries1 = sortedRecords[1].boundaries as unknown as RecordBoundaries
    expect(boundaries1.fetchExternalData).toHaveLength(1)
    expect(boundaries1.fetchExternalData[0].input).toEqual([3])
    expect(boundaries1.fetchExternalData[0].output).toBe(6)
    expect(boundaries1.fetchExternalData[0].timing).toEqual(expect.objectContaining({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number)
    }))

    // Check record for third task (value: 4)
    expect(sortedRecords[2].input).toEqual({ value: 4 })
    expect(sortedRecords[2].output).toBe(32)

    // Use type assertion to access the boundary data safely
    const boundaries2 = sortedRecords[2].boundaries as unknown as RecordBoundaries
    expect(boundaries2.fetchExternalData).toHaveLength(1)
    expect(boundaries2.fetchExternalData[0].input).toEqual([4])
    expect(boundaries2.fetchExternalData[0].output).toBe(8)
    expect(boundaries2.fetchExternalData[0].timing).toEqual(expect.objectContaining({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number)
    }))
  })

  it('Boundary data accumulates run data correctly', async () => {
    // Create a schema for the task that accepts a number
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries
    const boundaries = {
      fetchExternalData: async (int: number): Promise<number> => {
        return int * 2
      }
    }

    // Create the task using createTask
    const multiplyTask = createTask({
      name: 'multiplyTask',
      schema,
      boundaries,
      fn: async function ({ value }, { fetchExternalData }) {
        const externalData: number = await fetchExternalData(value)
        return value * externalData
      }
    })

    // Run task with value 2
    await multiplyTask.run({ value: 2 })

    // Get boundary data after first run
    const boundariesData1 = multiplyTask.getBondariesData()

    // Verify data structure
    expect(boundariesData1).toHaveProperty('fetchExternalData')
    expect(Array.isArray(boundariesData1.fetchExternalData)).toBe(true)
    expect(boundariesData1.fetchExternalData).toHaveLength(1)

    // Verify the tape entry for first run
    const firstRunTape = boundariesData1.fetchExternalData as Array<{input: unknown[], output: unknown, timing?: { startTime: number; endTime: number; duration: number }}>
    expect(firstRunTape[0].input).toEqual([2])
    expect(firstRunTape[0].output).toBe(4)
    expect(firstRunTape[0].timing).toEqual(expect.objectContaining({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number)
    }))

    // Run task with value 3
    await multiplyTask.run({ value: 3 })

    // Get boundary data after second run
    const boundariesData2 = multiplyTask.getBondariesData()

    // Tape should now have 2 entries
    expect(boundariesData2.fetchExternalData).toHaveLength(2)

    // Sort the tape by input value for consistent testing
    const secondRunTape = boundariesData2.fetchExternalData as Array<{input: unknown[], output: unknown, timing?: { startTime: number; endTime: number; duration: number }}>
    const sortedTape = [...secondRunTape].sort((a, b) => (a.input[0] as number) - (b.input[0] as number))

    // First entry should still be the same
    expect(sortedTape[0].input).toEqual([2])
    expect(sortedTape[0].output).toBe(4)
    expect(sortedTape[0].timing).toEqual(expect.objectContaining({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number)
    }))

    // Second entry should be from the second run
    expect(sortedTape[1].input).toEqual([3])
    expect(sortedTape[1].output).toBe(6)
    expect(sortedTape[1].timing).toEqual(expect.objectContaining({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number)
    }))

    // Run task with value 4
    await multiplyTask.run({ value: 4 })

    // Get boundary data after third run
    const boundariesData3 = multiplyTask.getBondariesData()

    // Tape should now have 3 entries
    expect(boundariesData3.fetchExternalData).toHaveLength(3)

    // Sort the tape again
    const thirdRunTape = boundariesData3.fetchExternalData as Array<{input: unknown[], output: unknown, timing?: { startTime: number; endTime: number; duration: number }}>
    const finalSortedTape = [...thirdRunTape].sort((a, b) => (a.input[0] as number) - (b.input[0] as number))

    // Verify all three entries
    expect(finalSortedTape[0].input).toEqual([2])
    expect(finalSortedTape[0].output).toBe(4)
    expect(finalSortedTape[0].timing).toEqual(expect.objectContaining({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number)
    }))

    expect(finalSortedTape[1].input).toEqual([3])
    expect(finalSortedTape[1].output).toBe(6)
    expect(finalSortedTape[1].timing).toEqual(expect.objectContaining({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number)
    }))

    expect(finalSortedTape[2].input).toEqual([4])
    expect(finalSortedTape[2].output).toBe(8)
    expect(finalSortedTape[2].timing).toEqual(expect.objectContaining({
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number)
    }))

    // Verify tape can be used for replay in proxy-pass mode
    const replayTask = createTask({
      name: 'replayTask',
      schema,
      boundaries,
      fn: async function ({ value }, { fetchExternalData }) {
        const externalData: number = await fetchExternalData(value)
        return value * externalData
      },
      boundariesData: boundariesData3 as BoundaryTapeData,
      mode: 'proxy-pass'
    })

    // Run task with all three values from the tape
    const result2 = await replayTask.run({ value: 2 })
    const result3 = await replayTask.run({ value: 3 })
    const result4 = await replayTask.run({ value: 4 })

    // Results should match original runs
    expect(result2).toBe(8)
    expect(result3).toBe(18)
    expect(result4).toBe(32)
  })
})
