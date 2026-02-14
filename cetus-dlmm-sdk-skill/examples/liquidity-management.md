# Liquidity Management Detailed Guide

## Overview

Liquidity management is the core functionality of the DLMM protocol, allowing users to provide liquidity within specific price ranges and earn transaction fee rewards. Cetus DLMM SDK supports three strategy types: Spot, Curve, and BidAsk, each suitable for different market scenarios.

## Core Concepts

### Strategy Types

**1. Spot Strategy**
- **Applicable Scenarios**: Around current price, liquidity concentration
- **Characteristics**: Provides liquidity near active Bin, suitable for market-neutral strategies
- **Parameters**: Fixed amount or fixed liquidity

**2. Curve Strategy**
- **Applicable Scenarios**: Wide price range, automatic liquidity distribution adjustment
- **Characteristics**: Distributes liquidity according to curve, suitable for automatic rebalancing
- **Parameters**: Fixed amount, automatic distribution calculation

**3. BidAsk Strategy**
- **Applicable Scenarios**: Market makers, larger bid-ask spread
- **Characteristics**: Provides liquidity on both bid and ask sides, suitable for market making
- **Parameters**: Bid-ask spread configuration

### Key Parameters

- **Price Range**: Defined by `lower_bin_id` and `upper_bin_id`
- **Amount Configuration**: `amount_a` and `amount_b` or `coin_amount` plus `fix_amount_a`
- **Slippage Protection**: `max_price_slippage` prevents significant price fluctuations
- **Active Bin Check**: `getActiveBinIfInRange()` ensures active Bin is within range

## Add Liquidity Workflow

### Step 1: Initialize SDK and Get Pool Information

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'
import { BinUtils, StrategyType } from '@cetusprotocol/dlmm-sdk/utils'

// Initialize SDK
const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
sdk.setSenderAddress(walletAddress)

// Get pool information
const pool = await sdk.Pool.getPool(poolId)
const { active_id, bin_step, coin_type_a, coin_type_b } = pool
```

### Step 2: Calculate Price Range

Calculate corresponding Bin IDs based on target price range:

```typescript
// Use BinUtils to calculate Bin ID from price
const lowerPrice = '0.99'  // Lower bound price
const upperPrice = '1.01'  // Upper bound price
const min = true           // Whether to use minimum Bin ID (true means round down)
const decimals_a = 6       // Coin A decimal places
const decimals_b = 6       // Coin B decimal places

const lowerBinId = BinUtils.getBinIdFromPrice(lowerPrice, bin_step, min, decimals_a, decimals_b)
const upperBinId = BinUtils.getBinIdFromPrice(upperPrice, bin_step, min, decimals_a, decimals_b)

console.log(`Price range: ${lowerPrice} - ${upperPrice}`)
console.log(`Bin ID range: ${lowerBinId} - ${upperBinId}`)
```

### Step 3: Check Active Bin

Ensure current active Bin is within target price range:

```typescript
const amountsInActiveBin = await sdk.Position.getActiveBinIfInRange(
  pool.bin_manager.bin_manager_handle,
  lowerBinId,
  upperBinId,
  active_id,
  bin_step
)

if (!amountsInActiveBin) {
  throw new Error('Active Bin is not within target price range')
}
```

### Step 4: Calculate Liquidity Distribution

Calculate liquidity distribution based on selected strategy type:

#### Spot Strategy (Fixed Dual-Coin Amount)
```typescript
const calculateOption = {
  pool_id: poolId,
  amount_a: '1000000',  // 1 Coin A (assuming 6 decimal places)
  amount_b: '1200000',  // 1.2 Coin B
  active_id,
  bin_step,
  lower_bin_id: lowerBinId,
  upper_bin_id: upperBinId,
  active_bin_of_pool: amountsInActiveBin,
  strategy_type: StrategyType.Spot
}

const binInfos = await sdk.Position.calculateAddLiquidityInfo(calculateOption)
console.log('Liquidity distribution:', binInfos)
```

#### Spot Strategy (Fixed Single-Coin Amount)
```typescript
const coinAmount = '1000000'  // 1 Coin A
const fixAmountA = true       // Fixed Coin A amount

