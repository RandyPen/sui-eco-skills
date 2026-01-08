# Transaction Serialization

Transaction serialization converts transaction data to bytes for signing and execution. Understanding serialization is crucial for offline transaction building and advanced use cases.

## Building Transaction Bytes

Convert a transaction to bytes for signing:

```typescript
const tx = new Transaction();
// ... Add transaction commands

// Build transaction bytes with client (recommended)
const bytes = await tx.build({ client });

// Manually set sender (may be needed when building transaction bytes)
tx.setSender(senderAddress);
await tx.build({ client });

// Build with specific options
const bytes = await tx.build({
  client,
  onlyTransactionKind: false, // Include gas data (default)
});
```

## Deserialize from Bytes

Create a Transaction instance from serialized bytes:

```typescript
// Deserialize transaction bytes
const bytes = getTransactionBytesFromSomewhere();
const tx = Transaction.from(bytes);

// Deserialize and continue building
const tx = Transaction.from(bytes);
tx.moveCall({
  target: '0x2::example::add_operation',
  arguments: [tx.object(someObject)],
});

// Verify deserialized transaction
console.log('Transaction commands:', tx.getCommands());
console.log('Transaction inputs:', tx.getInputs());
```

## Offline Building

Build transactions without network access:

```typescript
import { Inputs } from '@mysten/sui/transactions';

const tx = new Transaction();

// Set sender (required for offline building)
tx.setSender(senderAddress);

// Use fully resolved object references
tx.object(Inputs.ObjectRef({ digest, objectId, version }));
tx.object(Inputs.SharedObjectRef({ objectId, initialSharedVersion, mutable }));

// Set gas configuration manually
tx.setGasPrice(gasPrice);
tx.setGasBudget(gasBudget);
tx.setGasPayment([gasCoinRef]);

// Build without client
const bytes = await tx.build(); // Don't pass client parameter

// For signing
const signature = await keypair.signTransaction(bytes);
```

## Serialization Formats

### Transaction Kind Bytes

Transaction kind bytes exclude gas data, useful for sponsored transactions:

```typescript
// Build only transaction kind
const kindBytes = await tx.build({ client, onlyTransactionKind: true });

// Create transaction from kind bytes
const sponsoredTx = Transaction.fromKind(kindBytes);

// Add gas data separately
sponsoredTx.setSender(sender);
sponsoredTx.setGasOwner(sponsor);
sponsoredTx.setGasPayment(sponsorCoins);
```

### Complete Transaction Bytes

Complete bytes include both transaction kind and gas data:

```typescript
// Build complete transaction (default)
const completeBytes = await tx.build({ client });

// Complete bytes include:
// 1. Transaction kind (commands, inputs)
// 2. Gas data (price, budget, payment)
// 3. Sender address
```

## Serialization for Storage

Serialize transactions for later use:

```typescript
// Serialize for storage
async function serializeTransaction(tx: Transaction, client?: SuiClient) {
  const bytes = client ? await tx.build({ client }) : await tx.build();

  // Convert to base64 for storage
  const base64 = Buffer.from(bytes).toString('base64');

  // Store metadata for reconstruction
  const metadata = {
    sender: tx.getSender(),
    commands: tx.getCommands(),
    inputs: tx.getInputs(),
    gasConfig: {
      price: tx.getGasPrice(),
      budget: tx.getGasBudget(),
      payment: tx.getGasPayment(),
    },
  };

  return { bytes, base64, metadata };
}

// Deserialize from storage
function deserializeTransaction(base64: string, metadata?: any) {
  const bytes = Buffer.from(base64, 'base64');

  if (metadata) {
    // Reconstruct with metadata
    const tx = Transaction.from(bytes);

    // Verify reconstruction
    if (metadata.sender && tx.getSender() !== metadata.sender) {
      tx.setSender(metadata.sender);
    }

    return tx;
  }

  // Simple deserialization
  return Transaction.from(bytes);
}
```

## BCS Serialization Details

