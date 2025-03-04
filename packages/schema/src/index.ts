import { z } from 'zod'

type AllowedBaseTypes = 'string' | 'boolean' | 'number' | 'date'
type ArrayTypes = z.ZodString | z.ZodBoolean | z.ZodNumber | z.ZodDate

type BaseSchemaDescription = {
  type: AllowedBaseTypes
}

type ArraySchemaDescription = {
  type: 'array'
  items: {
    type: AllowedBaseTypes
  }
}

export type SchemaDescription = Record<string, BaseSchemaDescription | ArraySchemaDescription>

// Static methods for type definitions
export class Schema<T extends Record<string, z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[]>>> {
  static string() {
    return z.string()
  }

  static boolean() {
    return z.boolean()
  }

  static number() {
    return z.number()
  }

  static date() {
    return z.date()
  }

  static array<T extends ArrayTypes>(type: T) {
    return z.array(type)
  }

  /**
   * Creates a Schema instance from a description object
   * @param description Object describing the schema structure with type information
   * @returns A new Schema instance
   */
  static from(description: SchemaDescription): Schema<Record<string, z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[]>>> {
    const fields: Record<string, z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[]>> = {}

    for (const [key, field] of Object.entries(description)) {
      const fieldType = field.type
      switch (fieldType) {
        case 'string':
          fields[key] = Schema.string()
          break
        case 'boolean':
          fields[key] = Schema.boolean()
          break
        case 'number':
          fields[key] = Schema.number()
          break
        case 'date':
          fields[key] = Schema.date()
          break
        case 'array':
          const arrayField = field as ArraySchemaDescription
          switch (arrayField.items.type) {
            case 'string':
              fields[key] = Schema.array(Schema.string())
              break
            case 'boolean':
              fields[key] = Schema.array(Schema.boolean())
              break
            case 'number':
              fields[key] = Schema.array(Schema.number())
              break
            case 'date':
              fields[key] = Schema.array(Schema.date())
              break
            default:
              throw new Error(`Unsupported array item type: ${arrayField.items.type}`)
          }
          break
        default:
          throw new Error(`Unsupported type: ${fieldType}`)
      }
    }

    return new Schema(fields)
  }

  private readonly schema: z.ZodObject<T>

  constructor(fields: T) {
    this.schema = z.object(fields)
  }

  /**
   * Validates the provided data against the schema
   * @param data The data to validate
   * @returns A boolean indicating whether the data is valid
   */
  validate(data: unknown): boolean {
    let result = false
    try {
      this.schema.parse(data)
      result = true
    } catch (error) {
      result = false
    }

    return result
  }

  /**
   * Parses and validates the provided data against the schema
   * @param data The data to parse and validate
   * @returns The parsed and typed data
   * @throws {z.ZodError} If the data is invalid
   */
  parse(data: unknown): z.infer<z.ZodObject<T>> {
    return this.schema.parse(data)
  }

  /**
   * Describes the schema structure and allowed types
   * @returns An object describing the schema structure with type information
   */
  describe(): SchemaDescription {
    const shape = this.schema.shape
    const description: SchemaDescription = {}

    for (const [key, value] of Object.entries(shape)) {
      if (value instanceof z.ZodString) {
        description[key] = { type: 'string' }
      } else if (value instanceof z.ZodBoolean) {
        description[key] = { type: 'boolean' }
      } else if (value instanceof z.ZodNumber) {
        description[key] = { type: 'number' }
      } else if (value instanceof z.ZodDate) {
        description[key] = { type: 'date' }
      } else if (value instanceof z.ZodArray) {
        const element = value.element
        if (element instanceof z.ZodString) {
          description[key] = { type: 'array', items: { type: 'string' } }
        } else if (element instanceof z.ZodBoolean) {
          description[key] = { type: 'array', items: { type: 'boolean' } }
        } else if (element instanceof z.ZodNumber) {
          description[key] = { type: 'array', items: { type: 'number' } }
        } else if (element instanceof z.ZodDate) {
          description[key] = { type: 'array', items: { type: 'date' } }
        }
      }
    }

    return description
  }
}

export default Schema
