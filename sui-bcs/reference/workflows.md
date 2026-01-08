# Workflows

## Workflow 1: Sui Object Serialization

```typescript
import { bcs } from '@mysten/sui/bcs';

// Define Sui Coin type
const SuiCoin = bcs.struct('SuiCoin', {
  id: bcs.Address,
  balance: bcs.U64,
  // Other fields...
});

// Serialize Coin data
function serializeCoin(coin: { id: string, balance: bigint }) {
  return SuiCoin.serialize(coin);
}

// Deserialize Coin data
function deserializeCoin(bytes: Uint8Array) {
  return SuiCoin.parse(bytes);
}
```

## Workflow 2: Transaction Data Validation

```typescript
import { bcs } from '@mysten/sui/bcs';

// Validate transaction data format
function validateTransactionData(data: any): boolean {
  try {
    // Attempt serialization to validate data format
    bcs.TransactionData.serialize(data);
    return true;
  } catch (error) {
    console.error('Invalid transaction data:', error);
    return false;
  }
}

// Validate address format
function validateAddress(address: string): boolean {
  try {
    bcs.Address.serialize(address);
    return true;
  } catch (error) {
    return false;
  }
}
```

## Workflow 3: Custom Type Registration

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

## Complete Application Workflows

### 1. User Registration Flow
```typescript
import { bcs } from '@mysten/bcs';

// Define user types
const UserProfile = bcs.struct('UserProfile', {
  username: bcs.string(),
  email: bcs.string(),
  age: bcs.u8(),
  createdAt: bcs.u64(),
});

const RegistrationRequest = bcs.struct('RegistrationRequest', {
  profile: UserProfile,
  signature: bcs.byteVector(),
  timestamp: bcs.u64(),
});

// Registration workflow
async function handleRegistration(requestData: any) {
  try {
    // Validate and parse request
    const request = RegistrationRequest.parse(requestData);

    // Validate signature
    const isValid = await validateSignature(request.profile, request.signature);
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Check timestamp (prevent replay attacks)
    const now = Date.now();
    const requestTime = Number(request.timestamp);
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      throw new Error('Request expired');
    }

    // Process registration
    const userId = await saveUserToDatabase(request.profile);

    // Return success response
    return RegistrationResponse.serialize({
      success: true,
      userId,
      timestamp: BigInt(now),
    });

  } catch (error) {
    // Return error response
    return RegistrationResponse.serialize({
      success: false,
      error: error.message,
      timestamp: BigInt(Date.now()),
    });
  }
}
```

### 2. Token Transfer Flow
```typescript
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';

// Define transfer types
const TransferRequest = bcs.struct('TransferRequest', {
  from: bcs.Address,
  to: bcs.Address,
  amount: bcs.U64,
  tokenType: bcs.string(),
  nonce: bcs.u64(),
});

// Transfer workflow
async function processTransfer(requestBytes: Uint8Array): Promise<Transaction> {
  // Parse transfer request
  const request = TransferRequest.parse(requestBytes);

  // Validate request
  validateTransferRequest(request);

  // Create transaction
  const tx = new Transaction();

  // Build transfer transaction
  tx.moveCall({
    target: `0x2::coin::transfer`,
    arguments: [
      tx.object(await getCoinObjectId(request.from, request.tokenType)),
      tx.pure.address(request.to),
      tx.pure.u64(request.amount),
    ],
  });

  // Set gas budget
  tx.setGasBudget(await calculateGasBudget(request));

  return tx;
}

function validateTransferRequest(request: any) {
  // Check amount is positive
  if (request.amount <= 0n) {
    throw new Error('Amount must be positive');
  }

  // Check addresses are valid
  if (!isValidAddress(request.from) || !isValidAddress(request.to)) {
    throw new Error('Invalid address');
  }

  // Check nonce to prevent replay attacks
  if (!isValidNonce(request.from, request.nonce)) {
    throw new Error('Invalid nonce');
  }
}
```

