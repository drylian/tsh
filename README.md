```markdown
# Type-Safe Validation Library

A robust, type-safe validation library for TypeScript that provides runtime validation while maintaining full type safety.

## Features

- 🛠️ **Type-safe validators** with TypeScript inference
- 🧩 **Composable API** for building complex validation schemas
- 🔍 **Runtime validation** with detailed error reporting
- 🏗️ **Object shape validation** with nested structures
- 🔄 **Coercion support** for common type conversions
- ✨ **Utility functions** for common validation patterns

## Installation

```bash
npm install @caeljs/tsh
# or
yarn add @caeljs/tsh
```

## Basic Usage

```typescript
import { c } from '@caeljs/tsh';

// Define a schema
const userSchema = object({
  name: c.string().required(),
  age: c.number().positive().int(),
  email: c.string().email(),
  tags: c.array(c.string()).minLength(1),
});

// Validate data
const result = c.validate({
  name: "Drylian",
  age: 23,
  email: "drylian@example.com",
  tags: ["developer", "typescript"]
}, userSchema);

if (result.success) {
  console.log("Valid data:", result.data);
} else {
  console.error("Validation error:", result.error);
}
```

## Core Validators

### Primitive Validators

- `c.string()` - Validates string values
- `c.number()` - Validates number values
- `c.boolean()` - Validates boolean values
- `c.any()` - Accepts any value
- `c.enum()` - Validates against enum values

### Complex Validators

- `c.object(shape)` - Validates object structures
- `c.array(shape)` - Validates arrays
- `c.record(keyShape, valueShape)` - Validates dictionary/map structures
- `c.union(shapes)` - Validates against multiple possible shapes

## Modifiers

- `.optional()` - Makes a field optional
- `.nullable()` - Allows null values
- `.required()` - Requires non-null, non-undefined values
- `.partial()` - Makes all object properties optional
- `.refine(predicate, message)` - Adds custom validation

## Utility Functions

### Validation

- `c.validate(value, shape)` - Validates a value against a shape
- `c.isValid(value, shape)` - Checks if a value is valid

### Object Manipulation

- `c.pick(shape, keys)` - Creates a shape with only specified keys
- `c.omit(shape, keys)` - Creates a shape without specified keys
- `c.merge(shape1, shape2)` - Merges two object shapes
- `c.extend(shape, extensions)` - Extends an object shape

### Array Utilities

- `c.nonEmptyArray(shape)` - Requires non-empty arrays
- `c.uniqueArray(shape)` - Requires unique array elements
- `c.minLength(shape, min)` - Sets minimum array length
- `c.maxLength(shape, max)` - Sets maximum array length

## Common Validators

### String Validators

- `c.email()` - Validates email format
- `c.uuid()` - Validates UUID format
- `c.url()` - Validates URL format
- `c.ip()` - Validates IP address
- `c.regex(pattern)` - Validates against regex

### Number Validators

- `c.int()` - Validates integers
- `c.positive()` - Validates positive numbers
- `c.negative()` - Validates negative numbers
- `c.port()` - Validates port numbers
- `c.percentage()` - Validates percentages

## Advanced Features

### Logical Operators

- `c.and(shape1, shape2)` - Requires both shapes to match (intersection)
- `c.or(shape1, shape2)` - Requires either shape to match (union)
- `c.not(shape)` - Requires value to NOT match shape

### Coercion

```typescript
import { c } from '@caeljs/tsh';

// Coerce values to specific types
const coercedString = c.coerce.string(); // Converts value to string
const coercedNumber = c.coerce.number(); // Converts value to number
const coercedBoolean = c.coerce.boolean(); // Converts value to boolean
```

### Custom Validators

```typescript
import { custom } from '@caeljs/tsh';

// Create custom validator
const evenNumber = custom(
  (value): value is number => typeof value === 'number' && value % 2 === 0,
  'Value must be an even number'
);
```

## Error Handling

All validation errors include detailed information about what failed:

```typescript
try {
  shape.parse(invalidValue);
} catch (error) {
  if (error instanceof TshShapeError) {
    console.error(error.message);
    console.error(error.path); // Path to invalid field
    console.error(error.value); // Invalid value
  }
}
```

## Type Safety

The library provides full TypeScript type inference:

```typescript
const userSchema = object({
  name: string(),
  age: number(),
});

type User = InferShapeType<typeof userSchema>;
// Equivalent to:
// type User = {
//   name: string;
//   age: number;
// }
```

## Random Value Generation

```typescript
import { random, randomInt, randomUuid } from '@caeljs/tsh';

random(); // Random string
randomInt(1, 100); // Random integer between 1-100
randomUuid(); // Random UUID v4
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
```

This README includes:

1. A clear description of the library's purpose
2. Installation instructions
3. Basic usage example
4. Comprehensive documentation of all validators and utilities
5. Type safety information
6. Error handling details
7. Advanced features
8. Contribution guidelines

The documentation is organized in a logical flow from basic to advanced usage, making it easy for new users to get started while still providing complete reference material for experienced users.