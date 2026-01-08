# Key Features

## Intent-Based Signing

```typescript
// Sign with specific intent scope
const signature = await signer.signWithIntent(
  messageBytes,
  'TransactionData' // intent type
);

// Verify with intent scope
const isValid = await publicKey.verifyWithIntent(
  messageBytes,
  signature,
  'TransactionData'
);
```

### Supported Intent Types

```typescript
// TransactionData: For blockchain transactions
// PersonalMessage: For signing messages
// TransactionEffects: For transaction results
// CheckpointSummary: For checkpoint verification

// Transaction data intent
await signer.signWithIntent(txBytes, 'TransactionData');

// Personal message intent
const message = new TextEncoder().encode('Hello, Sui!');
await signer.signWithIntent(message, 'PersonalMessage');
```

## Address Derivation

```typescript
// Derive Sui address from public key
const address = publicKey.toSuiAddress();

// Verify if address matches public key
const isValid = publicKey.verifyAddress(address);

// Get hexadecimal representation of address
const hexAddress = address; // starts with 0x

// Get short representation of address
const shortAddress = address.slice(0, 8) + '...' + address.slice(-8);
```

## Private Key Management

```typescript
// Use Bech32 encoding for private keys
import { encodeSuiPrivateKey, decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const keypair = new Ed25519Keypair();
const privateKeyBytes = keypair.getSecretKey();

// Encode private key (for secure storage)
const encoded = encodeSuiPrivateKey(privateKeyBytes, 'ED25519');
console.log('Encoded private key:', encoded); // sui-...

// Decode private key
const decoded = decodeSuiPrivateKey(encoded);
const restoredKeypair = Ed25519Keypair.fromSecretKey(decoded.privateKey);

// Verify key scheme
console.log('Key scheme:', decoded.scheme); // ED25519
```

### Mnemonic Support

```typescript
import { mnemonicToSeed } from '@mysten/sui/cryptography';
import { generateMnemonic } from '@scure/bip39';

// Generate mnemonic
const mnemonic = generateMnemonic();
console.log('Mnemonic:', mnemonic);

// Generate seed from mnemonic
const seed = await mnemonicToSeed(mnemonic);

// Generate keypair from seed
const keypair = Ed25519Keypair.fromSeed(seed.slice(0, 32));
```