### 3. Batch Processing Flow
```typescript
import { bcs } from '@mysten/bcs';

// Define batch operation types
const BatchOperation = bcs.enum('BatchOperation', {
  Transfer: TransferRequest,
  Mint: MintRequest,
  Burn: BurnRequest,
});

const BatchRequest = bcs.struct('BatchRequest', {
  operations: bcs.vector(BatchOperation),
  batchId: bcs.string(),
  timestamp: bcs.u64(),
});

// Batch processing workflow
async function processBatch(requestBytes: Uint8Array) {
  const batch = BatchRequest.parse(requestBytes);

  // Validate batch
  if (batch.operations.length > 100) {
    throw new Error('Batch too large');
  }

  // Process operations sequentially
  const results = [];
  for (const operation of batch.operations) {
    try {
      if ('Transfer' in operation) {
        results.push(await processTransfer(operation.Transfer));
      } else if ('Mint' in operation) {
        results.push(await processMint(operation.Mint));
      } else if ('Burn' in operation) {
        results.push(await processBurn(operation.Burn));
      }
    } catch (error) {
      results.push({ error: error.message });
    }
  }

  // Return batch results
  return BatchResponse.serialize({
    batchId: batch.batchId,
    results,
    completedAt: BigInt(Date.now()),
  });
}
```

## Error Handling Workflows

### 1. Graceful Error Recovery
```typescript
async function safeBCSOperation<T>(
  operation: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('BCS operation failed:', error);

    if (fallback) {
      try {
        return await fallback();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw new Error('Operation and fallback both failed');
      }
    }

    throw error;
  }
}

// Usage
const result = await safeBCSOperation(
  () => complexType.parse(data),
  () => simpleType.parse(data) // Fallback to simpler parsing
);
```

### 2. Validation Pipeline
```typescript
function createValidationPipeline<T>(validators: Array<(data: T) => void>) {
  return function validate(data: T): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const validator of validators) {
      try {
        validator(data);
      } catch (error) {
        if (error instanceof Error) {
          errors.push(error.message);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };
}

// Usage
const validateUser = createValidationPipeline([
  (user) => {
    if (user.age < 18) throw new Error('Must be 18 or older');
  },
  (user) => {
    if (!user.email.includes('@')) throw new Error('Invalid email');
  },
  // More validators...
]);
```

## Testing Workflows

### 1. End-to-End Test
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { bcs } from '@mysten/bcs';

describe('User Registration Workflow', () => {
  const UserProfile = bcs.struct('UserProfile', {
    username: bcs.string(),
    email: bcs.string(),
    age: bcs.u8(),
  });

  beforeEach(() => {
    // Setup test data
  });

  it('should complete full registration flow', async () => {
    // 1. Create registration request
    const profile = {
      username: 'testuser',
      email: 'test@example.com',
      age: 25,
    };

    // 2. Serialize request
    const serialized = UserProfile.serialize(profile);

    // 3. Deserialize (simulate server processing)
    const deserialized = UserProfile.parse(serialized);

    // 4. Verify data integrity
    expect(deserialized.username).toBe(profile.username);
    expect(deserialized.email).toBe(profile.email);
    expect(deserialized.age).toBe(profile.age);

    // 5. Verify serialization/deserialization round trip
    const reSerialized = UserProfile.serialize(deserialized);
    expect(reSerialized.toBytes()).toEqual(serialized.toBytes());
  });

  it('should handle invalid data gracefully', () => {
    const invalidProfile = {
      username: '', // Empty username
      email: 'invalid-email',
      age: 300, // Invalid age
    };

    expect(() => {
      UserProfile.serialize(invalidProfile);
    }).toThrow();
  });
});
```

### 2. Performance Test
```typescript
describe('Performance Workflow', () => {
  it('should handle large batches efficiently', () => {
    const BatchItem = bcs.struct('BatchItem', {
      id: bcs.u64(),
      data: bcs.string(),
      timestamp: bcs.u64(),
    });

    const Batch = bcs.vector(BatchItem);

    // Create large batch
    const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
      id: BigInt(i),
      data: `item-${i}`.repeat(10),
      timestamp: BigInt(Date.now() + i),
    }));

    // Measure serialization time
    const start = performance.now();
    const serialized = Batch.serialize(largeBatch);
    const serializationTime = performance.now() - start;

    // Measure deserialization time
    const start2 = performance.now();
    const deserialized = Batch.parse(serialized);
    const deserializationTime = performance.now() - start2;

    console.log(`Serialization: ${serializationTime}ms`);
    console.log(`Deserialization: ${deserializationTime}ms`);

    expect(serializationTime).toBeLessThan(100); // Should be fast
    expect(deserializationTime).toBeLessThan(100); // Should be fast
    expect(deserialized.length).toBe(1000);
  });
});
```