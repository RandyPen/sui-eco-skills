# Serialization Patterns

## Basic Serialization Patterns

```typescript
// 1. Direct serialization
const bytes = bcs.u32().serialize(42).toBytes();

// 2. Using SerializedBcs
const serialized = bcs.u32().serialize(42);
const hex = serialized.toHex();      // Hexadecimal string
const base64 = serialized.toBase64(); // Base64 string
const base58 = serialized.toBase58(); // Base58 string

// 3. Parsing from encoded strings
const fromHex = bcs.u32().parseFromHex(hex);
const fromBase64 = bcs.u32().parseFromBase64(base64);
const fromBase58 = bcs.u32().parseFromBase58(base58);
```

## Complex Data Structure Serialization

```typescript
// Define blockchain transaction structure
const Transaction = bcs.struct('Transaction', {
  sender: bcs.string(),
  recipient: bcs.string(),
  amount: bcs.u64(),
  timestamp: bcs.u64(),
  nonce: bcs.u32(),
});

// Define account structure
const Account = bcs.struct('Account', {
  address: bcs.string(),
  balance: bcs.u64(),
  transactions: bcs.vector(Transaction),
});

// Serialize account data
const accountData = {
  address: "0x123...",
  balance: 5000n,
  transactions: [
    {
      sender: "0x123...",
      recipient: "0x456...",
      amount: 100n,
      timestamp: 1234567890n,
      nonce: 1,
    },
    // More transactions...
  ],
};

const serializedAccount = Account.serialize(accountData);
```

## Recursive Type Definition

```typescript
// Define recursive types using lazy evaluation
const TreeNode = bcs.struct('TreeNode', {
  value: bcs.u64(),
  children: bcs.lazy(() => bcs.vector(TreeNode)), // Recursive reference
});

// Usage
const tree = {
  value: 1n,
  children: [
    { value: 2n, children: [] },
    { value: 3n, children: [
      { value: 4n, children: [] },
    ]},
  ],
};

TreeNode.serialize(tree);
```

## Encoding Formats

### Hexadecimal Encoding
- Most common for blockchain data
- Easy to read and debug
- Used in transaction hashes and addresses

### Base64 Encoding
- More compact than hexadecimal
- Used in URLs and JSON data
- Common for binary data in web applications

### Base58 Encoding
- Used in Bitcoin and other cryptocurrencies
- Avoids ambiguous characters (0, O, I, l)
- Used in Sui addresses

## Serialization Workflows

### Data Validation Pattern
```typescript
function validateAndSerialize<T>(type: BcsType<T>, data: T): Uint8Array {
  try {
    return type.serialize(data).toBytes();
  } catch (error) {
    console.error('Serialization failed:', error);
    throw new Error('Invalid data format');
  }
}
```

### Batch Serialization Pattern
```typescript
function serializeBatch<T>(type: BcsType<T>, items: T[]): Uint8Array[] {
  return items.map(item => type.serialize(item).toBytes());
}
```

### Size-Aware Serialization
```typescript
function serializeWithSizeCheck<T>(type: BcsType<T>, data: T, maxSize: number): Uint8Array {
  const size = type.serializedSize(data);
  if (size > maxSize) {
    throw new Error(`Data too large: ${size} > ${maxSize}`);
  }
  return type.serialize(data).toBytes();
}
```

## Common Patterns

### 1. Configuration Serialization
```typescript
const Config = bcs.struct('Config', {
  version: bcs.u8(),
  settings: bcs.map(bcs.string(), bcs.string()),
  enabled: bcs.bool(),
});
```

### 2. Event Logging
```typescript
const Event = bcs.enum('Event', {
  Transfer: bcs.struct('TransferEvent', {
    from: bcs.string(),
    to: bcs.string(),
    amount: bcs.u64(),
  }),
  Mint: bcs.struct('MintEvent', {
    to: bcs.string(),
    amount: bcs.u64(),
  }),
  Burn: bcs.struct('BurnEvent', {
    from: bcs.string(),
    amount: bcs.u64(),
  }),
});
```

### 3. State Machine
```typescript
const State = bcs.enum('State', {
  Initialized: null,
  Active: bcs.u64(), // timestamp
  Paused: bcs.string(), // reason
  Terminated: bcs.u64(), // termination timestamp
});
```