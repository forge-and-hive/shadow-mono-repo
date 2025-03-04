import { Schema } from '../index'

describe('Schema Custom Validations', () => {
  describe('Optional Fields', () => {
    it('should handle optional string fields', () => {
      const schema = Schema.from({
        name: { type: 'string', optional: true },
        age: { type: 'number' }
      })

      // Valid with optional field present
      expect(schema.validate({ name: 'John', age: 30 })).toBe(true)

      // Valid with optional field missing
      expect(schema.validate({ age: 30 })).toBe(true)

      // Invalid - missing required field
      expect(schema.validate({ name: 'John' })).toBe(false)
    })

    it('should handle optional array fields', () => {
      const schema = Schema.from({
        tags: { type: 'array', items: { type: 'string' }, optional: true },
        scores: { type: 'array', items: { type: 'number' } }
      })

      // Valid with optional array present
      expect(schema.validate({ tags: ['tag1', 'tag2'], scores: [1, 2, 3] })).toBe(true)

      // Valid with optional array missing
      expect(schema.validate({ scores: [1, 2, 3] })).toBe(true)

      // Invalid - missing required array
      expect(schema.validate({ tags: ['tag1'] })).toBe(false)
    })

    it('should correctly describe optional fields', () => {
      const schema = Schema.from({
        name: { type: 'string', optional: true },
        age: { type: 'number' },
        tags: { type: 'array', items: { type: 'string' }, optional: true }
      })

      const description = schema.describe()

      expect(description.name).toEqual({ type: 'string', optional: true })
      expect(description.age).toEqual({ type: 'number' })
      expect(description.tags).toEqual({ type: 'array', items: { type: 'string' }, optional: true })
    })
  })

  describe('Schema Roundtrip', () => {
    it('should maintain optional fields through describe/from cycle', () => {
      const originalSchema = Schema.from({
        name: { type: 'string', optional: true },
        age: { type: 'number' },
        tags: { type: 'array', items: { type: 'string' }, optional: true }
      })

      const description = originalSchema.describe()
      const reconstructedSchema = Schema.from(description)

      // Both schemas should validate the same data
      const validData = { name: 'John', age: 30, tags: ['tag1'] }
      const dataWithoutOptional = { age: 30 }

      expect(originalSchema.validate(validData)).toBe(true)
      expect(reconstructedSchema.validate(validData)).toBe(true)
      expect(originalSchema.validate(dataWithoutOptional)).toBe(true)
      expect(reconstructedSchema.validate(dataWithoutOptional)).toBe(true)
    })
  })
})
