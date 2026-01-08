# Usage Patterns

## Key Generation and Signing

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

// Generate new keypair
const keypair = new Ed25519Keypair();

// Sign transaction
const tx = new Transaction();
// ... build transaction
const bytes = await tx.build({ client });
const { signature } = await keypair.signTransaction(bytes);

// Get address
const address = keypair.toSuiAddress();
console.log('Signer address:', address);

// Export public key
const publicKey = keypair.getPublicKey();
const publicKeyBytes = publicKey.toBytes();
```

## Signature Verification

```typescript
// Verify transaction signature
const isValid = await publicKey.verifyTransaction(
  transactionBytes,
  signature
);

// Verify personal message
const message = new TextEncoder().encode('Sign this message');
const messageValid = await publicKey.verifyPersonalMessage(
  message,
  signature
);

// Verify with intent
const intentValid = await publicKey.verifyWithIntent(
  messageBytes,
  signature,
  'TransactionData'
);
```

## Key Serialization

```typescript
// Serialize private key
const secretKey = keypair.getSecretKey();
console.log('Secret key bytes:', secretKey);

// Restore keypair from serialized key
const restored = Ed25519Keypair.fromSecretKey(secretKey);

// Verify restored keypair
console.log('Address match:', keypair.toSuiAddress() === restored.toSuiAddress());
console.log('Public key match:',
  keypair.getPublicKey().toBase64() === restored.getPublicKey().toBase64()
);
```

## Multi-Signature Support

```typescript
// Multiple signers for complex transactions
const signatures = await Promise.all([
  signer1.signTransaction(txBytes),
  signer2.signTransaction(txBytes),
  signer3.signTransaction(txBytes),
]);

// Combine signatures
const combinedSignatures = signatures.map(sig => ({
  signature: sig,
  pubKey: signer.getPublicKey().toBytes(),
}));

// Use multi-signature in transactions
// Note: Sui natively supports multi-signature
```