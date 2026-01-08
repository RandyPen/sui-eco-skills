# Integration with Transactions

## Using BCS in Transactions

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const tx = new Transaction();

// Use tx.pure to serialize BCS values
tx.moveCall({
  target: '0x2::example::function',
  arguments: [
    tx.pure(bcs.U64.serialize(100n)), // Using BCS serialization
    tx.pure.address('0xaddress'),     // Using built-in address serialization
  ],
});

// Custom type serialization
const CustomType = bcs.struct('CustomType', {
  value: bcs.u32(),
  flag: bcs.bool(),
});

tx.moveCall({
  target: '0x2::example::custom',
  arguments: [
    tx.pure(CustomType.serialize({ value: 42, flag: true })),
  ],
});
```

## Sui Types and Transaction Inputs

```typescript
// TransactionData serialization
const transactionData = {
  // ... transaction data
};
const serializedTxData = bcs.TransactionData.serialize(transactionData);

// Object argument serialization
const objectArg = {
  ImmOrOwnedObject: {
    objectId: '0x...',
    version: 123,
    digest: '...',
  },
};
bcs.ObjectArg.serialize(objectArg);
```

## Transaction Argument Patterns

### 1. Basic Argument Serialization
```typescript
const tx = new Transaction();

// Serialize primitive arguments
tx.moveCall({
  target: '0x2::coin::transfer',
  arguments: [
    tx.object(coinId),
    tx.pure(bcs.Address.serialize(recipient)),
    tx.pure(bcs.U64.serialize(amount)),
  ],
});
```

### 2. Struct Arguments
```typescript
// Define Move struct type
const TransferParams = bcs.struct('TransferParams', {
  recipient: bcs.Address,
  amount: bcs.U64,
  memo: bcs.string(),
});

const tx = new Transaction();
tx.moveCall({
  target: '0x2::custom::transfer_with_memo',
  arguments: [
    tx.object(coinId),
    tx.pure(TransferParams.serialize({
      recipient: '0xrecipient',
      amount: 1000n,
      memo: 'Payment for services',
    })),
  ],
});
```

### 3. Vector Arguments
```typescript
// Batch transfer with vector argument
const Recipients = bcs.vector(bcs.struct('Recipient', {
  address: bcs.Address,
  amount: bcs.U64,
}));

const tx = new Transaction();
tx.moveCall({
  target: '0x2::batch::transfer_multiple',
  arguments: [
    tx.object(coinId),
    tx.pure(Recipients.serialize([
      { address: '0xalice', amount: 100n },
      { address: '0xbob', amount: 200n },
      { address: '0xcharlie', amount: 300n },
    ])),
  ],
});
```

## Transaction Data Serialization

### Complete Transaction Example
```typescript
import { Transaction, TransactionData } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

// Build transaction
const tx = new Transaction();
tx.moveCall({
  target: '0x2::coin::transfer',
  arguments: [
    tx.object('0xcoin'),
    tx.pure.address('0xrecipient'),
    tx.pure.u64(1000),
  ],
});
tx.setGasBudget(1000000);

// Get transaction data
const txData = await tx.build({ provider: suiClient });

// Serialize transaction data for signing
const serializedTxData = bcs.TransactionData.serialize(txData);

// For signing (simplified example)
const signature = keypair.signData(serializedTxData);
```

### Gas Configuration
```typescript
// Gas data serialization
const gasData = {
  payment: [
    {
      objectId: '0xgascoin',
      version: 12345,
      digest: 'base64digest',
    },
  ],
  owner: '0xsender',
  price: 1000n,
  budget: 1000000n,
};

const serializedGasData = bcs.GasData.serialize(gasData);
```

## Object Argument Types

### 1. Owned Objects
```typescript
const ownedObjectArg = {
  ImmOrOwnedObject: {
    objectId: '0xobject',
    version: 12345,
    digest: 'base64digest',
  },
};

bcs.ObjectArg.serialize(ownedObjectArg);
```

### 2. Shared Objects
```typescript
const sharedObjectArg = {
  SharedObject: {
    objectId: '0xshared',
    initialSharedVersion: 1000,
    mutable: true,
  },
};

bcs.ObjectArg.serialize(sharedObjectArg);
```

### 3. Receiving Objects
```typescript
const receivingObjectArg = {
  Receiving: {
    objectId: '0xreceiving',
    version: 12345,
    digest: 'base64digest',
  },
};

bcs.ObjectArg.serialize(receivingObjectArg);
```

## Transaction Kind Serialization

### Programmable Transaction
```typescript
const programmableTx = {
  ProgrammableTransaction: {
    inputs: [
      // Input definitions
    ],
    commands: [
      // Command definitions
    ],
  },
};

bcs.TransactionKind.serialize(programmableTx);
```

### Change Epoch Transaction
```typescript
const changeEpochTx = {
  ChangeEpoch: {
    epoch: 10,
    protocol_version: 1,
    storage_charge: 1000n,
    computation_charge: 2000n,
    storage_rebate: 500n,
    epoch_start_timestamp_ms: 1234567890000n,
  },
};

bcs.TransactionKind.serialize(changeEpochTx);
```

## Error Handling in Transaction Serialization

```typescript
async function safeTransactionSerialization(tx: Transaction): Promise<Uint8Array> {
  try {
    const txData = await tx.build({ provider: suiClient });
    return bcs.TransactionData.serialize(txData);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Transaction serialization failed:', error.message);

      // Check for specific error types
      if (error.message.includes('gas budget')) {
        throw new Error('Insufficient gas budget');
      }
      if (error.message.includes('object not found')) {
        throw new Error('Referenced object does not exist');
      }
    }
    throw error;
  }
}
```

## Best Practices for Transaction Integration

### 1. Validate Arguments Before Serialization
```typescript
function validateTransactionArguments(args: any[]): boolean {
  for (const arg of args) {
    if (arg === undefined || arg === null) {
      return false;
    }
    // Add type-specific validation
  }
  return true;
}
```

### 2. Use Helper Functions for Common Patterns
```typescript
function createTransferTransaction(
  coinId: string,
  recipient: string,
  amount: bigint
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: '0x2::coin::transfer',
    arguments: [
      tx.object(coinId),
      tx.pure.address(recipient),
      tx.pure.u64(amount),
    ],
  });
  return tx;
}
```

### 3. Cache Serialized Data
```typescript
const serializationCache = new Map<string, Uint8Array>();

async function getCachedTransactionData(tx: Transaction): Promise<Uint8Array> {
  const cacheKey = tx.getDigest(); // Or create a hash of transaction data

  if (serializationCache.has(cacheKey)) {
    return serializationCache.get(cacheKey)!;
  }

  const txData = await tx.build({ provider: suiClient });
  const serialized = bcs.TransactionData.serialize(txData);
  serializationCache.set(cacheKey, serialized);

  return serialized;
}
```