# Getting Started with Cetus CLMM SDK

## Installation

### Prerequisites
- Node.js 18+ or Bun runtime
- TypeScript 4.5+ (recommended)
- Sui wallet (for transaction signing)

### Install Dependencies
```bash
# Using npm
npm install @cetusprotocol/sui-clmm-sdk @cetusprotocol/common-sdk @mysten/sui

# Using pnpm
pnpm add @cetusprotocol/sui-clmm-sdk @cetusprotocol/common-sdk @mysten/sui

# Using yarn
yarn add @cetusprotocol/sui-clmm-sdk @cetusprotocol/common-sdk @mysten/sui
```

### Package Overview
- **@cetusprotocol/sui-clmm-sdk**: Main CLMM SDK package
- **@cetusprotocol/common-sdk**: Shared utilities and base classes
- **@mysten/sui**: Sui blockchain SDK for transaction handling

## SDK Initialization

### Basic Initialization
The simplest way to create an SDK instance is using the `createSDK` method:

```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'

// For mainnet (default)
const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

// For testnet
const sdk = CetusClmmSDK.createSDK({ env: 'testnet' })
```

### Custom Initialization
For advanced configuration, use `createCustomSDK`:

```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'

const sdk = CetusClmmSDK.createCustomSDK({
  env: 'mainnet',
  fullRpcUrl: 'https://fullnode.mainnet.sui.io',
  swapCountRpcUrl: 'https://fullnode.mainnet.sui.io',

  // Cetus protocol configuration
  cetus_config: {
    package_id: '0x686e8688970dcb5661b5e31c8c2ed54e3a0e511dcac21f4e2b0ae3d6386b8e6a',
    published_at: '0x686e8688970dcb5661b5e31c8c2ed54e3a0e511dcac21f4e2b0ae3d6386b8e6a'
  },

  // CLMM pool configuration
  clmm_pool: {
    package_id: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
    published_at: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb'
  },

  // Integration configuration
  integrate: {
    package_id: '0x2',
    published_at: '0x2'
  }
})
```

### Configuration Options

#### BaseSdkOptions
```typescript
interface BaseSdkOptions {
  env?: 'mainnet' | 'testnet'  // Network environment
  fullRpcUrl?: string          // Full node RPC URL
  swapCountRpcUrl?: string     // Swap count RPC URL
  stats_pools_url?: string     // Statistics endpoint
}
```

#### SdkOptions (extends BaseSdkOptions)
```typescript
interface SdkOptions extends BaseSdkOptions {
  cetus_config: Package<CetusConfigs>    // Cetus protocol config
  clmm_pool: Package<ClmmConfig>         // CLMM pool config
  integrate: Package                     // Integration config
  clmm_vest?: Package<VestConfigs>       // Vesting config (optional)
}
```

## Setting Up Wallet Integration

### Import Sui Wallet
```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { SuiClient } from '@mysten/sui/client'

// Create a keypair from private key
const privateKey = 'your_private_key_here'
const keypair = Ed25519Keypair.fromSecretKey(privateKey)

// Or generate a new keypair
const keypair = new Ed25519Keypair()

// Create Sui client
const suiClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io' })

// Set sender address in SDK
sdk.setSenderAddress(keypair.getPublicKey().toSuiAddress())
```

### Connect to SDK
```typescript
// After initializing SDK and wallet
async function setupSDK() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const keypair = Ed25519Keypair.fromSecretKey(privateKey)

  // Set sender address
  sdk.setSenderAddress(keypair.getPublicKey().toSuiAddress())

  // You can also set the full client for transaction execution
  // sdk.FullClient.setClient(suiClient)

  return { sdk, keypair }
}
```

## Basic Usage Example

### Check Network Connection
```typescript
async function checkNetwork(sdk: CetusClmmSDK) {
  try {
    // Get pool list to verify connection
    const pools = await sdk.Pool.getPoolsWithPage('all')
    console.log(`Connected to network. Found ${pools.data.length} pools`)
    return true
  } catch (error) {
    console.error('Network connection failed:', error)
    return false
  }
}
```

