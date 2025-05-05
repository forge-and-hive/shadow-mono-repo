import { createTask, Schema } from '../index'

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
    const indentity = createTask(
      schema,
      boundaries,
      async (argv, boundaries) => {
        const externalData = await boundaries.fetchExternalData()
        return { ...externalData, ...argv }
      }
    )

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
    const indentity = createTask(
      schema,
      boundaries,
      async (argv, boundaries) => {
        const externalData = await boundaries.fetchExternalData()
        return { ...externalData, ...argv }
      },
      {
        boundariesData: {
          fetchExternalData: [
            { input: [], output: { foo: false } }
          ]
        },
        mode: 'proxy-pass'
      }
    )

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
    const add = createTask(
      schema,
      boundaries,
      async function (argv, boundaries) {
        const externalData: number = await boundaries.fetchExternalData(1)
        return argv.value + externalData
      }
    )

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
    const add = createTask(
      schema,
      boundaries,
      async function (argv, boundaries) {
        const externalData: number = await boundaries.fetchExternalData(argv.value)
        return argv.value + externalData
      },
      {
        boundariesData: {
          fetchExternalData: [
            { input: [4], output: 2 }
          ]
        },
        mode: 'proxy-pass'
      }
    )

    const six = await add.run({ value: 4 }) // From tape data
    const fifteen = await add.run({ value: 5 })

    expect(six).toBe(6)
    expect(fifteen).toBe(15)
  })

  it('Multiple parallel task runs with boundaries', async () => {
    const records: any[] = []

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
    const multiplyTask = createTask(
      schema,
      boundaries,
      async function ({ value }, { fetchExternalData}) {
        const externalData: number = await fetchExternalData(value)
        return value * externalData
      }
    )

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
    const sortedRecords = [...records].sort((a, b) => a.input.value - b.input.value)

    // Check record for first task (value: 2)
    expect(sortedRecords[0].input).toEqual({ value: 2 })
    expect(sortedRecords[0].output).toBe(8)
    expect(sortedRecords[0].boundaries.fetchExternalData).toHaveLength(1)
    expect(sortedRecords[0].boundaries.fetchExternalData[0].input).toEqual([2])
    expect(sortedRecords[0].boundaries.fetchExternalData[0].output).toBe(4)

    // Check record for second task (value: 3)
    expect(sortedRecords[1].input).toEqual({ value: 3 })
    expect(sortedRecords[1].output).toBe(18)
    expect(sortedRecords[1].boundaries.fetchExternalData).toHaveLength(1)
    expect(sortedRecords[1].boundaries.fetchExternalData[0].input).toEqual([3])
    expect(sortedRecords[1].boundaries.fetchExternalData[0].output).toBe(6)

    // Check record for third task (value: 4)
    expect(sortedRecords[2].input).toEqual({ value: 4 })
    expect(sortedRecords[2].output).toBe(32)
    expect(sortedRecords[2].boundaries.fetchExternalData).toHaveLength(1)
    expect(sortedRecords[2].boundaries.fetchExternalData[0].input).toEqual([4])
    expect(sortedRecords[2].boundaries.fetchExternalData[0].output).toBe(8)
  })
})
