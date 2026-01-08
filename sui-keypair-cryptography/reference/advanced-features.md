# Advanced Features

## Multi-Signature Support

```typescript
// Complex transactions with multiple signers
const signatures = await Promise.all([
  signer1.signTransaction(txBytes),
  signer2.signTransaction(txBytes),
]);

// Combine signatures for multi-signature transactions
// Note: Sui has built-in multi-signature support for specific configurations
```

## Hardware Security

```typescript
// Use Passkey (WebAuthn/FIDO2 hardware security key)
const passkey = await PasskeyKeypair.create({ /* configuration */ });
const passkeySignature = await passkey.signTransaction(txBytes);
```

## Key Rotation and Migration

```typescript
// Migrate keys from old format
async function migrateOldKey(oldKeyFormat: string): Promise<Ed25519Keypair> {
  // Parse old format
  const privateKeyBytes = parseLegacyFormat(oldKeyFormat);

  // Create new keypair
  return Ed25519Keypair.fromSecretKey(privateKeyBytes);
}

// Key rotation
async function rotateKey(oldKeypair: Ed25519Keypair): Promise<Ed25519Keypair> {
  // Generate new key
  const newKeypair = new Ed25519Keypair();

  // Sign ownership of new key with old key
  const ownershipProof = await oldKeypair.signPersonalMessage(
    new TextEncoder().encode(newKeypair.toSuiAddress())
  );

  // Store ownership proof for verification
  storeOwnershipProof(newKeypair.toSuiAddress(), ownershipProof);

  return newKeypair;
}
```