const calculateOption = {
  pool_id: poolId,
  coin_amount: coinAmount,
  fix_amount_a: fixAmountA,
  active_id,
  bin_step,
  lower_bin_id: lowerBinId,
  upper_bin_id: upperBinId,
  active_bin_of_pool: amountsInActiveBin,
  strategy_type: StrategyType.Spot
}

const binInfos = await sdk.Position.calculateAddLiquidityInfo(calculateOption)
```

#### Curve Strategy
```typescript
const calculateOption = {
  pool_id: poolId,
  coin_amount: '5000000',  // Fixed amount
  fix_amount_a: true,      // Fixed Coin A amount
  active_id,
  bin_step,
  lower_bin_id: lowerBinId,
  upper_bin_id: upperBinId,
  active_bin_of_pool: amountsInActiveBin,
  strategy_type: StrategyType.Curve  // Use Curve strategy
}

const binInfos = await sdk.Position.calculateAddLiquidityInfo(calculateOption)
```

### Step 5: Create Transaction

Create transaction based on calculated liquidity distribution:

#### Open Position and Add Liquidity (New Position)
```typescript
const addOption = {
  pool_id: poolId,
  bin_infos: binInfos,
  coin_type_a: pool.coin_type_a,
  coin_type_b: pool.coin_type_b,
  lower_bin_id: lowerBinId,
  upper_bin_id: upperBinId,
  active_id,
  strategy_type: StrategyType.Spot,
  use_bin_infos: false,
  max_price_slippage: 0.01,  // 1% slippage protection
  bin_step
}

const tx = sdk.Position.addLiquidityPayload(addOption)
tx.setGasBudget(10000000000)  // Set Gas budget
```

#### Add Liquidity to Existing Position
```typescript
const addOption = {
  pool_id: poolId,
  bin_infos: binInfos,
  coin_type_a: pool.coin_type_a,
  coin_type_b: pool.coin_type_b,
  active_id,
  position_id: existingPositionId,  // Existing position ID
  collect_fee: true,                // Simultaneously collect fees
  reward_coins: [],                 // Reward coin list
  strategy_type: StrategyType.Spot,
  use_bin_infos: false,
  max_price_slippage: 0.01,
  bin_step
}

const tx = sdk.Position.addLiquidityPayload(addOption)
```

### Step 6: Execute Transaction

```typescript
// Simulate transaction verification
const simResult = await sdk.FullClient.sendSimulationTransaction(tx, walletAddress)
if (simResult.effects.status.status === 'success') {
  console.log('Transaction simulation successful')

  // Execute actual transaction
  const result = await sdk.FullClient.executeTx(keyPair, tx, true)
  console.log('Transaction execution successful:', result)
} else {
  console.error('Transaction simulation failed:', simResult)
  throw new Error('Transaction simulation failed, please check parameters')
}
```

## Remove Liquidity Workflow

### Partial Remove Liquidity

```typescript
const removeOption = {
  pool_id: poolId,
  position_id: positionId,
  remove_liquidity: '500000',  // Remove 50% liquidity
  collect_fee: true,           // Simultaneously collect fees
  reward_coins: []             // Reward coin list
}

const tx = sdk.Position.removeLiquidityPayload(removeOption)
```

### Complete Remove Liquidity and Close Position

```typescript
const closeOption = {
  pool_id: poolId,
  position_id: positionId,
  reward_coins: []  // Reward coin list
}

const tx = sdk.Position.closePositionPayload(closeOption)
```

## Advanced Strategies

### Multi-Position Management

DLMM supports up to 1000 Bins per position. If the price range exceeds 1000 Bins, the SDK automatically splits into multiple positions:

```typescript
// BinUtils automatically handles position splitting
const positionCount = BinUtils.getPositionCount(lowerBinId, upperBinId)
console.log(`Need to create ${positionCount} positions`)

