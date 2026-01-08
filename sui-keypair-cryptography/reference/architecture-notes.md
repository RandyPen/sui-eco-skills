# Architecture Notes

## Security Design

1. **Private Key Isolation**: Secret keys are never exposed in memory
2. **Intent Separation**: Different signing contexts prevent replay attacks
3. **Address Verification**: Ensures public key matches derived address
4. **Scheme Verification**: Prevents signature scheme confusion

## Intent System

The intent system provides domain separation for different signing contexts:

```typescript
// Intent types and their uses
const INTENT_TYPES = {
  TransactionData: 'For blockchain transactions',
  PersonalMessage: 'For signing messages',
  TransactionEffects: 'For transaction results',
  CheckpointSummary: 'For checkpoint verification',
};

// Intent includes version, scope, and intent type
const intent = {
  version: 0,
  scope: 'TransactionData',
  intent: 'TransactionData',
};
```

## Address Generation

1. **Blake2b Hash**: Used for address derivation
2. **Scheme Prefix**: Includes signature scheme in address
3. **Standardization**: Consistent address formatting
4. **Verification**: Address format and checksum validation

```typescript
// Address derivation process
// 1. Get public key bytes
// 2. Add scheme identifier
// 3. Apply Blake2b hash
// 4. Take first 32 bytes as address
```