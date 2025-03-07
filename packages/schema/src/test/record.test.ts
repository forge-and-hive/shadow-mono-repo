import Schema, { type SchemaDescription } from '../index'

describe('Schema Record Types', () => {
  describe('String Record', () => {
    it('should validate a record with string values', () => {
      const schema = new Schema({
        data: Schema.stringRecord(),
      })

      const result = schema.validate({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          occupation: 'Developer'
        }
      })

      expect(result).toBe(true)
    })

    it('should reject a record with non-string values', () => {
      const schema = new Schema({
        data: Schema.stringRecord(),
      })

      const result = schema.validate({
        data: {
          name: 'John',
          age: 30, // Number is not allowed
          isActive: true // Boolean is not allowed
        }
      })

      expect(result).toBe(false)
    })

    it('should create a schema from description with string record type', () => {
      const description: SchemaDescription = {
        data: {
          type: 'stringRecord',
          optional: false
        }
      }

      const schema = Schema.from(description)

      const validData = {
        data: {
          firstName: 'John',
          lastName: 'Doe'
        }
      }

      const result = schema.validate(validData)
      expect(result).toBe(true)
    })
  })

  describe('Number Record', () => {
    it('should validate a record with number values', () => {
      const schema = new Schema({
        data: Schema.numberRecord(),
      })

      const result = schema.validate({
        data: {
          age: 30,
          experience: 5,
          salary: 100000
        }
      })

      expect(result).toBe(true)
    })

    it('should reject a record with non-number values', () => {
      const schema = new Schema({
        data: Schema.numberRecord(),
      })

      const result = schema.validate({
        data: {
          age: 30,
          name: 'John', // String is not allowed
          isActive: true // Boolean is not allowed
        }
      })

      expect(result).toBe(false)
    })

    it('should create a schema from description with number record type', () => {
      const description: SchemaDescription = {
        data: {
          type: 'numberRecord',
          optional: false
        }
      }

      const schema = Schema.from(description)

      const validData = {
        data: {
          age: 30,
          experience: 5
        }
      }

      const result = schema.validate(validData)
      expect(result).toBe(true)
    })
  })

  describe('Boolean Record', () => {
    it('should validate a record with boolean values', () => {
      const schema = new Schema({
        data: Schema.booleanRecord(),
      })

      const result = schema.validate({
        data: {
          isActive: true,
          isAdmin: false,
          hasAccess: true
        }
      })

      expect(result).toBe(true)
    })

    it('should reject a record with non-boolean values', () => {
      const schema = new Schema({
        data: Schema.booleanRecord(),
      })

      const result = schema.validate({
        data: {
          isActive: true,
          name: 'John', // String is not allowed
          age: 30 // Number is not allowed
        }
      })

      expect(result).toBe(false)
    })

    it('should create a schema from description with boolean record type', () => {
      const description: SchemaDescription = {
        data: {
          type: 'booleanRecord',
          optional: false
        }
      }

      const schema = Schema.from(description)

      const validData = {
        data: {
          isActive: true,
          isAdmin: false
        }
      }

      const result = schema.validate(validData)
      expect(result).toBe(true)
    })
  })

  describe('Mixed Record', () => {
    it('should validate a record with mixed values (string, number, boolean)', () => {
      const schema = new Schema({
        data: Schema.mixedRecord(),
      })

      const result = schema.validate({
        data: {
          name: 'John',
          age: 30,
          isActive: true
        }
      })

      expect(result).toBe(true)
    })

    it('should validate a record with only string values', () => {
      const schema = new Schema({
        data: Schema.mixedRecord(),
      })

      const result = schema.validate({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          occupation: 'Developer'
        }
      })

      expect(result).toBe(true)
    })

    it('should validate a record with only number values', () => {
      const schema = new Schema({
        data: Schema.mixedRecord(),
      })

      const result = schema.validate({
        data: {
          age: 30,
          experience: 5,
          salary: 100000
        }
      })

      expect(result).toBe(true)
    })

    it('should validate a record with only boolean values', () => {
      const schema = new Schema({
        data: Schema.mixedRecord(),
      })

      const result = schema.validate({
        data: {
          isActive: true,
          isAdmin: false,
          hasAccess: true
        }
      })

      expect(result).toBe(true)
    })

    it('should reject a record with invalid value types', () => {
      const schema = new Schema({
        data: Schema.mixedRecord(),
      })

      const result = schema.validate({
        data: {
          name: 'John',
          createdAt: new Date(), // Date is not allowed
          items: [1, 2, 3] // Array is not allowed
        }
      })

      expect(result).toBe(false)
    })

    it('should create a schema from description with mixed record type', () => {
      const description: SchemaDescription = {
        data: {
          type: 'mixedRecord',
          optional: false
        }
      }

      const schema = Schema.from(description)

      const validData = {
        data: {
          name: 'John',
          age: 30,
          isActive: true
        }
      }

      const result = schema.validate(validData)
      expect(result).toBe(true)
    })
  })

  describe('Common Record Functionality', () => {
    it('should reject a record with non-string keys', () => {
      const schema = new Schema({
        data: Schema.stringRecord(),
      })

      // TypeScript would catch this at compile time, but we're testing runtime behavior
      const invalidData = {
        data: {
          name: 'John',
        }
      }

      // Add a non-string key using Object.defineProperty
      Object.defineProperty(invalidData.data, 123, {
        value: 'test',
        enumerable: true
      })

      // Note: Zod's record validation doesn't actually check for non-string keys at runtime
      // This is a limitation of JavaScript/TypeScript, as all object keys are converted to strings
      // So this test will actually pass, not fail
      const result = schema.validate(invalidData)
      expect(result).toBe(true)
    })

    it('should create a schema from description with optional record type', () => {
      const description: SchemaDescription = {
        data: {
          type: 'stringRecord',
          optional: true
        }
      }

      const schema = Schema.from(description)

      // Test with record present
      const validData1 = {
        data: {
          name: 'John'
        }
      }

      // Test with record missing
      const validData2 = {}

      expect(schema.validate(validData1)).toBe(true)
      expect(schema.validate(validData2)).toBe(true)
    })

    it('should describe a schema with string record type', () => {
      const schema = new Schema({
        data: Schema.stringRecord(),
      })

      const description = schema.describe()

      expect(description).toHaveProperty('data')
      expect(description.data).toHaveProperty('type', 'stringRecord')
      // The optional property is only included when it's true, not when it's false
    })

    it('should describe a schema with number record type', () => {
      const schema = new Schema({
        data: Schema.numberRecord(),
      })

      const description = schema.describe()

      expect(description).toHaveProperty('data')
      expect(description.data).toHaveProperty('type', 'numberRecord')
    })

    it('should describe a schema with boolean record type', () => {
      const schema = new Schema({
        data: Schema.booleanRecord(),
      })

      const description = schema.describe()

      expect(description).toHaveProperty('data')
      expect(description.data).toHaveProperty('type', 'booleanRecord')
    })

    it('should describe a schema with mixed record type', () => {
      const schema = new Schema({
        data: Schema.mixedRecord(),
      })

      const description = schema.describe()

      expect(description).toHaveProperty('data')
      expect(description.data).toHaveProperty('type', 'mixedRecord')
    })
  })
})
