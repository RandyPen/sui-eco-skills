# Custom BCS Types

## Creating Custom Types

```typescript
import { BcsType } from '@mysten/bcs';

const CustomType = new BcsType<MyType, MyInput>({
  name: 'CustomType',
  read: (reader) => {
    // Custom deserialization logic
    const field1 = reader.readU32();
    const field2 = reader.readString();
    return { field1, field2 };
  },
  write: (value, writer) => {
    // Custom serialization logic
    writer.writeU32(value.field1);
    writer.writeString(value.field2);
  },
  serializedSize: (value) => {
    // Optional: calculate serialized size
    return 4 + writer.getStringSize(value.field2);
  },
});

// Using custom type
CustomType.serialize({ field1: 42, field2: "test" });
```

## Extending Existing Types

```typescript
// Add custom methods to base types
const enhancedU32 = bcs.u32().transform({
  name: 'EnhancedU32',
  input: (val: number) => {
    // Pre-processing logic
    return val * 2;
  },
  output: (val: number) => {
    // Post-processing logic
    return val / 2;
  },
});

// Combine multiple transformations
const ProcessedType = bcs.string()
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
```

## Custom Type Examples

### 1. Fixed-Point Decimal
```typescript
const DecimalType = new BcsType<number, number>({
  name: 'Decimal',
  read: (reader) => {
    const raw = reader.readU64();
    return Number(raw) / 10000; // 4 decimal places
  },
  write: (value, writer) => {
    const raw = BigInt(Math.round(value * 10000));
    writer.writeU64(raw);
  },
  serializedSize: () => 8, // u64 is always 8 bytes
});

// Usage
DecimalType.serialize(123.4567); // Stores 1234567
const value = DecimalType.parse(bytes); // Returns 123.4567
```

### 2. UUID Type
```typescript
const UUIDType = new BcsType<string, string>({
  name: 'UUID',
  read: (reader) => {
    const bytes = reader.readBytes(16);
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  },
  write: (value, writer) => {
    const hex = value.replace(/-/g, '');
    if (!/^[0-9a-f]{32}$/i.test(hex)) {
      throw new Error('Invalid UUID format');
    }
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    writer.writeBytes(bytes);
  },
  serializedSize: () => 16,
});
```

### 3. Timestamp with Timezone
```typescript
const TimestampWithTz = new BcsType<{ timestamp: Date; timezone: string }, { timestamp: Date; timezone: string }>({
  name: 'TimestampWithTz',
  read: (reader) => {
    const timestamp = new Date(Number(reader.readU64()));
    const timezone = reader.readString();
    return { timestamp, timezone };
  },
  write: (value, writer) => {
    writer.writeU64(BigInt(value.timestamp.getTime()));
    writer.writeString(value.timezone);
  },
  serializedSize: (value) => {
    return 8 + writer.getStringSize(value.timezone);
  },
});
```

## Type Registration System

### Registering Custom Types
```typescript
import { bcs } from '@mysten/bcs';

// Register application-specific types
function registerAppTypes() {
  // User type
  bcs.registerStructType('User', {
    id: 'address',
    name: 'string',
    age: 'u8',
    balance: 'u64',
  });

  // Transaction type
  bcs.registerEnumType('TxType', {
    Transfer: 'address',
    Mint: 'u64',
    Burn: null,
  });

  // Use registered types
  const UserType = bcs.struct('User');
  const TxType = bcs.enum('TxType');
}
```

### Type Aliases
```typescript
// Create type aliases for complex types
bcs.registerAlias('UserId', 'address');
bcs.registerAlias('Amount', 'u64');
bcs.registerAlias('Timestamp', 'u64');

// Use aliases in struct definitions
const Transaction = bcs.struct('Transaction', {
  from: 'UserId',
  to: 'UserId',
  amount: 'Amount',
  timestamp: 'Timestamp',
});
```

## Advanced Custom Types

