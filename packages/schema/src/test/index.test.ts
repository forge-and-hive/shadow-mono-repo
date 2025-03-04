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

    expect(result).toBe(true)
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
