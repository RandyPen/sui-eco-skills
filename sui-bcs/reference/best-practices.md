# Best Practices

## Type Safety

### 1. Use TypeScript Types
Define TypeScript interfaces for all BCS types to ensure compile-time type safety.

```typescript
// Define TypeScript interface
interface User {
  id: string;
  name: string;
  age: number;
  balance: bigint;
}

// Create corresponding BCS type
const UserType = bcs.struct('User', {
  id: bcs.Address,
  name: bcs.string(),
  age: bcs.u8(),
  balance: bcs.u64(),
});

// Use with type safety
function serializeUser(user: User): Uint8Array {
  return UserType.serialize(user);
}

function parseUser(bytes: Uint8Array): User {
  return UserType.parse(bytes);
}
```

### 2. Runtime Validation
Add data validation logic in transformations to catch errors early.

```typescript
const ValidatedUserType = bcs.struct('ValidatedUser', {
  id: bcs.Address.transform({
    input: (address: string) => {
      if (!isValidAddress(address)) {
        throw new Error('Invalid address format');
      }
      return address;
    },
    output: (address: string) => address,
  }),
  name: bcs.string().transform({
    input: (name: string) => {
      if (name.length < 2 || name.length > 50) {
        throw new Error('Name must be 2-50 characters');
      }
      return name;
    },
    output: (name: string) => name,
  }),
  age: bcs.u8().transform({
    input: (age: number) => {
      if (age < 0 || age > 150) {
        throw new Error('Age must be 0-150');
      }
      return age;
    },
    output: (age: number) => age,
  }),
});
```

### 3. Error Handling
Properly handle serialization/deserialization errors with meaningful messages.

```typescript
function safeSerialize<T>(type: BcsType<T>, data: T): Result<Uint8Array, string> {
  try {
    return { success: true, data: type.serialize(data).toBytes() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown serialization error',
    };
  }
}

function safeParse<T>(type: BcsType<T>, bytes: Uint8Array): Result<T, string> {
  try {
    return { success: true, data: type.parse(bytes) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}
```

## Performance Optimization

### 1. Reuse Type Instances
Avoid repeatedly creating the same BCS types.

```typescript
// Bad: Creates new type each time
function badSerialize(data: any) {
  const type = bcs.struct('Temp', { /* fields */ });
  return type.serialize(data);
}

// Good: Reuse type instance
const ReusableType = bcs.struct('Reusable', { /* fields */ });
function goodSerialize(data: any) {
  return ReusableType.serialize(data);
}
```

### 2. Size Prediction
Predict data size before serialization to allocate appropriate buffers.

```typescript
function serializeWithBuffer<T>(type: BcsType<T>, data: T): Uint8Array {
  // Predict size and allocate buffer
  const size = type.serializedSize(data);
  const buffer = new Uint8Array(size);
  const writer = new BcsWriter(buffer);

  // Serialize directly to buffer
  type.write(data, writer);
  return writer.toBytes();
}
```

### 3. Batch Operations
Batch serialize related data to reduce overhead.

```typescript
async function batchSerializeUsers(users: User[]): Promise<Uint8Array[]> {
  const results = new Array(users.length);

  // Process in batches to avoid blocking
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(user => UserType.serialize(user).toBytes())
    );
    batchResults.forEach((result, index) => {
      results[i + index] = result;
    });
  }

  return results;
}
```

## Compatibility

### 1. Version Control
Add version fields to data structures to handle schema evolution.

```typescript
const VersionedData = bcs.struct('VersionedData', {
  version: bcs.u8(), // Schema version
  data: bcs.byteVector(), // Actual data
});

// Handle different versions
function parseVersionedData(bytes: Uint8Array): any {
  const parsed = VersionedData.parse(bytes);

  switch (parsed.version) {
    case 1:
      return parseV1Data(parsed.data);
    case 2:
      return parseV2Data(parsed.data);
    default:
      throw new Error(`Unsupported version: ${parsed.version}`);
  }
}
```

### 2. Backward Compatibility
Use Option types to handle new fields in updated schemas.

```typescript
// Version 1 schema
const UserV1 = bcs.struct('UserV1', {
  id: bcs.Address,
  name: bcs.string(),
  age: bcs.u8(),
});

// Version 2 schema (adds email field)
const UserV2 = bcs.struct('UserV2', {
  id: bcs.Address,
  name: bcs.string(),
  age: bcs.u8(),
  email: bcs.option(bcs.string()), // Optional for backward compatibility
});

// Migration function
function migrateUserV1ToV2(v1User: any): any {
  return {
    ...v1User,
    email: null, // New field initialized as null
  };
}
```

### 3. Test Serialization
Test data compatibility between different versions.

```typescript
describe('Backward Compatibility', () => {
  it('should migrate V1 data to V2', () => {
    const v1Data = {
      id: '0x123',
      name: 'Alice',
      age: 30,
    };

    // Serialize with V1 schema
    const v1Bytes = UserV1.serialize(v1Data);

    // Simulate migration
    const migrated = migrateUserV1ToV2(v1Data);

    // Should serialize successfully with V2 schema
    expect(() => {
      UserV2.serialize(migrated);
    }).not.toThrow();

    // Deserialize with V2 schema
    const parsed = UserV2.parse(UserV2.serialize(migrated));
    expect(parsed.id).toBe(v1Data.id);
    expect(parsed.name).toBe(v1Data.name);
    expect(parsed.age).toBe(v1Data.age);
    expect(parsed.email).toBeNull();
  });
});
```

## Code Organization

### 1. Centralized Type Definitions
Keep all BCS type definitions in a central location.

