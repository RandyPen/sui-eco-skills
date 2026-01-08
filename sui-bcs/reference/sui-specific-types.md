# Sui-Specific Types

Sui extends the base BCS with blockchain-specific types:

## Address Type

```typescript
// Address serialization
bcs.Address.serialize('0x0000...0000');
bcs.Address.serialize('0x1'); // Short address
bcs.Address.serialize('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'); // Full address
```

## Object Reference Types

```typescript
// Sui object reference
const objectRef = {
  objectId: '0x123...',
  version: '12345',
  digest: 'base64digest...',
};
bcs.SuiObjectRef.serialize(objectRef);

// Shared object reference
const sharedObjectRef = {
  objectId: '0x456...',
  initialSharedVersion: '1000',
  mutable: true,
};
bcs.SharedObjectRef.serialize(sharedObjectRef);
```

## Transaction-Related Types

```typescript
// Transaction data
bcs.TransactionData.serialize(transactionData);

// Transaction kind
bcs.TransactionKind.serialize({
  ProgrammableTransaction: {
    inputs: [...],
    commands: [...],
  },
});

// Gas data
bcs.GasData.serialize({
  payment: [...],
  owner: '0x...',
  price: 1000n,
  budget: 1000000n,
});
```

## Key and Signature Types

```typescript
// Public key
bcs.PublicKey.serialize(publicKeyBytes);

// Compressed signature
bcs.CompressedSignature.serialize(signatureBytes);

// Multi-signature
bcs.MultiSig.serialize({
  sigs: [...],
  bitmap: 0xFF,
  weights: [1, 1, 1],
});
```

## Move Types

```typescript
// Type tag
bcs.TypeTag.serialize({
  vector: { u8: true }, // vector<u8>
});

bcs.TypeTag.serialize({
  struct: {
    address: '0x2',
    module: 'coin',
    name: 'Coin',
    typeParams: [{ u8: true }], // Coin<u8>
  },
});

// Struct tag
bcs.StructTag.serialize({
  address: '0x2',
  module: 'coin',
  name: 'Coin',
  typeParams: [bcs.TypeTag.serialize({ u8: true })],
});
```

## Usage Notes

### Address Format
- 32-byte hexadecimal string
- Supports short addresses (e.g., '0x1')
- Automatically pads short addresses to 32 bytes
- Validates address format during serialization

### Object References
- `SuiObjectRef`: Reference to an owned object
- `SharedObjectRef`: Reference to a shared object
- Includes object ID, version, and digest
- Used in transaction arguments

### Transaction Data
- `TransactionData`: Complete transaction data
- `TransactionKind`: Type of transaction (Programmable, etc.)
- `GasData`: Gas configuration and payment
- Used for transaction signing and submission

### Cryptographic Types
- `PublicKey`: Ed25519, Secp256k1, or Secp256r1 public keys
- `CompressedSignature`: Standard signature format
- `MultiSig`: Multi-signature support with weights
- Used for transaction authorization

### Move Type System
- `TypeTag`: Move type representation
- `StructTag`: Fully qualified struct type
- Supports generic type parameters
- Used for type arguments in Move calls