### 1. Bitfield Type
```typescript
const BitfieldType = new BcsType<number[], number[]>({
  name: 'Bitfield',
  read: (reader) => {
    const length = reader.readUleb128();
    const bits: number[] = [];
    for (let i = 0; i < length; i++) {
      bits.push(reader.readU8());
    }
    return bits;
  },
  write: (value, writer) => {
    writer.writeUleb128(value.length);
    for (const bit of value) {
      writer.writeU8(bit);
    }
  },
  serializedSize: (value) => {
    let size = writer.getUleb128Size(value.length);
    size += value.length; // Each bit is 1 byte
    return size;
  },
});
```

### 2. Variable-Length Integer Array
```typescript
const VarIntArray = new BcsType<bigint[], bigint[]>({
  name: 'VarIntArray',
  read: (reader) => {
    const length = reader.readUleb128();
    const values: bigint[] = [];
    for (let i = 0; i < length; i++) {
      values.push(reader.readUleb128());
    }
    return values;
  },
  write: (value, writer) => {
    writer.writeUleb128(value.length);
    for (const val of value) {
      writer.writeUleb128(val);
    }
  },
  serializedSize: (value) => {
    let size = writer.getUleb128Size(value.length);
    for (const val of value) {
      size += writer.getUleb128Size(val);
    }
    return size;
  },
});
```

### 3. Compact String Array
```typescript
const CompactStringArray = new BcsType<string[], string[]>({
  name: 'CompactStringArray',
  read: (reader) => {
    const length = reader.readUleb128();
    const strings: string[] = [];
    for (let i = 0; i < length; i++) {
      strings.push(reader.readString());
    }
    return strings;
  },
  write: (value, writer) => {
    writer.writeUleb128(value.length);
    for (const str of value) {
      writer.writeString(str);
    }
  },
  serializedSize: (value) => {
    let size = writer.getUleb128Size(value.length);
    for (const str of value) {
      size += writer.getStringSize(str);
    }
    return size;
  },
});
```

## Testing Custom Types

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { bcs } from '@mysten/bcs';

describe('CustomType', () => {
  const CustomType = new BcsType<{ field1: number; field2: string }, { field1: number; field2: string }>({
    name: 'CustomType',
    read: (reader) => ({
      field1: reader.readU32(),
      field2: reader.readString(),
    }),
    write: (value, writer) => {
      writer.writeU32(value.field1);
      writer.writeString(value.field2);
    },
  });

  it('should serialize and deserialize correctly', () => {
    const original = { field1: 42, field2: 'test' };
    const serialized = CustomType.serialize(original);
    const deserialized = CustomType.parse(serialized);

    expect(deserialized.field1).toBe(original.field1);
    expect(deserialized.field2).toBe(original.field2);
  });

  it('should handle edge cases', () => {
    const edgeCases = [
      { field1: 0, field2: '' },
      { field1: 4294967295, field2: 'a'.repeat(1000) },
    ];

    for (const testCase of edgeCases) {
      const serialized = CustomType.serialize(testCase);
      const deserialized = CustomType.parse(serialized);
      expect(deserialized).toEqual(testCase);
    }
  });
});
```

## Best Practices for Custom Types

### 1. Document Serialization Format
```typescript
/**
 * CustomType serialization format:
 * - field1: u32 (4 bytes)
 * - field2: string (LEB128 length + UTF-8 bytes)
 *
 * Total size: 4 + (1-5 bytes length) + string bytes
 */
const CustomType = new BcsType<MyType, MyInput>({
  // ... implementation
});
```

### 2. Provide Size Calculation
```typescript
const EfficientType = new BcsType<MyType, MyInput>({
  name: 'EfficientType',
  read: (reader) => { /* ... */ },
  write: (value, writer) => { /* ... */ },
  serializedSize: (value) => {
    // Calculate exact size for memory allocation
    return 4 + writer.getStringSize(value.field);
  },
});
```

### 3. Handle Versioning
```typescript
const VersionedType = new BcsType<MyType, MyInput>({
  name: 'VersionedType',
  read: (reader) => {
    const version = reader.readU8();
    if (version === 1) {
      return { /* v1 format */ };
    } else if (version === 2) {
      return { /* v2 format */ };
    }
    throw new Error(`Unsupported version: ${version}`);
  },
  write: (value, writer) => {
    writer.writeU8(2); // Current version
    // Write v2 format
  },
});
```