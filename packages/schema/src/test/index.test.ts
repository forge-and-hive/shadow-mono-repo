import Schema, { type SchemaDescription } from '../index'

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

    expect(result).toEqual(true)
  })
})

describe('Schema description', () => {
  it('should describe a string', () => {
    const schema = new Schema({
      name: Schema.string(),
    })

    const result = schema.describe()
    expect(result).toEqual({
      name: { type: 'string' },
    })
  })

  it('should describe a string and number', () => {
    const schema = new Schema({
      name: Schema.string(),
      age: Schema.number(),
    })

    const result = schema.describe()
    expect(result).toEqual({
      name: { type: 'string' },
      age: { type: 'number' },
    })
  })
})

describe('Schema hydrate', () => {
  it('should describe a string', () => {
    const description: SchemaDescription = {
      name: { type: 'string' },
      age: { type: 'number' },
    }
    const schema = Schema.from(description)

    const result = schema.describe()
    expect(result).toEqual({
      name: { type: 'string' },
      age: { type: 'number' },
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
      tags: Schema.array(Schema.string()),
    })

    const result = schema.validate({
      tags: ['tag1', 'tag2', 'tag3'],
    })

    expect(result).toBe(true)
  })

  it('should validate array of numbers', () => {
    const schema = new Schema({
      scores: Schema.array(Schema.number()),
    })

    const result = schema.validate({
      scores: [1, 2, 3, 4, 5],
    })

    expect(result).toBe(true)
  })

  it('should reject invalid array types', () => {
    const schema = new Schema({
      tags: Schema.array(Schema.string()),
    })

    const result = schema.validate({
      tags: ['tag1', 123, 'tag3'], // mixed types
    })

    expect(result).toBe(false)
  })

  it('should validate empty arrays', () => {
    const schema = new Schema({
      tags: Schema.array(Schema.string()),
    })

    const result = schema.validate({
      tags: [],
    })

    expect(result).toBe(true)
  })

  it('should describe array schema', () => {
    const schema = new Schema({
      tags: Schema.array(Schema.string()),
      scores: Schema.array(Schema.number()),
    })

    const result = schema.describe()
    expect(result).toEqual({
      tags: { type: 'array', items: { type: 'string' } },
      scores: { type: 'array', items: { type: 'number' } },
    })
  })

  it('should hydrate array schema from description', () => {
    const description: SchemaDescription = {
      tags: { type: 'array', items: { type: 'string' } },
      scores: { type: 'array', items: { type: 'number' } },
    }
    const schema = Schema.from(description)

    const result = schema.describe()
    expect(result).toEqual({
      tags: { type: 'array', items: { type: 'string' } },
      scores: { type: 'array', items: { type: 'number' } },
    })
  })
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
