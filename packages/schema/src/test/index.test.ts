import Schema from '../index'

describe('Schema basic types', () => {
  it('should validate a string', () => {
    const schema = new Schema({
      name: Schema.string(),
    })

    const result = schema.validate({
      name: 'World',
    })

    expect(result).toBe(true)
  })

  it('should validate a string and number', () => {
    const schema = new Schema({
      name: Schema.string(),
      age: Schema.number(),
    })

    const result = schema.validate({
      name: 'World',
      age: 20,
    })

    const parsed = schema.parse({
      name: 'World',
      age: 20,
    })

    expect(result).toEqual(true)
    expect(parsed).toEqual({
      name: 'World',
      age: 20,
    })
  })
})

describe('Schema description', () => {
  it('should describe a string', () => {
    const schema = new Schema({
      name: Schema.string(),
    })

    const result = schema.describe()
    expect(result).toEqual({
      name: 'string',
    })
  })

  it('should describe a string and number', () => {
    const schema = new Schema({
      name: Schema.string(),
      age: Schema.number(),
    })

    const result = schema.describe()
    expect(result).toEqual({
      name: 'string',
      age: 'number',
    })
  })
})

describe('Schema hydrate', () => {
  it('should describe a string', () => {
    const schema = Schema.from({
      name: 'string',
      age: 'number',
    })

    const result = schema.describe()
    expect(result).toEqual({
      name: 'string',
      age: 'number',
    })
  })
})

describe('Schema validation errors', () => {
  it('should reject invalid string type', () => {
    const schema = new Schema({
      name: Schema.string(),
    })

    const result = schema.validate({
      name: 123, // number instead of string
    })

    expect(result).toBe(false)
  })

  it('should reject invalid number type', () => {
    const schema = new Schema({
      age: Schema.number(),
    })

    const result = schema.validate({
      age: 'not a number',
    })

    expect(result).toBe(false)
  })
})

// describe('Schema optional fields', () => {
//   it('should validate with missing optional field', () => {
//     const schema = new Schema({
//       name: Schema.string(),
//       age: Schema.number().optional(),
//     })

//     const result = schema.validate({
//       name: 'World',
//     })

//     expect(result).toBe(true)
//   })
// })

describe('Schema arrays', () => {
  it('should validate array of strings', () => {
    const schema = new Schema({
      tags: Schema.stringArray(),
    })

    const result = schema.validate({
      tags: ['tag1', 'tag2', 'tag3'],
    })

    expect(result).toBe(true)
  })

  it('should validate array of numbers', () => {
    const schema = new Schema({
      scores: Schema.numberArray(),
    })

    const result = schema.validate({
      scores: [1, 2, 3, 4, 5],
    })

    expect(result).toBe(true)
  })

  it('should reject invalid array types', () => {
    const schema = new Schema({
      tags: Schema.stringArray(),
    })

    const result = schema.validate({
      tags: ['tag1', 123, 'tag3'], // mixed types
    })

    expect(result).toBe(false)
  })

  it('should validate empty arrays', () => {
    const schema = new Schema({
      tags: Schema.stringArray(),
    })

    const result = schema.validate({
      tags: [],
    })

    expect(result).toBe(true)
  })

  // it('should validate optional arrays', () => {
  //   const schema = new Schema({
  //     tags: Schema.stringArray().optional(),
  //   })

  //   const result = schema.validate({
  //     // tags field omitted
  //   })

  //   expect(result).toBe(true)
  // })
})

describe('Schema custom validation', () => {
  it('should validate with custom rules', () => {
    const schema = new Schema({
      age: Schema.number().min(0).max(120),
      email: Schema.string().email(),
    })

    const result = schema.validate({
      age: 25,
      email: 'test@example.com',
    })

    expect(result).toBe(true)
  })
})
