import { Schema } from '../index'

describe('Schema Custom Validations', () => {
  describe('Number Validations', () => {
    it('should validate number min/max constraints', () => {
      const schema = Schema.from({
        age: {
          type: 'number',
          validations: {
            min: 18,
            max: 100
          }
        },
        score: {
          type: 'number',
          validations: {
            min: 0,
            max: 100
          }
        }
      })

      // Valid cases
      expect(schema.validate({ age: 25, score: 85 })).toBe(true)
      expect(schema.validate({ age: 18, score: 0 })).toBe(true)
      expect(schema.validate({ age: 100, score: 100 })).toBe(true)

      // Invalid cases
      expect(schema.validate({ age: 17, score: 85 })).toBe(false)
      expect(schema.validate({ age: 25, score: -1 })).toBe(false)
      expect(schema.validate({ age: 101, score: 85 })).toBe(false)
      expect(schema.validate({ age: 25, score: 101 })).toBe(false)
    })

    it('should correctly describe number validations', () => {
      const schema = Schema.from({
        age: {
          type: 'number',
          validations: {
            min: 18,
            max: 100
          }
        }
      })

      const description = schema.describe()
      expect(description.age).toEqual({
        type: 'number',
        validations: {
          min: 18,
          max: 100
        }
      })
    })
  })

  describe('String Validations', () => {
    it('should validate string email format', () => {
      const schema = Schema.from({
        email: {
          type: 'string',
          validations: {
            email: true
          }
        }
      })

      // Valid cases
      expect(schema.validate({ email: 'user@example.com' })).toBe(true)
      expect(schema.validate({ email: 'test.name@domain.co.uk' })).toBe(true)
      expect(schema.validate({ email: 'user+tag@example.com' })).toBe(true)

      // Invalid cases
      expect(schema.validate({ email: 'not-an-email' })).toBe(false)
      expect(schema.validate({ email: 'missing@domain' })).toBe(false)
      expect(schema.validate({ email: '@domain.com' })).toBe(false)
    })

    it('should validate string length constraints', () => {
      const schema = Schema.from({
        username: {
          type: 'string',
          validations: {
            minLength: 3,
            maxLength: 20
          }
        }
      })

      // Valid cases
      expect(schema.validate({ username: 'abc' })).toBe(true)
      expect(schema.validate({ username: 'valid_username' })).toBe(true)
      expect(schema.validate({ username: 'a'.repeat(20) })).toBe(true)

      // Invalid cases
      expect(schema.validate({ username: 'ab' })).toBe(false)
      expect(schema.validate({ username: 'a'.repeat(21) })).toBe(false)
    })

    it('should validate string regex pattern', () => {
      const schema = Schema.from({
        username: {
          type: 'string',
          validations: {
            regex: '^[a-zA-Z0-9_]+$'
          }
        }
      })

      // Valid cases
      expect(schema.validate({ username: 'john_doe123' })).toBe(true)
      expect(schema.validate({ username: 'User123' })).toBe(true)
      expect(schema.validate({ username: '123456' })).toBe(true)

      // Invalid cases
      expect(schema.validate({ username: 'john-doe' })).toBe(false)
      expect(schema.validate({ username: 'user@123' })).toBe(false)
      expect(schema.validate({ username: 'user name' })).toBe(false)
    })

    it('should correctly describe string validations', () => {
      const schema = Schema.from({
        email: {
          type: 'string',
          validations: {
            email: true,
            minLength: 5,
            maxLength: 100
          }
        }
      })

      const description = schema.describe()
      expect(description.email).toEqual({
        type: 'string',
        validations: {
          email: true,
          minLength: 5,
          maxLength: 100
        }
      })
    })

    it.only('should correctly describe string regex validation', () => {
      const schema = Schema.from({
        username: {
          type: 'string',
          validations: {
            regex: '^[a-zA-Z0-9_]+$'
          }
        }
      })

      const description = schema.describe()
      expect(description.username).toEqual({
        type: 'string',
        validations: {
          regex: '^[a-zA-Z0-9_]+$'
        }
      })
    })

    it('should handle regex with other string validations', () => {
      const schema = Schema.from({
        username: {
          type: 'string',
          validations: {
            regex: '^[a-zA-Z0-9_]+$',
            minLength: 3,
            maxLength: 20
          }
        }
      })

      // Valid cases
      expect(schema.validate({ username: 'john_doe123' })).toBe(true)
      expect(schema.validate({ username: 'User123' })).toBe(true)

      // Invalid cases - regex
      expect(schema.validate({ username: 'john-doe' })).toBe(false)
      expect(schema.validate({ username: 'user@123' })).toBe(false)

      // Invalid cases - length
      expect(schema.validate({ username: 'ab' })).toBe(false)
      expect(schema.validate({ username: 'a'.repeat(21) })).toBe(false)
    })

    it('should handle regex patterns containing forward slashes', () => {
      const schema = Schema.from({
        path: {
          type: 'string',
          validations: {
            regex: '^/api/v[0-9]+/users/[0-9]+$'
          }
        }
      })

      // Valid cases
      expect(schema.validate({ path: '/api/v1/users/123' })).toBe(true)
      expect(schema.validate({ path: '/api/v2/users/456' })).toBe(true)
      expect(schema.validate({ path: '/api/v10/users/789' })).toBe(true)

      // Invalid cases
      expect(schema.validate({ path: 'api/v1/users/123' })).toBe(false)
      expect(schema.validate({ path: '/api/v1/users' })).toBe(false)
      expect(schema.validate({ path: '/api/v1/users/abc' })).toBe(false)

      // Verify the description preserves the slashes within the pattern
      const description = schema.describe()
      expect(description.path).toEqual({
        type: 'string',
        validations: {
          regex: '^/api/v[0-9]+/users/[0-9]+$'
        }
      })
    })
  })

  describe('Schema Roundtrip', () => {
    it('should maintain custom validations through describe/from cycle', () => {
      const originalSchema = Schema.from({
        age: {
          type: 'number',
          validations: {
            min: 18,
            max: 100
          }
        },
        email: {
          type: 'string',
          validations: {
            email: true
          }
        },
        username: {
          type: 'string',
          validations: {
            regex: '^[a-zA-Z0-9_]+$',
            minLength: 3,
            maxLength: 20
          }
        }
      })

      const description = originalSchema.describe()
      const reconstructedSchema = Schema.from(description)

      // Both schemas should validate the same data
      const validData = {
        age: 25,
        email: 'user@example.com',
        username: 'john_doe123'
      }
      const invalidData = {
        age: 17,
        email: 'not-an-email',
        username: 'john-doe'
      }

      expect(originalSchema.validate(validData)).toBe(true)
      expect(reconstructedSchema.validate(validData)).toBe(true)
      expect(originalSchema.validate(invalidData)).toBe(false)
      expect(reconstructedSchema.validate(invalidData)).toBe(false)
    })
  })
})