### Get Account Positions
```typescript
async function getAccountPositions(sdk: CetusClmmSDK, accountAddress: string) {
  try {
    const positions = await sdk.Position.getPositionList(accountAddress)
    console.log(`Account ${accountAddress} has ${positions.length} positions`)
    return positions
  } catch (error) {
    console.error('Failed to get positions:', error)
    return []
  }
}
```

## Environment Configuration

### Mainnet Configuration
- **Network**: Sui Mainnet
- **RPC URL**: `https://fullnode.mainnet.sui.io`
- **Package IDs**: Pre-configured in `clmmMainnet` constant
- **Use for**: Production applications

### Testnet Configuration
- **Network**: Sui Testnet
- **RPC URL**: `https://fullnode.testnet.sui.io`
- **Package IDs**: Pre-configured in `clmmTestnet` constant
- **Use for**: Development and testing

### Custom RPC Endpoints
```typescript
const sdk = CetusClmmSDK.createCustomSDK({
  env: 'mainnet',
  fullRpcUrl: 'https://custom-rpc.sui.io',  // Your custom RPC
  swapCountRpcUrl: 'https://custom-rpc.sui.io',
  // ... other configurations
})
```

## Common Initialization Patterns

### Pattern 1: Simple Mainnet Setup
```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'

export function createSimpleSDK() {
  return CetusClmmSDK.createSDK({ env: 'mainnet' })
}
```

### Pattern 2: Development Setup with Error Handling
```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'

export async function createDevelopmentSDK() {
  try {
    const sdk = CetusClmmSDK.createSDK({ env: 'testnet' })

    // Verify connection
    await sdk.Pool.getPoolsWithPage('all', true)

    console.log('SDK initialized successfully on testnet')
    return sdk
  } catch (error) {
    console.error('Failed to initialize SDK:', error)
    throw new Error('SDK initialization failed')
  }
}
```

### Pattern 3: Production Setup with Custom Configuration
```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'

export function createProductionSDK() {
  return CetusClmmSDK.createCustomSDK({
    env: 'mainnet',
    fullRpcUrl: process.env.SUI_RPC_URL,
    swapCountRpcUrl: process.env.SUI_RPC_URL,
    cetus_config: {
      package_id: process.env.CETUS_PACKAGE_ID,
      published_at: process.env.CETUS_PACKAGE_ID
    },
    clmm_pool: {
      package_id: process.env.CLMM_POOL_PACKAGE_ID,
      published_at: process.env.CLMM_POOL_PACKAGE_ID
    },
    integrate: {
      package_id: '0x2',
      published_at: '0x2'
    }
  })
}
```

## Next Steps

After setting up the SDK, you can:

1. **Explore pools**: Use `sdk.Pool.getPoolsWithPage()` to see available pools
2. **Manage liquidity**: Check the [Liquidity Management](liquidity-management.md) guide
3. **Execute swaps**: Learn about swapping in [Swap Operations](swap-operations.md)
4. **Collect rewards**: See [Rewards Management](rewards-management.md) for reward collection

## Troubleshooting Initialization

### Common Issues

**"Cannot find module '@cetusprotocol/sui-clmm-sdk'"**
- Verify package installation: `npm list @cetusprotocol/sui-clmm-sdk`
- Check import path matches package name

**Network connection errors**
- Verify RPC endpoint is accessible
- Check network connectivity
- Ensure correct environment (mainnet/testnet)

**"Invalid package ID" errors**
- Update to latest SDK version
- Verify package IDs match current network deployment
- Check network configuration

**Wallet integration issues**
- Verify keypair is properly initialized
- Check sender address format
- Ensure sufficient balance for gas fees

### Debug Tips
```typescript
// Enable debug logging
const sdk = CetusClmmSDK.createSDK({
  env: 'testnet',
  // Add debug options if available
})

// Test with simple operation first
try {
  const pools = await sdk.Pool.getPoolsWithPage('all', true)
  console.log('SDK working, found pools:', pools.data.length)
} catch (error) {
  console.error('Initial test failed:', error)
}
```