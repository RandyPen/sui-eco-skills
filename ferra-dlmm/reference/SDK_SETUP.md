# SDK Setup and Configuration

This reference covers how to initialize and configure the Ferra DLMM SDK.

## Initialization

The main entry point is the `initFerraSDK()` function:

```typescript
import { initFerraSDK } from '@ferra-labs/dlmm'

// Basic initialization
const sdk = initFerraSDK({
  network: 'testnet',  // or 'mainnet', 'beta'
  wallet: '0x...your_wallet_address'
})
```

**Example from `create-pair.ts:33`:**
```typescript
const sdk = initFerraSDK({ network: 'testnet', wallet })
```

## Network Configurations

### Available Networks

1. **Mainnet**: Production network
   ```typescript
   const sdk = initFerraSDK({ network: 'mainnet', wallet })
   ```

2. **Testnet**: Development and testing network
   ```typescript
   const sdk = initFerraSDK({ network: 'testnet', wallet })
   ```

3. **Beta**: Beta testing network
   ```typescript
   const sdk = initFerraSDK({ network: 'beta', wallet })
   ```

### Network-Specific Configuration

The SDK automatically loads the appropriate configuration for each network:
- RPC endpoints
- Contract addresses
- Token configurations

## Wallet Setup

You need a Sui wallet address to initialize the SDK. Here are common ways to set up a wallet:

### 1. Using Ed25519Keypair (from test files)

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography'
import { fromBase64 } from '@mysten/sui/utils'

// Option A: From private key (preferred in tests)
const privateKey = process.env.SUI_WALLET_PRIVATEKEY || ''
let keypair: Ed25519Keypair

if (privateKey) {
  keypair = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(privateKey).secretKey)
} else if (process.env.SUI_WALLET_SECRET) {
  // Option B: From base64 secret
  keypair = Ed25519Keypair.fromSecretKey(fromBase64(process.env.SUI_WALLET_SECRET).slice(1, 33))
} else {
  // Option C: From mnemonic
  keypair = Ed25519Keypair.deriveKeypair(process.env.SUI_WALLET_MNEMONICS || '')
}

const wallet = keypair.getPublicKey().toSuiAddress()
const sdk = initFerraSDK({ network: 'testnet', wallet })
```

### 2. Environment Variables Pattern

The test files use these environment variables:
- `SUI_WALLET_PRIVATEKEY`: Private key string
- `SUI_WALLET_SECRET`: Base64 encoded secret
- `SUI_WALLET_MNEMONICS`: Mnemonic phrase

```typescript
// From create-pair.ts lines 20-30
const privateKey = process.env.SUI_WALLET_PRIVATEKEY || ''
const secret = process.env.SUI_WALLET_SECRET || ''
const mnemonic = process.env.SUI_WALLET_MNEMONICS || ''
```

## SDK Instance Methods

Once initialized, the SDK provides these main modules:

```typescript
// Factory operations (creating pairs)
sdk.Factory.createLBPair({ /* params */ })

// Pair operations (liquidity management)
sdk.Pair.getPair(address)
sdk.Pair.addLiquidity(pair, { /* params */ })

// Position management
sdk.Position.openPosition({ /* params */ })

// Swap operations
sdk.Swap.calculateRates({ /* params */ })

// Quoter utilities
sdk.Quoter.getQuote({ /* params */ })
```

## Full Client Access

The SDK provides direct access to the Sui client:

```typescript
// RPC client
const fullClient = sdk.fullClient

// GRPC client
const grpcClient = sdk.grpcClient

// Example: Dry-run transaction
const res = await sdk.fullClient.dryRunTransactionBlock({
  transactionBlock: await tx.build({ client: sdk.fullClient }),
})
```

## Error Handling

The SDK throws errors for:
- Invalid network configuration
- Wallet address validation failures
- RPC connection issues

```typescript
try {
  const sdk = initFerraSDK({ network: 'testnet', wallet })
  // ... use SDK
} catch (error) {
  console.error('SDK initialization failed:', error)
}
```

## Best Practices

1. **Use environment variables** for sensitive wallet information
2. **Initialize once** and reuse the SDK instance
3. **Choose the right network** (testnet for development, mainnet for production)
4. **Test with dry-run** before executing real transactions
5. **Check network status** if experiencing connection issues

## Next Steps

After SDK setup, proceed to:
- [Pair Operations](./PAIR_OPERATIONS.md) for liquidity management
- [Swap Operations](./SWAP_OPERATIONS.md) for token swapping
- [Test Examples](./TEST_EXAMPLES.md) for working code patterns