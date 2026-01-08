# Input Types

Transaction inputs can be pure values, object references, or transaction results. Understanding input types is crucial for building correct transactions.

## Pure Values

Pure values are non-object inputs that must be serialized to BCS format:

```typescript
// Use tx.pure namespace methods
const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(100)]);
tx.transferObjects([coin], tx.pure.address('0xSomeSuiAddress'));

// Use tx.pure function
const [coin] = tx.splitCoins(tx.gas, [tx.pure(bcs.U64.serialize(100))]);
tx.transferObjects([coin], tx.pure(bcs.Address.serialize('0xSomeSuiAddress')));

// Vector and Option types
import { bcs } from '@mysten/sui/bcs';

tx.moveCall({
  target: '0x2::foo::bar',
  arguments: [
    // Use vector and option methods
    tx.pure.vector('u8', [1, 2, 3]),
    tx.pure.option('u8', 1),
    tx.pure.option('u8', null),

    // Use type parameters
    tx.pure('vector<u8>', [1, 2, 3]),
    tx.pure('option<u8>', 1),
    tx.pure('option<u8>', null),
    tx.pure('vector<option<u8>>', [1, null, 2]),

    // Use bcs.serialize
    tx.pure(bcs.vector(bcs.U8).serialize([1, 2, 3])),
    tx.pure(bcs.option(bcs.U8).serialize(1)),
    tx.pure(bcs.option(bcs.U8).serialize(null)),
    tx.pure(bcs.vector(bcs.option(bcs.U8)).serialize([1, null, 2])),
  ],
});
```

### Available Pure Type Methods

```typescript
// Basic types
tx.pure.u8(1)
tx.pure.u16(1)
tx.pure.u32(1)
tx.pure.u64(1n)
tx.pure.u128(1n)
tx.pure.u256(1n)
tx.pure.bool(true)
tx.pure.string('text')
tx.pure.address('0x...')

// Complex types
tx.pure.vector('u8', [1, 2, 3])
tx.pure.option('u8', 1)
tx.pure.option('u8', null)
tx.pure('vector<u8>', [1, 2, 3])
tx.pure('option<u8>', 1)
```

## Object References

Use on-chain objects as transaction inputs:

```typescript
// Object IDs can be passed directly to some methods (like transferObjects)
tx.transferObjects(['0xSomeObject'], '0xSomeAddress');

// tx.object can be used anywhere that accepts objects
tx.transferObjects([tx.object('0xSomeObject')], '0xSomeAddress');

// Object IDs must be wrapped in Move call arguments
tx.moveCall({
  target: '0x2::nft::mint',
  arguments: [tx.object('0xSomeObject')],
});

// Receiving arguments automatically converted
tx.moveCall({
  target: '0xSomeAddress::example::receive_object',
  arguments: [tx.object('0xParentObjectID'), tx.object('0xReceivingObjectID')],
});
```

### Fully Resolved Object References

```typescript
import { Inputs } from '@mysten/sui/transactions';

// Owned or immutable objects
tx.object(Inputs.ObjectRef({ digest, objectId, version }));

// Shared objects
tx.object(Inputs.SharedObjectRef({ objectId, initialSharedVersion, mutable }));

// Receiving objects
tx.object(Inputs.ReceivingRef({ digest, objectId, version }));
```

### Object Helpers

```typescript
// System objects
tx.object.system();      // System state object
tx.object.clock();      // Clock object
tx.object.random();     // Randomness object
tx.object.denyList();   // Deny list object

// Option objects
tx.object.option({
  type: '0x123::example::Thing',
  value: '0x456', // Object ID or other object reference, or null for none
});
```

## Transaction Results

Use command results as inputs for subsequent commands:

```typescript
// Split coin from gas object
const [coin] = tx.splitCoins(tx.gas, [100]);
// Transfer result coin
tx.transferObjects([coin], address);

// Multiple result access
const [nft1, nft2] = tx.moveCall({ target: '0x2::nft::mint_many' });
tx.transferObjects([nft1, nft2], address);

// Array index access
const mintMany = tx.moveCall({ target: '0x2::nft::mint_many' });
tx.transferObjects([mintMany[0], mintMany[1]], address);
```

## Input Type Conversion

The Transaction class automatically converts between input types:

```typescript
// String to object reference
tx.object('0x123') // Creates object reference

// Number to pure value
tx.splitCoins(tx.gas, [100]) // Automatically converts to u64

// Array to vector
tx.pure([1, 2, 3]) // Creates vector<u8>
```

## Type Safety

TypeScript provides compile-time type checking for inputs:

```typescript
// Type errors caught at compile time
tx.moveCall({
  target: '0x2::coin::transfer',
  arguments: [
    tx.object(coinId), // Correct: object reference
    // tx.pure.u64(100), // Error: expected address, got u64
    tx.pure.address(recipient), // Correct: address
  ],
});
```

## Best Practices

1. **Use appropriate types**: Match Move function parameter types exactly
2. **Prefer helper methods**: Use `tx.pure.u64()` over manual BCS serialization
3. **Validate object existence**: Ensure objects exist before using them
4. **Handle null values**: Use `tx.pure.option(type, null)` for optional parameters
5. **Consider gas costs**: Complex BCS serialization can increase gas usage