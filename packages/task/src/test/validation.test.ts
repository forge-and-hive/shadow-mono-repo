import { Task, type TaskInstanceType } from '../index'
import { Schema, type InferSchema } from '@shadow/schema'

describe('Validation tests', () => {
  let task: TaskInstanceType

  beforeEach(() => {
    const schema = new Schema({
      value: Schema.number()
    })

    task = new Task(function (argv: InferSchema<typeof schema>) {
      return argv
    }, {
      schema
    })
  })

  it('Should be invalid', () => {
    const check = task.isValid({ value: null })

    expect(check).toBe(false)
  })

  it('Should be valid', () => {
    const check = task.isValid({ value: 5 })

    expect(check).toBe(true)
  })

  it('Should validate data as part of run function', async () => {
    try {
      await task.run({ value: null })
      // If we get here, the test should fail
      expect('no error thrown').toBeUndefined()
    } catch (e) {
      // Test passes if we get here
      expect(e).toBeDefined()
    }
  })

  it('Should work well', async () => {
    const result = await task.run({ value: 5 })
    expect(result.value).toBe(5)
  })
})

describe('Validation tests on param', () => {
  let task: TaskInstanceType

  beforeEach(() => {
    const schema = new Schema({
      value: Schema.number()
    })

    task = new Task(function (argv: InferSchema<typeof schema>) {
      return argv
    }, {
      schema
    })
  })

  it('Should be invalid', () => {
    const check = task.isValid({ value: null })

    expect(check).toBe(false)
  })

  it('Should be valid', () => {
    const check = task.isValid({ value: 5 })

    expect(check).toBe(true)
  })

  it('Should validate data as part of run function', async () => {
    try {
      await task.run({ value: null })
      // If we get here, the test should fail
      expect('no error thrown').toBeUndefined()
    } catch (e) {
      // Test passes if we get here
      expect(e).toBeDefined()
    }
  })

  it('Should work well', async () => {
    try {
      const result = await task.run({ value: 5 })
      expect(result.value).toBe(5)
    } catch (e) {
      expect('error thrown: ' + e).toBeUndefined()
    }
  })
})

describe('Validation multiple values tests', () => {
  let task: TaskInstanceType

  beforeEach(() => {
    const schema = new Schema({
      value: Schema.number(),
      increment: Schema.number()
    })

    task = new Task(function (argv: InferSchema<typeof schema>) {
      return argv
    }, {
      schema
    })
  })

  it('Should be on both invalid but fail in first', async () => {
    try {
      await task.run({ value: null })
      // If we get here, the test should fail
      expect('no error thrown').toBeUndefined()
    } catch (e) {
      // Test passes if we get here
      expect(e).toBeDefined()
    }
  })

  it('Should be on both invalid but fail in increment', async () => {
    try {
      await task.run({ value: 5 })
      // If we get here, the test should fail
      expect('no error thrown').toBeUndefined()
    } catch (e) {
      // Test passes if we get here
      expect(e).toBeDefined()
    }
  })

  it('Should work well', async () => {
    const result = await task.run({ value: 5, increment: 1 })

    expect(result.value).toBe(5)
    expect(result.increment).toBe(1)
  })
})

describe('Get Schema', () => {
  it('Object as string', async () => {
    const add2 = new Task(function (int: number) {
      return int + 2
    }, {
      schema: new Schema({
        value: Schema.number()
      })
    })

    const schema = add2.getSchema()
    const schemaDescription = schema?.describe() ?? {}

    expect(JSON.stringify(schemaDescription)).toBe('{"value":{"type":"number"}}')
  })

  it('Empty object as string', async () => {
    const add2 = new Task(function (int: number) {
      return int + 2
    }, {})

    const schema = add2.getSchema()

    expect(schema).toBeUndefined()
  })
})

describe('Set Schema', () => {
  it('Object as string', async () => {
    const add2 = new Task(function (int: number) {
      return int + 2
    })

    add2.setSchema(new Schema({
      value: Schema.number()
    }))

    const schema = add2.getSchema()
    const schemaDescription = schema?.describe() ?? {}

    expect(JSON.stringify(schemaDescription)).toBe('{"value":{"type":"number"}}')
  })

  it('Empty object as string', async () => {
    const add2 = new Task(function (int: number) {
      return int + 2
    })

    const schema = add2.getSchema()

    expect(schema).toBeUndefined()
  })
})
