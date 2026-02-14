---
name: cetus-dlmm-sdk-skill
description: Guides users on how to use the Cetus DLMM TypeScript SDK for liquidity management, trading operations, and fee calculations. Use this skill when users need to operate Cetus DLMM liquidity pools, manage positions, execute swaps, or calculate price fees.
---

# Cetus DLMM TypeScript SDK Usage Guide

## Quick Start

### Installation
```bash
npm install @cetusprotocol/dlmm-sdk
```

### SDK Initialization
Cetus DLMM SDK provides multiple initialization methods:

**Method 1: Use default configuration (Mainnet)**
```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'

const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
sdk.setSenderAddress(walletAddress)
```

**Method 2: Use Testnet**
```typescript
const sdk = CetusDlmmSDK.createSDK({ env: 'testnet' })
```

**Method 3: Custom Configuration**
```typescript
const sdk = CetusDlmmSDK.createCustomSDK({
  env: 'mainnet',
  // Custom configuration parameters
})
```

**Method 4: Set Sender Address**
```typescript
sdk.setSenderAddress('0xYourWalletAddress')
```

### Basic Configuration
- **Network Selection**: `mainnet` or `testnet`
- **Wallet Address**: Must set sender address to execute transactions
- **RPC Configuration**: Supports custom RPC endpoints

## Core Concepts

### Differences between DLMM and Traditional AMM
DLMM (Dynamic Liquidity Market Maker) is Cetus Protocol's next-generation AMM protocol. Compared with traditional CLMM (Concentrated Liquidity Market Maker), it has the following characteristics:

1. **Bin System**: Uses discrete bins instead of continuous ticks
2. **Dynamic Liquidity**: Liquidity automatically rebalances within price ranges
3. **Multi-Strategy Support**: Three strategy types: Spot, BidAsk, and Curve
4. **Fee Optimization**: Variable fee mechanism and protocol fee separation

### Bin System and Bin Step
- **Bin**: Discrete price intervals, each with independent liquidity
- **Bin Step**: Price interval between bins (expressed in basis points)
- **Bin ID**: Unique identifier, the price relationship can be calculated via `BinUtils`

### Three Strategy Types
1. **Spot Strategy**: Spot strategy, suitable for providing liquidity around the current price
2. **BidAsk Strategy**: Bid-ask strategy, suitable for market makers
3. **Curve Strategy**: Curve strategy, automatically adjusts liquidity distribution

### Fee Structure
- **Base Fee**: Fixed fee rate
- **Variable Fee**: Dynamically adjusted based on market volatility
- **Protocol Fee**: Portion of fees collected by the protocol
- **Partner Fee**: Fee sharing for referred partners

## Key Feature Overview

### Liquidity Management
Provides complete functionality for adding, removing, and managing liquidity. Supports three strategy types and flexible price range settings.

**Detailed Guide**: See [Liquidity Management Guide](examples/liquidity-management.md) for:
- Complete add liquidity workflow
- Applicable scenarios and configuration for different strategies
- Real examples based on `add_liquidity_spot.test.ts`

### Swap Operations
Execute token swaps, supporting exact input/output modes and slippage protection.

**Detailed Guide**: See [Swap Operations Guide](examples/swap-operations.md) for:
- Usage examples of `preSwapQuote()` and `swapPayload()`
- Slippage protection and fee calculations
- Transaction verification and error handling

### Position Management
Manage position lifecycle, including opening positions, adding/removing liquidity, closing positions, and fee collection.

**Detailed Guide**: See [Position Management Guide](examples/position-management.md) for:
- Usage examples of `open_position()` and `close_position()`
- Batch fee collection with `collectRewardAndFeePayload()`
- Complete workflow based on `PositionModule`

### Pool Management
Create and manage DLMM pools, configure fee structures and strategy parameters.

**Detailed Guide**: See [Pool Management Guide](examples/pool-management.md) for:
- Parameter configuration for `createPoolPayload()`
- Fee rate and strategy type settings
- Pool information queries and status monitoring

