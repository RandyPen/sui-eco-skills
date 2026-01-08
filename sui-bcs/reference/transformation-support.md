# Transformation Support

## Type Transformations

```typescript
// String to number transformation
const StringNumber = bcs.string().transform({
  name: 'StringNumber',
  input: (val: number) => val.toString(), // During serialization: number -> string
  output: (val: string) => parseInt(val), // During deserialization: string -> number
});

// Using transformed type
StringNumber.serialize(42); // Serialize number 42
const num = StringNumber.parse(bytes); // Returns number

// Date transformation
const DateType = bcs.u64().transform({
  name: 'DateType',
  input: (date: Date) => BigInt(date.getTime()),
  output: (timestamp: bigint) => new Date(Number(timestamp)),
});

DateType.serialize(new Date());
const date = DateType.parse(bytes);
```

## Validation Transformations

```typescript
// Transformation with validation
const PositiveNumber = bcs.u32().transform({
  name: 'PositiveNumber',
  input: (val: number) => {
    if (val <= 0) throw new Error('Value must be positive');
    return val;
  },
  output: (val: number) => {
    if (val <= 0) throw new Error('Invalid positive number');
    return val;
  },
});

// Range validation
const AgeType = bcs.u8().transform({
  name: 'AgeType',
  input: (age: number) => {
    if (age < 0 || age > 150) throw new Error('Age must be between 0 and 150');
    return age;
  },
  output: (age: number) => {
    if (age < 0 || age > 150) throw new Error('Invalid age value');
    return age;
  },
});
```

## Common Transformation Patterns

### 1. String Formatting
```typescript
const TrimmedString = bcs.string().transform({
  name: 'TrimmedString',
  input: (val: string) => val.trim(),
  output: (val: string) => val.trim(),
});

const LowerCaseString = bcs.string().transform({
  name: 'LowerCaseString',
  input: (val: string) => val.toLowerCase(),
  output: (val: string) => val.toLowerCase(),
});
```

### 2. Number Formatting
```typescript
const Percentage = bcs.u8().transform({
  name: 'Percentage',
  input: (val: number) => Math.round(val * 100),
  output: (val: number) => val / 100,
});

const FixedDecimal = bcs.u64().transform({
  name: 'FixedDecimal',
  input: (val: number) => BigInt(Math.round(val * 10000)),
  output: (val: bigint) => Number(val) / 10000,
});
```

### 3. Data Conversion
```typescript
const HexString = bcs.byteVector().transform({
  name: 'HexString',
  input: (val: string) => {
    // Convert hex string to bytes
    if (!/^[0-9a-fA-F]+$/.test(val)) {
      throw new Error('Invalid hex string');
    }
    const bytes = new Uint8Array(val.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(val.substr(i * 2, 2), 16);
    }
    return bytes;
  },
  output: (val: Uint8Array) => {
    // Convert bytes to hex string
    return Array.from(val)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },
});
```

## Chained Transformations

```typescript
// Combine multiple transformations
const ProcessedString = bcs.string()
  .transform({
    name: 'Trim',
    input: (val: string) => val.trim(),
    output: (val: string) => val.trim(),
  })
  .transform({
    name: 'UpperCase',
    input: (val: string) => val.toUpperCase(),
    output: (val: string) => val.toLowerCase(),
  });

// Complex validation chain
const ValidatedUserInput = bcs.string()
  .transform({
    name: 'Trim',
    input: (val: string) => val.trim(),
    output: (val: string) => val.trim(),
  })
  .transform({
    name: 'LengthCheck',
    input: (val: string) => {
      if (val.length < 3 || val.length > 50) {
        throw new Error('String must be 3-50 characters');
      }
      return val;
    },
    output: (val: string) => val,
  })
  .transform({
    name: 'NoSpecialChars',
    input: (val: string) => {
      if (/[^a-zA-Z0-9 ]/.test(val)) {
        throw new Error('No special characters allowed');
      }
      return val;
    },
    output: (val: string) => val,
  });
```

## Transformation Best Practices

### 1. Idempotent Transformations
Transformations should be idempotent - applying them multiple times should produce the same result.

```typescript
// Good: Idempotent transformation
const TrimTransform = bcs.string().transform({
  name: 'Trim',
  input: (val: string) => val.trim(),
  output: (val: string) => val.trim(),
});

// Bad: Non-idempotent transformation
const BadTransform = bcs.string().transform({
  name: 'Bad',
  input: (val: string) => val + '!', // Adds '!' each time
  output: (val: string) => val.slice(0, -1), // Removes last character
});
```

### 2. Error Messages
Provide clear error messages in transformations to help with debugging.

```typescript
const ValidAge = bcs.u8().transform({
  name: 'ValidAge',
  input: (age: number) => {
    if (age < 0) throw new Error('Age cannot be negative');
    if (age > 150) throw new Error('Age cannot exceed 150');
    if (!Number.isInteger(age)) throw new Error('Age must be an integer');
    return age;
  },
  output: (age: number) => age,
});
```

### 3. Performance Considerations
Avoid expensive operations in transformations that are called frequently.

```typescript
// Good: Simple transformation
const SimpleTransform = bcs.string().transform({
  name: 'Simple',
  input: (val: string) => val.toLowerCase(),
  output: (val: string) => val,
});

// Avoid: Expensive operations
const ExpensiveTransform = bcs.string().transform({
  name: 'Expensive',
  input: (val: string) => {
    // Avoid complex regex or string operations in hot paths
    return val.replace(/\s+/g, ' ').trim();
  },
  output: (val: string) => val,
});
```