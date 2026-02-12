---
name: cetus-clmm-sdk-skill
description: Guides developers through using Cetus CLMM TypeScript SDK for liquidity management, pool operations, swaps, and reward collection. Use when working with Cetus Protocol's Concentrated Liquidity Market Maker (CLMM) or when the user mentions Cetus SDK, CLMM, liquidity pools, or DeFi on Sui.
---
# Cetus CLMM SDK Guide

## Overview
This Skill provides comprehensive guidance for using the Cetus CLMM (Concentrated Liquidity Market Maker) TypeScript SDK. The SDK enables developers to interact with Cetus Protocol's CLMM on the Sui blockchain, including liquidity management, pool operations, swaps, and reward collection.

## Getting Started
See [Getting Started Guide](reference/getting-started.md) for installation, configuration, and basic setup.

## Core Modules

### Liquidity Management
Add, remove, and manage liquidity positions:
- **Add liquidity**: Deposit tokens into existing positions
- **Remove liquidity**: Withdraw tokens from positions
- **Open Position**: Create new liquidity positions
- **Close Position**: Remove and collect from positions
- [Detailed guide](reference/liquidity-management.md)

### Pool Operations
Create and interact with CLMM pools:
- **Create CLMM Pool**: Initialize new trading pools
- **Getting CLMM Pools**: Query and list available pools
- **Gets ticks**: Fetch tick data for price ranges
- [Detailed guide](reference/pool-operations.md)

### Swap Operations
Execute token swaps with optimized pricing:
- **Pre Swap**: Calculate swap outcomes before execution
- **Swap**: Execute token exchanges
- **Price impact & fees**: Calculate trading costs
- [Detailed guide](reference/swap-operations.md)

### Rewards Management
Collect and manage liquidity provider rewards:
- **Collect rewards**: Claim accumulated rewards
- **Gets Pool Position Rewards**: Query reward amounts for positions
- [Detailed guide](reference/rewards-management.md)

### Math Utilities
CLMM calculation tools from `@cetusprotocol/common-sdk`:
- **Price conversions**: Convert between price, sqrt price, and tick index
- **Liquidity calculations**: Compute liquidity amounts and token requirements
- **Tick math**: Work with tick indices and ranges
- [Detailed guide](reference/math-utils.md)

## Examples
- [End-to-end Liquidity Management](reference/examples/end-to-end-liquidity.md) - Complete workflow for adding and managing liquidity
- [Complete Swap Flow](reference/examples/complete-swap-flow.md) - Full swap execution with pre-calculation
- [Reward Collection Workflow](reference/examples/reward-collection.md) - Claiming and managing rewards

## Best Practices

### SDK Initialization
Always initialize the SDK with appropriate network configuration:
```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'

// For mainnet use
const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

// For testnet use
const sdk = CetusClmmSDK.createSDK({ env: 'testnet' })
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
4. Consult the [Cetus documentation](https://docs.cetus.zone) for updates

## Resources
- [Cetus Protocol Documentation](https://docs.cetus.zone)
- [Sui Blockchain Documentation](https://docs.sui.io)
- [@cetusprotocol/sui-clmm-sdk on npm](https://www.npmjs.com/package/@cetusprotocol/sui-clmm-sdk)
- [@cetusprotocol/common-sdk on npm](https://www.npmjs.com/package/@cetusprotocol/common-sdk)