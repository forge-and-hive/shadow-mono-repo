import { z } from 'zod'

// Export a type alias for Schema fields
export type SchemaType = z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[] | Record<string, string | number | boolean>> | z.ZodOptional<z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[] | Record<string, string | number | boolean>>>;

type AllowedBaseTypes = 'string' | 'boolean' | 'number' | 'date' | 'stringRecord' | 'numberRecord' | 'booleanRecord' | 'mixedRecord'
type ArrayTypes = z.ZodString | z.ZodBoolean | z.ZodNumber | z.ZodDate

type NumberValidations = {
  min?: number
  max?: number
}

type StringValidations = {
  email?: boolean
  minLength?: number
  maxLength?: number
  regex?: string
}

// Export extended Zod types for use throughout the app
export type ShadowString = z.ZodString
export type ShadowBoolean = z.ZodBoolean
export type ShadowNumber = z.ZodNumber
export type ShadowDate = z.ZodDate
export type ShadowArray<T extends ArrayTypes> = z.ZodArray<T>
export type ShadowStringRecord = z.ZodRecord<z.ZodString, z.ZodString>
export type ShadowNumberRecord = z.ZodRecord<z.ZodString, z.ZodNumber>
export type ShadowBooleanRecord = z.ZodRecord<z.ZodString, z.ZodBoolean>
export type ShadowMixedRecord = z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>

// Export inferred types for use throughout the app
export type InferShadowString = z.infer<ShadowString>
export type InferShadowBoolean = z.infer<ShadowBoolean>
export type InferShadowNumber = z.infer<ShadowNumber>
export type InferShadowDate = z.infer<ShadowDate>
export type InferShadowArray<T extends ArrayTypes> = z.infer<ShadowArray<T>>
export type InferShadowStringRecord = z.infer<ShadowStringRecord>
export type InferShadowNumberRecord = z.infer<ShadowNumberRecord>
export type InferShadowBooleanRecord = z.infer<ShadowBooleanRecord>
export type InferShadowMixedRecord = z.infer<ShadowMixedRecord>

// Export a type utility for inferring schema types
export type InferSchema<S extends Schema<Record<string, SchemaType>>> = z.infer<S['schema']>

type BaseSchemaDescription = {
  type: AllowedBaseTypes
  optional?: boolean
  validations?: NumberValidations | StringValidations
}

type ArraySchemaDescription = {
  type: 'array'
  items: {
    type: AllowedBaseTypes
  }
  optional?: boolean
}

export type SchemaDescription = Record<string, BaseSchemaDescription | ArraySchemaDescription>

// Static methods for type definitions
export class Schema<T extends Record<string, z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[] | Record<string, string | number | boolean>> | z.ZodOptional<z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[] | Record<string, string | number | boolean>>>>> {
  readonly schema: z.ZodObject<T>

  constructor(fields: T) {
    this.schema = z.object(fields)
  }

  /**
   * Creates a string schema
   * @returns A string schema
   */
  static string(): ShadowString {
    return z.string()
  }

  /**
   * Creates a boolean schema
   * @returns A boolean schema
   */
  static boolean(): ShadowBoolean {
    return z.boolean()
  }

  /**
   * Creates a number schema
   * @returns A number schema
   */
  static number(): ShadowNumber {
    return z.number()
  }

  /**
   * Creates a date schema
   * @returns A date schema
   */
  static date(): ShadowDate {
    return z.date()
  }

  /**
   * Creates a record schema with string keys and string values
   * @returns A record schema with string values
   */
  static stringRecord(): ShadowStringRecord {
    return z.record(z.string(), z.string())
  }

  /**
   * Creates a record schema with string keys and number values
   * @returns A record schema with number values
   */
  static numberRecord(): ShadowNumberRecord {
    return z.record(z.string(), z.number())
  }

  /**
   * Creates a record schema with string keys and boolean values
   * @returns A record schema with boolean values
   */
  static booleanRecord(): ShadowBooleanRecord {
    return z.record(z.string(), z.boolean())
  }

  /**
   * Creates a record schema with string keys and mixed values (string, number, or boolean)
   * @returns A record schema with mixed values
   */
  static mixedRecord(): ShadowMixedRecord {
    return z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  }

  /**
   * Creates an array schema
   * @param type The type of items in the array
   * @returns An array schema
   */
  static array<T extends ArrayTypes>(type: T): ShadowArray<T> {
    return z.array(type) as ShadowArray<T>
  }

  /**
   * Infers the TypeScript type from a Schema instance
   * @template S The Schema type
   * @returns The inferred TypeScript type
   */
  static infer<S extends Schema<Record<string, z.ZodTypeAny>>>(_schema: S): z.infer<S['schema']> {
    // This is a type-level utility, the implementation is not used at runtime
    return {} as z.infer<S['schema']>
  }

