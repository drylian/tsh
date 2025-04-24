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
import { t } from '@caeljs/tsh';

// Define a schema
const userSchema = object({
  name: t.string().required(),
  age: t.number().positive().int(),
  email: t.string().email(),
  tags: t.array(t.string()).minLength(1),
});

// Validate data
const result = t.validate({
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

- `t.string()` - Validates string values
- `t.number()` - Validates number values
- `t.boolean()` - Validates boolean values
- `t.any()` - Accepts any value
- `t.enum()` - Validates against enum values

### Complex Validators

- `t.object(shape)` - Validates object structures
- `t.array(shape)` - Validates arrays
- `t.record(keyShape, valueShape)` - Validates dictionary/map structures
- `t.union(shapes)` - Validates against multiple possible shapes

## Modifiers

- `.optional()` - Makes a field optional
- `.nullable()` - Allows null values
- `.required()` - Requires non-null, non-undefined values
- `.partial()` - Makes all object properties optional
- `.refine(predicate, message)` - Adds custom validation

## Utility Functions

### Validation

- `t.validate(value, shape)` - Validates a value against a shape
- `t.isValid(value, shape)` - Checks if a value is valid

### Object Manipulation

- `t.pick(shape, keys)` - Creates a shape with only specified keys
- `t.omit(shape, keys)` - Creates a shape without specified keys
- `t.merge(shape1, shape2)` - Merges two object shapes
- `t.extend(shape, extensions)` - Extends an object shape

### Array Utilities

- `t.nonEmptyArray(shape)` - Requires non-empty arrays
- `t.uniqueArray(shape)` - Requires unique array elements
- `t.minLength(shape, min)` - Sets minimum array length
- `t.maxLength(shape, max)` - Sets maximum array length

## Common Validators

### String Validators

- `t.email()` - Validates email format
- `t.uuid()` - Validates UUID format
- `t.url()` - Validates URL format
- `t.ip()` - Validates IP address
- `t.regex(pattern)` - Validates against regex

### Number Validators

- `t.int()` - Validates integers
- `t.positive()` - Validates positive numbers
- `t.negative()` - Validates negative numbers
- `t.port()` - Validates port numbers
- `t.percentage()` - Validates percentages

## Advanced Features

### Logical Operators

- `t.and(shape1, shape2)` - Requires both shapes to match (intersection)
- `t.or(shape1, shape2)` - Requires either shape to match (union)
- `t.not(shape)` - Requires value to NOT match shape

### Coercion

```typescript
import { t } from '@caeljs/tsh';

// Coerce values to specific types
const coercedString = t.coerce.string(); // Converts value to string
const coercedNumber = t.coerce.number(); // Converts value to number
const coercedBoolean = t.coerce.boolean(); // Converts value to boolean
```

### Custom Validators

```typescript
import { t } from '@caeljs/tsh';

// Create custom validator
const evenNumber = t.custom(
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
const userSchema = t.object({
  name: t.string(),
  age: t.number(),
});

type User = t.infer<typeof userSchema>;
// Equivalent to:
// type User = {
//   name: string;
//   age: number;
// }
```

## Random Value Generation

```typescript
import { random, randomInt, randomUuid } from '@caeljs/tsh';

t.random(); // Random string
t.randomInt(1, 100); // Random integer between 1-100
t.randomUuid(); // Random UUID v4
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
```