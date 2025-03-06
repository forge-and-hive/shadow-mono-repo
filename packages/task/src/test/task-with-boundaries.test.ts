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
})