  /**
   * Creates a Schema instance from a description object
   * @param description Object describing the schema structure with type information
   * @returns A new Schema instance
   */
  static from(description: SchemaDescription): Schema<Record<string, z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[] | Record<string, string | number | boolean>> | z.ZodOptional<z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[] | Record<string, string | number | boolean>>>>> {
    const fields: Record<string, z.ZodType<any>> = {}

    for (const [key, field] of Object.entries(description)) {
      const fieldType = field.type
      let fieldSchema: z.ZodType<string | boolean | number | Date | string[] | boolean[] | number[] | Date[] | Record<string, string | number | boolean>>

      switch (fieldType) {
      case 'string': {
        let stringSchema = Schema.string()
        if (field.validations) {
          const validations = field.validations as StringValidations
          if (validations.email) {
            stringSchema = stringSchema.email()
          }
          if (validations.minLength !== undefined) {
            stringSchema = stringSchema.min(validations.minLength)
          }
          if (validations.maxLength !== undefined) {
            stringSchema = stringSchema.max(validations.maxLength)
          }
          if (validations.regex !== undefined) {
            stringSchema = stringSchema.regex(new RegExp(validations.regex))
          }
        }
        fieldSchema = stringSchema
        break
      }
      case 'boolean':
        fieldSchema = Schema.boolean()
        break
      case 'number': {
        let numberSchema = Schema.number()
        if (field.validations) {
          const validations = field.validations as NumberValidations
          if (validations.min !== undefined) {
            numberSchema = numberSchema.min(validations.min)
          }
          if (validations.max !== undefined) {
            numberSchema = numberSchema.max(validations.max)
          }
        }
        fieldSchema = numberSchema
        break
      }
      case 'date':
        fieldSchema = Schema.date()
        break
      case 'stringRecord':
        fieldSchema = Schema.stringRecord()
        break
      case 'numberRecord':
        fieldSchema = Schema.numberRecord()
        break
      case 'booleanRecord':
        fieldSchema = Schema.booleanRecord()
        break
      case 'mixedRecord':
        fieldSchema = Schema.mixedRecord()
        break
      case 'array': {
        const arrayField = field as ArraySchemaDescription
        switch (arrayField.items.type) {
        case 'string':
          fieldSchema = Schema.array(Schema.string())
          break
        case 'boolean':
          fieldSchema = Schema.array(Schema.boolean())
          break
        case 'number':
          fieldSchema = Schema.array(Schema.number())
          break
        case 'date':
          fieldSchema = Schema.array(Schema.date())
          break
        default:
          throw new Error(`Unsupported array item type: ${arrayField.items.type}`)
        }
        break
      }
      default:
        throw new Error(`Unsupported type: ${fieldType}`)
      }

      fields[key] = field.optional ? fieldSchema.optional() : fieldSchema
    }

    return new Schema(fields)
  }

  /**
   * Validates the provided data against the schema
   * @param data The data to validate
   * @returns A boolean indicating whether the data is valid
   */
  validate(data: unknown): boolean {
    const result = this.schema.safeParse(data)

    return result.success
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
   * Safely parses and validates the provided data against the schema
   * @param data The data to parse and validate
   * @returns An object containing either the successfully parsed data or error information
   */
  safeParse(data: unknown): z.SafeParseReturnType<z.infer<z.ZodObject<T>>, z.infer<z.ZodObject<T>>> {
    return this.schema.safeParse(data)
  }

  /**
   * Describes the schema structure and allowed types
   * @returns An object describing the schema structure with type information
   */
  describe(): SchemaDescription {
    const shape = this.schema.shape
    const description: SchemaDescription = {}

    for (const [key, value] of Object.entries(shape)) {
      const isOptional = value instanceof z.ZodOptional
      const baseValue = isOptional ? value.unwrap() : value

      if (baseValue instanceof z.ZodString) {
        const validations: StringValidations = {}
        if (baseValue._def.checks) {
          for (const check of baseValue._def.checks) {
            if (check.kind === 'email') {
              validations.email = true
            } else if (check.kind === 'min') {
              validations.minLength = check.value
            } else if (check.kind === 'max') {
              validations.maxLength = check.value
            } else if (check.kind === 'regex') {
              validations.regex = check.regex.toString().replace(/^\/|\/$/g, '').replace(/\\\//g, '/')
            }
          }
        }
        description[key] = {
          type: 'string',
          ...(isOptional && { optional: true }),
          ...(Object.keys(validations).length > 0 && { validations })
        }
      } else if (baseValue instanceof z.ZodBoolean) {
        description[key] = { type: 'boolean', ...(isOptional && { optional: true }) }
      } else if (baseValue instanceof z.ZodNumber) {
        const validations: NumberValidations = {}
        if (baseValue._def.checks) {
          for (const check of baseValue._def.checks) {
            if (check.kind === 'min') {
              validations.min = check.value
            } else if (check.kind === 'max') {
              validations.max = check.value
            }
          }
        }
        description[key] = {
          type: 'number',
          ...(isOptional && { optional: true }),
          ...(Object.keys(validations).length > 0 && { validations })
        }
      } else if (baseValue instanceof z.ZodDate) {
        description[key] = { type: 'date', ...(isOptional && { optional: true }) }
      } else if (baseValue instanceof z.ZodArray) {
        const element = baseValue.element
        if (element instanceof z.ZodString) {
          description[key] = { type: 'array', items: { type: 'string' }, ...(isOptional && { optional: true }) }
        } else if (element instanceof z.ZodBoolean) {
          description[key] = { type: 'array', items: { type: 'boolean' }, ...(isOptional && { optional: true }) }
        } else if (element instanceof z.ZodNumber) {
          description[key] = { type: 'array', items: { type: 'number' }, ...(isOptional && { optional: true }) }
        } else if (element instanceof z.ZodDate) {
          description[key] = { type: 'array', items: { type: 'date' }, ...(isOptional && { optional: true }) }
        }
      } else if (baseValue instanceof z.ZodRecord) {
        // Check the value type of the record
        const valueType = baseValue._def.valueType
        if (valueType instanceof z.ZodString) {
          description[key] = { type: 'stringRecord', ...(isOptional && { optional: true }) }
        } else if (valueType instanceof z.ZodNumber) {
          description[key] = { type: 'numberRecord', ...(isOptional && { optional: true }) }
        } else if (valueType instanceof z.ZodBoolean) {
          description[key] = { type: 'booleanRecord', ...(isOptional && { optional: true }) }
        } else if (valueType instanceof z.ZodUnion) {
          description[key] = { type: 'mixedRecord', ...(isOptional && { optional: true }) }
        }
      }
    }

    return description
  }
}

export default Schema

