# @forgehive/schema

A powerful schema validation library built on top of Zod, providing type-safe validation and type inference.

## Installation

```bash
npm install @forgehive/schema
```

## Overview

The `@forgehive/schema` package provides a wrapper around Zod with additional features:

- Type-safe schema definitions
- Built-in validation methods
- Schema description capabilities
- Type inference utilities

## Basic Usage

Here's a simple example of creating and using a schema:

```typescript
import { Schema } from '@forgehive/schema';

// Create a schema with validation
const userSchema = new Schema({
  name: Schema.string(),
  age: Schema.number().min(0).max(120),
  email: Schema.string().email(),
  tags: Schema.array(Schema.string())
});

// Validate data
const result = userSchema.safeParse({
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
  tags: ['user', 'active']
});

if (result.success) {
  // TypeScript knows the shape of the data
  const user = result.data;
  console.log(user.name); // TypeScript knows this is a string
}
```

## Schema Types

The package provides several schema types:

```typescript
// Basic types
Schema.string()
Schema.number()
Schema.boolean()
Schema.date()

// Arrays
Schema.array(Schema.string())
Schema.array(Schema.number())
Schema.array(Schema.boolean())
Schema.array(Schema.date())

// Records
Schema.stringRecord()  // Record<string, string>
Schema.numberRecord()  // Record<string, number>
Schema.booleanRecord() // Record<string, boolean>
Schema.mixedRecord()   // Record<string, string | number | boolean>
```

## Validation

Schemas provide several validation methods:

```typescript
const schema = new Schema({
  name: Schema.string(),
  age: Schema.number()
});

// Parse and throw on error
const data = schema.parse({ name: 'John', age: 30 });

// Safe parse with result object
const result = schema.safeParse({ name: 'John', age: 30 });
if (result.success) {
  const data = result.data;
} else {
  const errors = result.error;
}

// Validate without parsing
const isValid = schema.validate({ name: 'John', age: 30 });
```

## Schema Description

You can get a description of the schema structure:

```typescript
const schema = new Schema({
  name: Schema.string(),
  age: Schema.number().min(0),
  email: Schema.string().email()
});

const description = schema.describe();
// Returns:
// {
//   name: { type: 'string' },
//   age: { type: 'number', validations: { min: 0 } },
//   email: { type: 'string', validations: { email: true } }
// }
```

## Type Inference

The package provides type utilities for inferring types from schemas:

```typescript
import { Schema, type InferSchema } from '@forgehive/schema';

const schema = new Schema({
  name: Schema.string(),
  age: Schema.number()
});

// Infer the type from the schema
type User = InferSchema<typeof schema>;
// Type is: { name: string; age: number }
```

## API Reference

### `Schema` Class

- `constructor(fields: Record<string, SchemaType>)`: Creates a new schema
- `parse(data: unknown)`: Parses and validates data, throws on error
- `safeParse(data: unknown)`: Safely parses and validates data
- `validate(data: unknown)`: Validates data without parsing
- `describe()`: Returns a description of the schema structure
- `asZod()`: Returns the underlying Zod schema

### Static Methods

- `string()`: Creates a string schema
- `number()`: Creates a number schema
- `boolean()`: Creates a boolean schema
- `date()`: Creates a date schema
- `array(type)`: Creates an array schema
- `stringRecord()`: Creates a record schema with string values
- `numberRecord()`: Creates a record schema with number values
- `booleanRecord()`: Creates a record schema with boolean values
- `mixedRecord()`: Creates a record schema with mixed values

## License

MIT 