// splitBinLiquidityInfo function automatically splits
const splitPositions = BinUtils.splitBinLiquidityInfo(binInfos, lowerBinId, upperBinId)
```

### Fee Optimization

- **Regular fee collection**: Collect fees when they exceed threshold, reducing transaction count
- **Batch operations**: Use `collectRewardAndFeePayload()` to batch collect fees from multiple positions
- **Gas optimization**: Set reasonable Gas budget, avoid excessive fees

### Risk Management

1. **Price slippage protection**: Set reasonable `max_price_slippage` (recommended 1-5%)
2. **Range validation**: Use `validateActiveIdSlippage()` to validate price fluctuations
3. **Transaction simulation**: Always simulate before executing actual transactions
4. **Monitor active Bin**: Regularly check if active Bin remains within target range

## Complete Example

The following is a complete Spot strategy add liquidity example, based on `add_liquidity_spot.test.ts`:

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'
import { BinUtils, StrategyType } from '@cetusprotocol/dlmm-sdk/utils'

async function addLiquiditySpot() {
  // 1. Initialize
  const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
  sdk.setSenderAddress(walletAddress)

  // 2. Get pool information
  const poolId = '0xd4e815d17d501c9585f0d073c3b6dbf2615ee6ca5ba83af5a8cccada9d665e45'
  const pool = await sdk.Pool.getPool(poolId)
  const { active_id, bin_step, coin_type_a, coin_type_b } = pool

  // 3. Calculate price range
  const lowerBinId = BinUtils.getBinIdFromPrice('0.99', bin_step, true, 6, 6)
  const upperBinId = BinUtils.getBinIdFromPrice('1.01', bin_step, true, 6, 6)

  // 4. Check active Bin
  const amountsInActiveBin = await sdk.Position.getActiveBinIfInRange(
    pool.bin_manager.bin_manager_handle,
    lowerBinId,
    upperBinId,
    active_id,
    bin_step
  )

  // 5. Calculate liquidity distribution
  const binInfos = await sdk.Position.calculateAddLiquidityInfo({
    pool_id: poolId,
    amount_a: '1000000',
    amount_b: '1200000',
    active_id,
    bin_step,
    lower_bin_id: lowerBinId,
    upper_bin_id: upperBinId,
    active_bin_of_pool: amountsInActiveBin,
    strategy_type: StrategyType.Spot
  })

  // 6. Create transaction
  const tx = await sdk.Position.addLiquidityWithPricePayload({
    pool_id: poolId,
    bin_infos: binInfos,
    coin_type_a,
    coin_type_b,
    price_base_coin: 'coin_a',
    price: BinUtils.getPriceFromBinId(active_id, bin_step, 6, 6).toString(),
    lower_price: '0.99',
    upper_price: '1.01',
    bin_step,
    active_bin_of_pool: amountsInActiveBin,
    strategy_type: StrategyType.Spot,
    decimals_a: 6,
    decimals_b: 6,
    max_price_slippage: 0.01,
    active_id
  })

  // 7. Execute transaction
  const result = await sdk.FullClient.executeTx(keyPair, tx, true)
  return result
}
```

## Troubleshooting

### Common Errors

1. **"Active Bin is not within target price range"**
   - **Cause**: Current price has exceeded the set price range
   - **Solution**: Expand price range or wait for price to return

2. **"Transaction simulation failed"**
   - **Cause**: Parameter error, insufficient balance, or Gas budget too low
   - **Solution**: Check parameters, confirm balance, increase Gas budget

3. **"Bin ID calculation error"**
   - **Cause**: Price, decimal places, or base coin setting error
   - **Solution**: Use `BinUtils.getPriceFromBinId()` for reverse verification

4. **"Position count exceeds limit"**
   - **Cause**: Price range too wide, exceeding 1000 Bins
   - **Solution**: Narrow price range or let SDK automatically split

### Debugging Suggestions

1. **Enable detailed logging**: Set `console.log` to view intermediate results
2. **Step-by-step verification**: Execute step by step and verify each result
3. **Use testnet**: First validate complete workflow on testnet
4. **Reference test files**: Check test files like `add_liquidity_spot.test.ts`

## Best Practices

1. **Start small**: First test complete workflow with small amounts
2. **Set reasonable ranges**: Set price ranges based on market volatility
3. **Regular monitoring**: Monitor position status and fee accumulation
4. **Timely adjustments**: Adjust strategies and parameters based on market changes
5. **Safety first**: Always use transaction simulation verification before execution

---

**Note**: This document is based on Cetus DLMM SDK v1.0.3 and test file `add_liquidity_spot.test.ts`. For actual use, please refer to the latest SDK documentation and test cases.