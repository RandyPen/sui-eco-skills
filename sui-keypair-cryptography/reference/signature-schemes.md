# Supported Signature Schemes

## Ed25519

**Location**: `packages/typescript/src/keypairs/ed25519/`

- **Features**: Fast elliptic curve cryptography
- **Use Cases**: General-purpose signing
- **Performance**: High performance, low computational overhead

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Generate new keypair
const keypair = new Ed25519Keypair();

// Generate from seed
const seed = new Uint8Array(32); // 32-byte seed
const keypairFromSeed = Ed25519Keypair.fromSeed(seed);

// Generate from private key
const privateKey = keypair.getSecretKey();
const keypairFromPrivateKey = Ed25519Keypair.fromSecretKey(privateKey);
```

## Secp256k1

**Location**: `packages/typescript/src/keypairs/secp256k1/`

- **Features**: Bitcoin-compatible ECDSA
- **Use Cases**: Ethereum compatibility
- **Interoperability**: Compatible with Ethereum wallets

```typescript
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';

const keypair = new Secp256k1Keypair();

// Import from Ethereum private key
const ethereumPrivateKey = '0x...';
const keypairFromEth = Secp256k1Keypair.fromSecretKey(
  Buffer.from(ethereumPrivateKey.slice(2), 'hex')
);
```

## Secp256r1

**Location**: `packages/typescript/src/keypairs/secp256r1/`

- **Features**: P-256 curve (NIST standard)
- **Use Cases**: FIPS compliance
- **Security**: Government and enterprise standards

```typescript
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';

const keypair = new Secp256r1Keypair();
```

## Passkey

**Location**: `packages/typescript/src/keypairs/passkey/`

- **Features**: WebAuthn/FIDO2 support
- **Use Cases**: Hardware security keys
- **Security**: Passwordless authentication

```typescript
import { PasskeyKeypair } from '@mysten/sui/keypairs/passkey';

// Create new Passkey
const keypair = await PasskeyKeypair.create({
  name: 'My Passkey',
  rp: {
    name: 'Example App',
    id: window.location.hostname,
  },
  user: {
    id: new Uint8Array(16),
    name: 'user@example.com',
    displayName: 'User',
  },
});

// Use existing Passkey
const existingKeypair = await PasskeyKeypair.fromCredentials(credential);
```