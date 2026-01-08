# Security Considerations

## Key Protection

1. **Bech32 Encoding**: Private keys use Bech32 encoding for secure storage
2. **Memory Cleanup**: Clear memory after key operations
3. **No Key Material Logging**: Do not log or expose any key material

## Signature Security

1. **Intent Separation**: Prevent signature reuse
2. **Domain Separation**: Achieved through intent scope
3. **Timestamp and Nonce Protection**: Prevent replay attacks

## Address Security

1. **Deterministic Derivation**: Address derivation is deterministic and verifiable
2. **Format Validation**: Prevent address confusion
3. **Checksum Verification**: Data integrity checks

## Best Security Practices

```typescript
// 1. Use hardware security modules to store private keys
// 2. Implement key usage policies
// 3. Regularly rotate keys
// 4. Monitor abnormal signing activities
// 5. Use multi-signature for important operations

// Secure key generation
function generateSecureKeypair(): Ed25519Keypair {
  // Use cryptographically secure random numbers
  const seed = crypto.getRandomValues(new Uint8Array(32));
  return Ed25519Keypair.fromSeed(seed);
}

// Secure key storage
async function storeKeySecurely(keypair: Ed25519Keypair): Promise<string> {
  const privateKey = keypair.getSecretKey();

  // Encrypt private key
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
    encryptionKey,
    privateKey
  );

  // Store encrypted data
  return Buffer.from(encrypted).toString('base64');
}
```