```typescript
// types/bcs.ts
import { bcs } from '@mysten/bcs';

export const UserType = bcs.struct('User', {
  id: bcs.Address,
  name: bcs.string(),
  age: bcs.u8(),
});

export const TransactionType = bcs.struct('Transaction', {
  from: bcs.Address,
  to: bcs.Address,
  amount: bcs.u64(),
  timestamp: bcs.u64(),
});

export const BatchType = bcs.vector(TransactionType);

// Export all types
export const BCSTypes = {
  User: UserType,
  Transaction: TransactionType,
  Batch: BatchType,
};
```

### 2. Helper Functions
Create helper functions for common serialization patterns.

```typescript
// helpers/serialization.ts
import { BCSTypes } from '../types/bcs';

export function serializeUser(user: User): Uint8Array {
  return BCSTypes.User.serialize(user).toBytes();
}

export function parseUser(bytes: Uint8Array): User {
  return BCSTypes.User.parse(bytes);
}

export function validateTransaction(tx: any): boolean {
  try {
    BCSTypes.Transaction.serialize(tx);
    return true;
  } catch {
    return false;
  }
}
```

### 3. Configuration Management
Store BCS configuration in a config file.

```typescript
// config/bcs.config.ts
export const BCSConfig = {
  // Maximum sizes for validation
  maxStringLength: 1024,
  maxVectorSize: 1000,
  maxStructDepth: 10,

  // Encoding preferences
  defaultEncoding: 'hex' as 'hex' | 'base64' | 'base58',

  // Performance settings
  bufferSize: 1024 * 1024, // 1MB
  batchSize: 100,
};

// Usage
function createWriter() {
  return new BcsWriter(new Uint8Array(BCSConfig.bufferSize));
}
```

## Security Considerations

### 1. Input Validation
Always validate external input before serialization.

```typescript
function safeExternalInput<T>(type: BcsType<T>, input: any): T {
  // Validate input structure
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input format');
  }

  // Apply type-specific validation
  const validated = validateInput(type, input);

  return validated;
}
```

### 2. Size Limits
Enforce size limits to prevent denial of service attacks.

```typescript
const SafeStringType = bcs.string().transform({
  input: (str: string) => {
    if (str.length > 1024 * 1024) { // 1MB limit
      throw new Error('String too large');
    }
    return str;
  },
  output: (str: string) => str,
});

const SafeVectorType = <T>(elementType: BcsType<T>) =>
  bcs.vector(elementType).transform({
    input: (arr: T[]) => {
      if (arr.length > 10000) { // 10k element limit
        throw new Error('Vector too large');
      }
      return arr;
    },
    output: (arr: T[]) => arr,
  });
```

### 3. Recursion Limits
Limit recursion depth to prevent stack overflow.

```typescript
const MaxDepthType = bcs.struct('MaxDepthType', {
  value: bcs.u64(),
  child: bcs.lazy(() => bcs.option(MaxDepthType)),
});

function parseWithDepthLimit<T>(type: BcsType<T>, bytes: Uint8Array, maxDepth: number = 10): T {
  let depth = 0;

  const limitedType = type.transform({
    input: (val: T) => val,
    output: (val: T) => {
      depth++;
      if (depth > maxDepth) {
        throw new Error(`Exceeded maximum depth: ${maxDepth}`);
      }
      return val;
    },
  });

  return limitedType.parse(bytes);
}
```

## Documentation

### 1. Schema Documentation
Document BCS schemas with comments and examples.

```typescript
/**
 * User data structure
 *
 * Serialization format:
 * - id: Address (32 bytes)
 * - name: string (LEB128 length + UTF-8 bytes)
 * - age: u8 (1 byte)
 * - balance: u64 (8 bytes)
 *
 * Example:
 * ```typescript
 * const user = {
 *   id: '0x123...',
 *   name: 'Alice',
 *   age: 30,
 *   balance: 1000n,
 * };
 * ```
 */
const UserType = bcs.struct('User', {
  id: bcs.Address,
  name: bcs.string(),
  age: bcs.u8(),
  balance: bcs.u64(),
});
```

### 2. Usage Examples
Provide comprehensive usage examples.

```typescript
// examples/user-serialization.ts
import { UserType } from '../types/bcs';

/**
 * Example: Serialize and deserialize user data
 */
function exampleUserSerialization() {
  // Create user data
  const user = {
    id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    name: 'Alice',
    age: 30,
    balance: 1000n,
  };

  // Serialize
  const serialized = UserType.serialize(user);
  console.log('Serialized size:', serialized.toBytes().length);
  console.log('Hex representation:', serialized.toHex());

  // Deserialize
  const deserialized = UserType.parse(serialized);
  console.log('Deserialized user:', deserialized);

  // Verify round trip
  const reSerialized = UserType.serialize(deserialized);
  console.log('Round trip matches:',
    reSerialized.toBytes().every((b, i) => b === serialized.toBytes()[i])
  );
}
```

### 3. Error Handling Guide
Document common errors and solutions.

```typescript
/**
 * Common BCS Errors and Solutions:
 *
 * 1. "Value out of range"
 *    - Cause: Integer value exceeds type limits
 *    - Solution: Use larger integer type (u32 → u64)
 *
 * 2. "Invalid address format"
 *    - Cause: Address string is malformed
 *    - Solution: Validate address with bcs.Address.serialize()
 *
 * 3. "Maximum call stack size exceeded"
 *    - Cause: Recursive type depth too high
 *    - Solution: Limit recursion depth or use iterative approach
 *
 * 4. "Buffer overflow"
 *    - Cause: Data larger than allocated buffer
 *    - Solution: Use serializedSize() to predict size
 */
```