Transactions use BCS (Binary Canonical Serialization) format:

```typescript
import { bcs } from '@mysten/sui/bcs';

// Transaction BCS schema
const TransactionData = bcs.struct('TransactionData', {
  kind: bcs.enum('TransactionKind', {
    ProgrammableTransaction: bcs.struct('ProgrammableTransaction', {
      inputs: bcs.vector(bcs.enum('CallArg', {
        Object: bcs.enum('ObjectArg', {
          ImmOrOwnedObject: bcs.struct('ObjectRef', {
            objectId: bcs.Address,
            version: bcs.U64,
            digest: bcs.Digest,
          }),
          SharedObject: bcs.struct('SharedObjectRef', {
            objectId: bcs.Address,
            initialSharedVersion: bcs.U64,
            mutable: bcs.bool(),
          }),
          Receiving: bcs.struct('ObjectRef', {
            objectId: bcs.Address,
            version: bcs.U64,
            digest: bcs.Digest,
          }),
        }),
        Pure: bcs.vector(bcs.U8),
        Other: bcs.vector(bcs.U8),
      })),
      transactions: bcs.vector(bcs.enum('Command', {
        // ... command definitions
      })),
    }),
    ChangeEpoch: bcs.struct('ChangeEpoch', { /* ... */ }),
    Genesis: bcs.struct('Genesis', { /* ... */ }),
    ConsensusCommitPrologue: bcs.struct('ConsensusCommitPrologue', { /* ... */ }),
  }),
  sender: bcs.Address,
  gasData: bcs.struct('GasData', {
    payment: bcs.vector(bcs.struct('ObjectRef', {
      objectId: bcs.Address,
      version: bcs.U64,
      digest: bcs.Digest,
    })),
    owner: bcs.Address,
    price: bcs.U64,
    budget: bcs.U64,
  }),
  expiration: bcs.enum('TransactionExpiration', {
    None: bcs.bool(),
    Epoch: bcs.U64,
  }),
});
```

## Serialization Errors

Handle serialization errors:

```typescript
try {
  const bytes = await tx.build({ client });
} catch (error) {
  if (error.message.includes('Missing sender')) {
    // Sender not set
    tx.setSender(senderAddress);
    const bytes = await tx.build({ client });
  } else if (error.message.includes('Invalid object reference')) {
    // Object reference needs resolution
    const object = await client.getObject({ id: objectId });
    tx.object(Inputs.ObjectRef({
      objectId: object.data.objectId,
      version: object.data.version,
      digest: object.data.digest,
    }));
    const bytes = await tx.build({ client });
  } else {
    throw error;
  }
}
```

## Performance Considerations

### Serialization Performance

```typescript
// Optimize serialization for large transactions

// 1. Use unresolved object IDs when possible
// Faster: uses cached versions
tx.object('0x123');

// Slower: requires full object data
tx.object(Inputs.ObjectRef({ digest, objectId, version }));

// 2. Batch pure values
// Faster: single serialization
const values = [1, 2, 3, 4, 5];
tx.pure.vector('u64', values);

// Slower: multiple serializations
values.forEach(value => tx.pure.u64(value));

// 3. Minimize transaction size
// Large transactions cost more gas and serialize slower
```

### Memory Usage

```typescript
// Large transactions can consume significant memory
// Consider these optimizations:

// 1. Clear unused references
tx = new Transaction(); // Start fresh when possible

// 2. Use streaming for very large transactions
// Build in chunks if transaction has many commands

// 3. Monitor serialization size
const bytes = await tx.build({ client });
console.log('Transaction size:', bytes.length, 'bytes');
// Typical sizes: 1KB-10KB for normal transactions
```

## Best Practices

1. **Always set sender**: Required for proper serialization
2. **Use offline building carefully**: Ensure all object references are resolved
3. **Validate serialized bytes**: Check size and format before signing
4. **Store transaction metadata**: Helps with debugging and reconstruction
5. **Test serialization round-trip**: Serialize and deserialize to verify correctness