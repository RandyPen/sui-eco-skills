---
name: cetus-clmm-sdk-skill
description: Guides developers through using Cetus CLMM TypeScript SDK for liquidity management, pool operations, swaps, and reward collection. Use when working with Cetus Protocol's Concentrated Liquidity Market Maker (CLMM) or when the user mentions Cetus SDK, CLMM, liquidity pools, or DeFi on Sui.
---
# Cetus CLMM SDK Guide

## Overview
This Skill provides comprehensive guidance for using the Cetus CLMM (Concentrated Liquidity Market Maker) TypeScript SDK v2. The SDK enables developers to interact with Cetus Protocol's CLMM on the Sui blockchain, including liquidity management, pool operations, swaps, and reward collection.

## Getting Started

### Installation
```bash
npm install @cetusprotocol/sui-clmm-sdk
```

### SDK Initialization

The SDK provides a convenient initialization method for quick setup and configuration.

**Option 1: Use default mainnet configuration**
```typescript
import { CetusClmmSDK } from '@cetusprotocol/sui-clmm-sdk'

const sdk = CetusClmmSDK.createSDK()
```

**Option 2: Specify network environment**
```typescript
// For mainnet
const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

// For testnet
const sdk = CetusClmmSDK.createSDK({ env: 'testnet' })
```

**Option 3: Use custom gRPC endpoint**
```typescript
const sdk = CetusClmmSDK.createSDK({ 
  env: 'mainnet',
  full_rpc_url: 'YOUR_GRPC_ENDPOINT' 
})
```

**Option 4: Use custom SuiClient (gRPC)**
```typescript
import { SuiClient } from '@mysten/sui/client'

const suiClient = new SuiClient({ url: 'grpc://fullnode.mainnet.sui.io:443' })
const sdk = CetusClmmSDK.createSDK({ env: 'mainnet', sui_client: suiClient })
```

**Set Sender Address**
After linking your wallet, set your wallet address to execute transactions:
```typescript
const wallet = 'YOUR_WALLET_ADDRESS'
sdk.setSenderAddress(wallet)
```

## Core Modules

### Liquidity Management
Add, remove, and manage liquidity positions:
- **Open Position**: Create new liquidity positions
- **Add liquidity**: Deposit tokens into existing positions
- **Remove liquidity**: Withdraw tokens from positions
- **Close Position**: Remove and collect from positions
- [Detailed guide](reference/liquidity-management.md)

### Pool Operations
Create and interact with CLMM pools:
- **Create CLMM Pool**: Initialize new trading pools
- **Get CLMM Pools**: Query and list available pools
- **Get Ticks**: Fetch tick data for price ranges
- [Detailed guide](reference/pool-operations.md)

### Swap Operations
Execute token swaps with optimized pricing:
- **Pre Swap**: Calculate swap outcomes before execution
- **Swap**: Execute token exchanges
- **Partner Swap**: Execute swaps with partner fee sharing
- [Detailed guide](reference/swap-operations.md)

### Rewards Management
Collect and manage liquidity provider rewards:
- **Collect rewards**: Claim accumulated rewards
- **Get Pool Position Rewards**: Query reward amounts for positions
- [Detailed guide](reference/rewards-management.md)

### Math Utilities
CLMM calculation tools from `@cetusprotocol/common-sdk`:
- **Price conversions**: Convert between price, sqrt price, and tick index
- **Liquidity calculations**: Compute liquidity amounts and token requirements
- **Tick math**: Work with tick indices and ranges
- [Detailed guide](reference/math-utils.md)

## Key Features

### 1. Pool Operations

```typescript
// Get all pools
const pools = await sdk.Pool.getCLMMPools()

// Get specific pool
const pool = await sdk.Pool.getPool(pool_id)

// Create a new pool
const tx = await sdk.Pool.createCLMMPoolPayload({
  coin_type_a: '0x...::usdc::USDC',
  coin_type_b: '0x...::usdt::USDT',
  tick_spacing: 1,
  initial_liquidity: '1000000',
  // ...
})
```

### 2. Position Operations

```typescript
// Get owner position list
const positions = await sdk.Position.getPositionList(owner_address)

// Open a new position
const tx = await sdk.Position.openPositionPayload({
  coin_type_a: '0x...::usdc::USDC',
  coin_type_b: '0x...::usdt::USDT',
  tick_lower: -1000,
  tick_upper: 1000,
  liquidity: '1000000',
})

// Add liquidity to existing position
const tx = await sdk.Position.addLiquidityPayload({
  position_id: '0x...',
  amount_a: '1000000',
  amount_b: '1000000',
})

// Remove liquidity
const tx = await sdk.Position.removeLiquidityPayload({
  position_id: '0x...',
  liquidity: '500000',
})

// Close position
const tx = await sdk.Position.closePositionPayload({
  position_id: '0x...',
})
```

### 3. Swap Operations

```typescript
// Get swap quote
const quote = await sdk.Swap.quote({
  pool_id: '0x...',
  coin_type_in: '0x...::usdc::USDC',
  coin_type_out: '0x...::usdt::USDT',
  amount: '1000000',
  a2b: true,
})

// Execute swap
const tx = await sdk.Swap.swapPayload({
  pool_id: '0x...',
  coin_type_in: '0x...::usdc::USDC',
  coin_type_out: '0x...::usdt::USDT',
  amount: '1000000',
  a2b: true,
  slippage: 0.01,
})
```

### 4. Rewards Collection

```typescript
// Collect fees
const tx = await sdk.Reward.collectFeePayload({
  position_id: '0x...',
})

// Collect rewards
const tx = await sdk.Reward.collectRewardPayload({
  position_id: '0x...',
  reward_coin_type: '0x...::reward::REWARD',
})
```

## Best Practices

### SDK Initialization
Always initialize the SDK with appropriate network configuration:
```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'

// For mainnet use (default)
const sdk = CetusClmmSDK.createSDK()

// For testnet use
const sdk = CetusClmmSDK.createSDK({ env: 'testnet' })

// Set sender address
sdk.setSenderAddress(walletAddress)
```

### Error Handling
Wrap SDK calls in try-catch blocks and handle common errors:
- Network connectivity issues
- Insufficient balance errors
- Transaction validation failures
- Position/pool not found errors

### Performance Considerations
- Cache pool and position data when possible
- Batch related operations when appropriate
- Monitor gas estimates before transaction submission

### Security
- Never expose private keys in code
- Validate all user inputs and parameters
- Use appropriate slippage protection
- Review transaction payloads before signing

## Troubleshooting

### Common Issues

**SDK initialization fails**
- Verify network connectivity
- Check RPC endpoint availability
- Ensure proper package installation

**Transactions fail**
- Check account balance and gas fees
- Verify position/pool exists and is accessible
- Review error messages for specific issues

**Price calculations incorrect**
- Confirm decimal precision settings
- Verify tick spacing matches pool configuration
- Check current pool state and liquidity

### Debugging Tips
1. Enable debug logging in SDK configuration
2. Test with small amounts first
3. Use testnet for development and testing
4. Consult the [Cetus documentation](https://cetus-1.gitbook.io/cetus-developer-docs) for updates

## Resources
- [Cetus Protocol Documentation](https://cetus-1.gitbook.io/cetus-developer-docs)
- [Sui Blockchain Documentation](https://docs.sui.io)
- [@cetusprotocol/sui-clmm-sdk on npm](https://www.npmjs.com/package/@cetusprotocol/sui-clmm-sdk)
- [@cetusprotocol/common-sdk on npm](https://www.npmjs.com/package/@cetusprotocol/common-sdk)
