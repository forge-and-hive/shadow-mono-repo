import { z } from 'zod'

// Static methods for type definitions
export class Schema<T extends Record<string, z.ZodType<string | boolean | number | string[] | boolean[] | number[]>>> {
  static string() {
    return z.string()
  }

  static boolean() {
    return z.boolean()
  }

  static number() {
    return z.number()
  }

  static stringArray() {
    return z.array(z.string())
  }

  static booleanArray() {
    return z.array(z.boolean())
  }

  static numberArray() {
    return z.array(z.number())
  }

  /**
   * Creates a Schema instance from a description object
   * @param description Object describing the schema structure
   * @returns A new Schema instance
   */
  static from(description: Record<string, string>): Schema<Record<string, z.ZodType<string | boolean | number | string[] | boolean[] | number[]>>> {
    const fields: Record<string, z.ZodType<string | boolean | number | string[] | boolean[] | number[]>> = {}

    for (const [key, type] of Object.entries(description)) {
      switch (type) {
        case 'string':
          fields[key] = Schema.string()
          break
        case 'boolean':
          fields[key] = Schema.boolean()
          break
        case 'number':
          fields[key] = Schema.number()
          break
        case 'string[]':
          fields[key] = Schema.stringArray()
          break
        case 'boolean[]':
          fields[key] = Schema.booleanArray()
          break
        case 'number[]':
          fields[key] = Schema.numberArray()
          break
        default:
          throw new Error(`Unsupported type: ${type}`)
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
   * @returns An object describing the schema structure
   */
  describe(): Record<string, string> {
    const shape = this.schema.shape
    const description: Record<string, string> = {}

    for (const [key, value] of Object.entries(shape)) {
      if (value instanceof z.ZodString) {
        description[key] = 'string'
      } else if (value instanceof z.ZodBoolean) {
        description[key] = 'boolean'
      } else if (value instanceof z.ZodNumber) {
        description[key] = 'number'
      } else if (value instanceof z.ZodArray) {
        const element = value.element
        if (element instanceof z.ZodString) {
          description[key] = 'string[]'
        } else if (element instanceof z.ZodBoolean) {
          description[key] = 'boolean[]'
        } else if (element instanceof z.ZodNumber) {
          description[key] = 'number[]'
        }
      }
    }

    return description
  }
}

export default Schema
