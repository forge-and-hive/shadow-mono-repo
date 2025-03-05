import { Schema } from '../index'

describe('Schema single date field', () => {
  const schema = Schema.from({
    createdAt: { type: 'date' }
  })

  it('should validate a valid date', () => {
    const data = {
      createdAt: new Date()
    }
    expect(schema.validate(data)).toBe(true)
  })

  it('should validate a valid date string', () => {
    const data = {
      createdAt: new Date('2024-03-20T12:00:00Z')
    }
    expect(schema.validate(data)).toBe(true)
  })

  it('should reject invalid date', () => {
    const data = {
      createdAt: 'invalid-date'
    }
    expect(schema.validate(data)).toBe(false)
  })

  it('should reject non-date value', () => {
    const data = {
      createdAt: 123
    }
    expect(schema.validate(data)).toBe(false)
  })
})

describe('Schema array of dates', () => {
  const schema = Schema.from({
    timestamps: { type: 'array', items: { type: 'date' } }
  })

  it('should validate an array of valid dates', () => {
    const data = {
      timestamps: [new Date(), new Date()]
    }
    expect(schema.validate(data)).toBe(true)
  })

  it('should validate an array of valid date strings', () => {
    const data = {
      timestamps: [new Date('2024-03-20T12:00:00Z'), new Date('2024-03-21T12:00:00Z')]
    }
    expect(schema.validate(data)).toBe(true)
  })

  it('should reject array with invalid date', () => {
    const data = {
      timestamps: [new Date(), 'invalid-date']
    }
    expect(schema.validate(data)).toBe(false)
  })

  it('should reject non-array value', () => {
    const data = {
      timestamps: 'not-an-array'
    }
    expect(schema.validate(data)).toBe(false)
  })
})

describe('Dates Schema description', () => {
  it('should correctly describe date fields', () => {
    const schema = new Schema({
      createdAt: Schema.date(),
      timestamps: Schema.array(Schema.date())
    })

    const description = schema.describe()
    expect(description).toEqual({
      createdAt: { type: 'date' },
      timestamps: { type: 'array', items: { type: 'date' } }
    })
  })
})