### Utility Functions
Provides utility functions for price calculations, fee calculations, and liquidity calculations.

**Detailed Reference**: See [Utility Functions Reference](api-reference/tool-functions.md) for:
- **BinUtils**: Price-to-Bin ID conversion, sqrt price calculations
- **FeeUtils**: Fee calculations, protocol fee distribution

## Cetus DLMM SDK Usage Workflow

Copy this checklist and track progress:

```
Cetus DLMM SDK Usage Progress:
- [ ] Step 1: Install SDK and initialize
- [ ] Step 2: Understand core concepts (Bin, strategy types, fee structure)
- [ ] Step 3: Select operation type (add liquidity, swap, position management, etc.)
- [ ] Step 4: Prepare parameters (amount, price range, strategy type configuration)
- [ ] Step 5: Call SDK functions to get transaction data
- [ ] Step 6: Simulate transaction to verify feasibility
- [ ] Step 7: Execute transaction and monitor status
- [ ] Step 8: Verify results and handle exceptions
```

## Operation Selection Workflow

### 1. Determine Your Needs

**Need to provide liquidity?** → Select "Liquidity Management" workflow
**Need to execute a trade?** → Select "Swap Operations" workflow
**Need to manage existing positions?** → Select "Position Management" workflow
**Need to create a new pool?** → Select "Pool Management" workflow

### 2. Liquidity Management Workflow
1. Refer to [Liquidity Management Guide](examples/liquidity-management.md)
2. Select appropriate strategy type (Spot/BidAsk/Curve)
3. Use BinUtils to calculate price range
4. Call `calculateAddLiquidityInfo()` to calculate liquidity distribution
5. Create and execute transaction

### 3. Swap Operations Workflow
1. Refer to [Swap Operations Guide](examples/swap-operations.md)
2. Get pre-swap quote with `preSwapQuote()`
3. Set appropriate slippage protection
4. Execute swap transaction with `swapPayload()`
5. Verify transaction results

### 4. Other Workflows
Refer to the respective detailed guides for complete guidance.

## Frequently Asked Questions

### 1. How to handle transaction failures?
- **Check parameters**: Ensure all parameter formats are correct
- **Verify balance**: Confirm wallet has sufficient balance to pay transaction fees
- **Simulate transaction**: Use `FullClient.sendSimulationTransaction()` to pre-execute transaction
- **Check errors**: Examine console error messages and transaction status

### 2. How to optimize Gas costs?
- **Batch operations**: Use batch functions like `collectRewardAndFeePayload()`
- **Set reasonable Gas budget**: Set appropriate Gas budget based on operation complexity
- **Choose off-peak hours**: Execute transactions during non-congested network times
- **Use testnet**: Validate operations on testnet first

### 3. How to set price slippage protection?
- **Set `max_price_slippage` parameter**: Typically set to 0.01 (1%)
- **Real-time price check**: Check current price before execution
- **Use `validateActiveIdSlippage()`**: Validate active Bin ID slippage

### 4. How to choose strategy types?
- **Spot strategy**: Suitable for around current price, liquidity concentration
- **BidAsk strategy**: Suitable for market making, larger bid-ask spread
- **Curve strategy**: Suitable for automatic adjustment, wider price range

## Next Steps

### Further Learning
- View [Complete Example Code](examples/full-examples.md) for end-to-end usage scenarios
- Learn [Advanced Strategies](examples/liquidity-management.md#advanced-strategies) to optimize liquidity provision
- Explore [API Reference](api-reference/tool-functions.md) for detailed function descriptions

### Practical Projects
1. Create a small liquidity position on testnet
2. Execute a token swap operation
3. Try collecting position fees and rewards
4. Create a custom DLMM pool configuration

### Resource Links
- [Cetus Protocol Official Documentation](https://cetus-1.gitbook.io/cetus-developer-docs)
- [GitHub Repository](https://github.com/CetusProtocol)

---

**Note**: This guide is based on Cetus DLMM SDK v1.0.3. SDK updates may cause API changes; please refer to the latest official documentation.