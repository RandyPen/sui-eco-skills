# Position Management Detailed Guide

Position management is one of the core functionalities of the DLMM protocol, allowing users to create, manage, and optimize liquidity positions. Positions represent liquidity provided by users within specific price ranges, earning transaction fee rewards.

## Overview

DLMM position management provides the following core functionalities:

### Position Lifecycle
1. **Open Position**: Create a new position and provide initial liquidity
2. **Add Liquidity**: Add liquidity to an existing position
3. **Remove Liquidity**: Partially remove liquidity from a position
4. **Close Position**: Completely remove liquidity and close the position
5. **Collect Fees**: Collect accumulated transaction fees
6. **Collect Rewards**: Collect liquidity mining rewards
7. **Position Queries**: Get position status and information

### Key Position Attributes
- **Position ID**: Unique identifier
- **Pool ID**: Associated liquidity pool
- **Price Range**: Lower Bin ID and upper Bin ID
- **Liquidity Shares**: Liquidity distribution across bins
- **Accumulated Fees**: Uncollected transaction fees
- **Accumulated Rewards**: Uncollected mining rewards

## Core Concepts

### Position Structure
Each position contains the following information:
```typescript
type DlmmPosition = {
  id: string;           // Position ID
  pool_id: string;      // Pool ID
  index: number;        // Position index
  description: string;  // Description
  uri: string;          // Metadata URI
  liquidity_shares: string[]; // Liquidity shares array
  lower_bin_id: number; // Lower Bin ID
  upper_bin_id: number; // Upper Bin ID
  name: string;         // Position name
  // Inherited from CoinPairType
  coin_type_a: string;  // Coin A type
  coin_type_b: string;  // Coin B type
}
```

### Price Range Limits
- Each position can contain up to **1000 Bins** (`MAX_BIN_PER_POSITION`)
- If the price range exceeds 1000 Bins, the SDK automatically splits it into multiple positions
- Use `BinUtils.splitBinLiquidityInfo()` for automatic splitting

### Fees and Rewards
- **Transaction Fees**: Accumulated based on trading volume and fee rates
- **Protocol Fees**: Portion of fees collected by the protocol
- **Liquidity Mining Rewards**: Additional token rewards
- **Partner Fees**: Fee sharing for referral partners

## Position Management Workflow

### Step 1: Initialize SDK and Get Position Information

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'

// Initialize SDK
const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
sdk.setSenderAddress(walletAddress)

// Get all positions for a user
async function getUserPositions(walletAddress: string) {
  const positions = await sdk.Position.getOwnerPositionList(walletAddress)
  console.log(`User ${walletAddress} has ${positions.length} positions`)

  positions.forEach((position, index) => {
    console.log(`Position ${index + 1}:`)
    console.log(`  ID: ${position.id}`)
    console.log(`  Pool: ${position.pool_id}`)
    console.log(`  Price range: Bin ${position.lower_bin_id} - ${position.upper_bin_id}`)
    console.log(`  Coin A: ${position.coin_type_a}`)
    console.log(`  Coin B: ${position.coin_type_b}`)
  })

  return positions
}

// Get specific position details
async function getPositionDetails(positionId: string) {
  const position = await sdk.Position.getPosition(positionId)
  console.log('Position details:', position)
  return position
}
```

### Step 2: Check Active Bin Status
Before adding or removing liquidity, check if the current active Bin is within the position's price range:

```typescript
async function checkActiveBinInRange(poolId: string, lowerBinId: number, upperBinId: number) {
  const pool = await sdk.Pool.getPool(poolId)
  const { active_id, bin_step, bin_manager } = pool

  const amountsInActiveBin = await sdk.Position.getActiveBinIfInRange(
    bin_manager.bin_manager_handle,
    lowerBinId,
    upperBinId,
    active_id,
    bin_step
  )

  if (amountsInActiveBin) {
    console.log('Active Bin is within price range:', amountsInActiveBin)
    return amountsInActiveBin
  } else {
    console.log('Active Bin is not within price range')
    return null
  }
}
```

### Step 3: Manage Position Liquidity

#### 3.1 Add Liquidity to Existing Position

Based on the example from `add_liquidity_spot.test.ts`:

```typescript
async function addLiquidityToPosition() {
  // 1. Prepare parameters
  const poolId = '0xd4e815d17d501c9585f0d073c3b6dbf2615ee6ca5ba83af5a8cccada9d665e45'
  const positionId = '0xf5139870fbc926d1ca1afdc536b4ab457a9c2a696440d10955572f04b95d9e29'

  // 2. Get pool and position information
  const pool = await sdk.Pool.getPool(poolId)
  const position = await sdk.Position.getPosition(positionId)

  const { active_id, bin_step, coin_type_a, coin_type_b } = pool
  const { lower_bin_id, upper_bin_id } = position

  // 3. Check active Bin
  const amountsInActiveBin = await sdk.Position.getActiveBinIfInRange(
    pool.bin_manager.bin_manager_handle,
    lower_bin_id,
    upper_bin_id,
    active_id,
    bin_step
  )

  if (!amountsInActiveBin) {
    throw new Error('Active Bin is not within position price range')
  }

  // 4. Calculate liquidity distribution (Spot strategy, fixed dual-coin amounts)
  const binInfos = await sdk.Position.calculateAddLiquidityInfo({
    pool_id: poolId,
    amount_a: '1000000',  // 1 Coin A (assuming 6 decimals)
    amount_b: '0',        // Only add Coin A
    active_id,
    bin_step,
    lower_bin_id,
    upper_bin_id,
    active_bin_of_pool: amountsInActiveBin,
    strategy_type: 0  // StrategyType.Spot
  })

  console.log('Liquidity distribution calculation completed:', {
    Total Coin A: binInfos.amount_a,
    Total Coin B: binInfos.amount_b,
    Bin count: binInfos.bins.length
  })

  // 5. Create add liquidity transaction
  const tx = sdk.Position.addLiquidityPayload({
    pool_id: poolId,
    bin_infos: binInfos,
    coin_type_a,
    coin_type_b,
    active_id,
    position_id: positionId,
    collect_fee: true,        // Collect fees simultaneously
    reward_coins: [],         // Reward coin list
    strategy_type: 0,         // Spot strategy
    use_bin_infos: false,     // Use strategy type automatic calculation
    max_price_slippage: 0.01, // 1% slippage protection
    bin_step
  })

  // 6. Set Gas budget
  tx.setGasBudget(10000000000)

  console.log('Add liquidity transaction created successfully')
  return tx
}
```

#### 3.2 Remove Liquidity from Position

```typescript
async function removeLiquidityFromPosition() {
  const poolId = '0xd4e815d17d501c9585f0d073c3b6dbf2615ee6ca5ba83af5a8cccada9d665e45'
  const positionId = '0xf5139870fbc926d1ca1afdc536b4ab457a9c2a696440d10955572f04b95d9e29'

  const pool = await sdk.Pool.getPool(poolId)
  const { active_id, bin_step, coin_type_a, coin_type_b } = pool

  // Get current position Bin information
  const position = await sdk.Position.getPosition(positionId)

  // Method 1: Remove by percentage
  const removePercent = 0.5 // Remove 50% liquidity

  const tx = sdk.Position.removeLiquidityPayload({
    pool_id: poolId,
    position_id: positionId,
    active_id,
    bin_step,
    bin_infos: {
      bins: [], // Can be empty when removing by percentage
      amount_a: '0',
      amount_b: '0'
    },
    slippage: 0.01,          // 1% slippage protection
    reward_coins: [],        // Collect rewards simultaneously
    collect_fee: true,       // Collect fees simultaneously
    remove_percent: removePercent,
    coin_type_a,
    coin_type_b
  })

  console.log(`Remove ${removePercent * 100}% liquidity transaction created successfully`)
  return tx
}
```

#### 3.3 Calculate and Remove Liquidity Precisely

If precise control over liquidity removal amount is needed:

```typescript
async function calculateAndRemoveLiquidity() {
  const poolId = '0xd4e815d17d501c9585f0d073c3b6dbf2615ee6ca5ba83af5a8cccada9d665e45'
  const positionId = '0xf5139870fbc926d1ca1afdc536b4ab457a9c2a696440d10955572f04b95d9e29'

  const pool = await sdk.Pool.getPool(poolId)
  const { active_id, bin_step, coin_type_a, coin_type_b } = pool

  // Get position's Bin information (needs to be fetched from chain)
  // Simplified as example, actual implementation requires querying position's Bin data
  const bins: BinAmount[] = [
    {
      bin_id: 1000,
      amount_a: '500000',
      amount_b: '0',
      liquidity: '1000000',
      price_per_lamport: '1.0'
    },
    // ... more Bin data
  ]

  // Calculate liquidity distribution to remove
  const removeLiquidityInfo = sdk.Position.calculateRemoveLiquidityInfo({
    bins,
    active_id,
    fix_amount_a: true,      // Fixed remove Coin A amount
    coin_amount: '250000'    // Remove 250000 Coin A
  })

  console.log('Remove liquidity calculation result:', removeLiquidityInfo)

  // Create remove liquidity transaction
  const tx = sdk.Position.removeLiquidityPayload({
    pool_id: poolId,
    position_id: positionId,
    active_id,
    bin_step,
    bin_infos: removeLiquidityInfo,
    slippage: 0.01,
    reward_coins: [],
    collect_fee: true,
    coin_type_a,
    coin_type_b
  })

  return tx
}
```

### Step 4: Close Position Operation

Completely remove liquidity and close position:

```typescript
async function closePosition() {
  const poolId = '0xd4e815d17d501c9585f0d073c3b6dbf2615ee6ca5ba83af5a8cccada9d665e45'
  const positionId = '0xf5139870fbc926d1ca1afdc536b4ab457a9c2a696440d10955572f04b95d9e29'

  const pool = await sdk.Pool.getPool(poolId)
  const { coin_type_a, coin_type_b } = pool

  // Create close position transaction
  const tx = sdk.Position.closePositionPayload({
    pool_id: poolId,
    position_id: positionId,
    reward_coins: []  // Reward coin list
  })

  console.log('Close position transaction created successfully')
  return tx
}
```

### Step 5: Collect Fees and Rewards

#### 5.1 Collect Transaction Fees

```typescript
async function collectFees() {
  const poolId = '0xd4e815d17d501c9585f0d073c3b6dbf2615ee6ca5ba83af5a8cccada9d665e45'
  const positionId = '0xf5139870fbc926d1ca1afdc536b4ab457a9c2a696440d10955572f04b95d9e29'

  const pool = await sdk.Pool.getPool(poolId)
  const { coin_type_a, coin_type_b } = pool

  // Create collect fee transaction
  const tx = sdk.Position.collectFeePayload({
    pool_id: poolId,
    position_id: positionId,
    coin_type_a,
    coin_type_b
  })

  console.log('Collect fee transaction created successfully')
  return tx
}
```

#### 5.2 Collect Mining Rewards

```typescript
async function collectRewards() {
  const poolId = '0xd4e815d17d501c9585f0d073c3b6dbf2615ee6ca5ba83af5a8cccada9d665e45'
  const positionId = '0xf5139870fbc926d1ca1afdc536b4ab457a9c2a696440d10955572f04b95d9e29'

  const pool = await sdk.Pool.getPool(poolId)
  const { coin_type_a, coin_type_b } = pool

  // Reward coin list (needs to query which reward coins the pool supports)
  const rewardCoins = [
    '0xreward_coin_type1',
    '0xreward_coin_type2'
  ]

  // Create collect rewards transaction
  const tx = sdk.Position.collectRewardPayload([{
    pool_id: poolId,
    position_id: positionId,
    reward_coins: rewardCoins,
    coin_type_a,
    coin_type_b
  }])

  console.log('Collect rewards transaction created successfully')
  return tx
}
```

#### 5.3 Batch Collect Fees and Rewards

```typescript
async function collectFeesAndRewardsBatch() {
  // Batch collection for multiple positions
  const options = [
    {
      pool_id: '0xd4e815d17d501c9585f0d073c3b6dbf2615ee6ca5ba83af5a8cccada9d665e45',
      position_id: '0xf5139870fbc926d1ca1afdc536b4ab457a9c2a696440d10955572f04b95d9e29',
      reward_coins: ['0xreward_coin_type1']
    },
    {
      pool_id: '0xanother_pool_id',
      position_id: '0xanother_position_id',
      reward_coins: ['0xreward_coin_type2']
    }
  ]

  // Need to set coin types for each option
  const enhancedOptions = await Promise.all(
    options.map(async (option) => {
      const pool = await sdk.Pool.getPool(option.pool_id)
      return {
        ...option,
        coin_type_a: pool.coin_type_a,
        coin_type_b: pool.coin_type_b
      }
    })
  )

  // Create batch collection transaction
  const tx = sdk.Position.collectRewardAndFeePayload(enhancedOptions)

  console.log(`Batch collection transaction created successfully for ${enhancedOptions.length} positions`)
  return tx
}
```

### Step 6: Query Fees and Rewards Information

Query collectible fees and rewards before collection:

```typescript
async function fetchPositionFeesAndRewards() {
  const options = [
    {
      pool_id: '0xd4e815d17d501c9585f0d073c3b6dbf2615ee6ca5ba83af5a8cccada9d665e45',
      position_id: '0xf5139870fbc926d1ca1afdc536b4ab457a9c2a696440d10955572f04b95d9e29',
      reward_coins: ['0xreward_coin_type1']
    }
  ]

  // Need to set coin types for each option
  const pool = await sdk.Pool.getPool(options[0].pool_id)
  const enhancedOptions = [{
    ...options[0],
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b
  }]

  // Query fees and rewards data
  const { feeData, rewardData } = await sdk.Position.fetchPositionFeeAndReward(enhancedOptions)

  console.log('Fee data:', feeData)
  console.log('Reward data:', rewardData)

  return { feeData, rewardData }
}
```

## Complete Examples

### Example 1: Complete Position Management Lifecycle

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'
import { BinUtils, StrategyType } from '@cetusprotocol/dlmm-sdk/utils'

class PositionManager {
  private sdk: CetusDlmmSDK

  constructor() {
    this.sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
  }

  async managePositionLifecycle(walletAddress: string, poolId: string) {
    this.sdk.setSenderAddress(walletAddress)

    console.log('=== Position Management Lifecycle Start ===')

    // 1. Get user positions
    const positions = await this.sdk.Position.getOwnerPositionList(walletAddress)
    console.log(`User has ${positions.length} positions`)

    if (positions.length === 0) {
      console.log('No positions found, need to create a position first')
      return
    }

    // Use the first position for demonstration
    const position = positions[0]
    console.log('Selected position:', position.id)

    // 2. Check position status
    const pool = await this.sdk.Pool.getPool(position.pool_id)
    const { active_id, bin_step, bin_manager } = pool

    const activeBinInfo = await this.sdk.Position.getActiveBinIfInRange(
      bin_manager.bin_manager_handle,
      position.lower_bin_id,
      position.upper_bin_id,
      active_id,
      bin_step
    )

    if (activeBinInfo) {
      console.log('Position status: Active Bin is within range')
    } else {
      console.log('Position status: Active Bin is not within range, may not receive fees')
    }

    // 3. Query collectible fees and rewards
    const { feeData, rewardData } = await this.sdk.Position.fetchPositionFeeAndReward([{
      pool_id: position.pool_id,
      position_id: position.id,
      reward_coins: [], // Set based on actual pool rewards
      coin_type_a: position.coin_type_a,
      coin_type_b: position.coin_type_b
    }])

    console.log('Collectible fees:', feeData)
    console.log('Collectible rewards:', rewardData)

    // 4. Add liquidity (example)
    console.log('=== Add Liquidity Example ===')
    if (activeBinInfo) {
      const binInfos = await this.sdk.Position.calculateAddLiquidityInfo({
        pool_id: position.pool_id,
        amount_a: '1000000', // 1 Coin A
        amount_b: '0',
        active_id,
        bin_step,
        lower_bin_id: position.lower_bin_id,
        upper_bin_id: position.upper_bin_id,
        active_bin_of_pool: activeBinInfo,
        strategy_type: StrategyType.Spot
      })

      console.log('Add liquidity distribution:', {
        'Total Coin A': binInfos.amount_a,
        'Total Coin B': binInfos.amount_b,
        'Bin count': binInfos.bins.length
      })
    }

    // 5. Remove liquidity options (example)
    console.log('=== Remove Liquidity Options ===')
    const removePercent = 0.1 // 10%
    console.log(`Can remove ${removePercent * 100}% liquidity`)

    // 6. Close position options (example)
    console.log('=== Close Position Options ===')
    console.log('Can completely close position and retrieve all liquidity')

    console.log('=== Position Management Lifecycle End ===')

    return {
      position,
      pool,
      activeBinInfo,
      feeData,
      rewardData
    }
  }

  // Add liquidity to position
  async addLiquidity(positionId: string, amountA: string, amountB: string) {
    const position = await this.sdk.Position.getPosition(positionId)
    const pool = await this.sdk.Pool.getPool(position.pool_id)

    const { active_id, bin_step, bin_manager, coin_type_a, coin_type_b } = pool
    const { lower_bin_id, upper_bin_id } = position

    const activeBinInfo = await this.sdk.Position.getActiveBinIfInRange(
      bin_manager.bin_manager_handle,
      lower_bin_id,
      upper_bin_id,
      active_id,
      bin_step
    )

    if (!activeBinInfo) {
      throw new Error('Active Bin is not within position price range')
    }

    const binInfos = await this.sdk.Position.calculateAddLiquidityInfo({
      pool_id: position.pool_id,
      amount_a: amountA,
      amount_b: amountB,
      active_id,
      bin_step,
      lower_bin_id,
      upper_bin_id,
      active_bin_of_pool: activeBinInfo,
      strategy_type: StrategyType.Spot
    })

    const tx = this.sdk.Position.addLiquidityPayload({
      pool_id: position.pool_id,
      bin_infos: binInfos,
      coin_type_a,
      coin_type_b,
      active_id,
      position_id: positionId,
      collect_fee: true,
      reward_coins: [],
      strategy_type: StrategyType.Spot,
      use_bin_infos: false,
      max_price_slippage: 0.01,
      bin_step
    })

    tx.setGasBudget(10000000000)
    return tx
  }

  // Remove liquidity from position
  async removeLiquidity(positionId: string, removePercent: number) {
    const position = await this.sdk.Position.getPosition(positionId)
    const pool = await this.sdk.Pool.getPool(position.pool_id)

    const { active_id, bin_step, coin_type_a, coin_type_b } = pool

    const tx = this.sdk.Position.removeLiquidityPayload({
      pool_id: position.pool_id,
      position_id: positionId,
      active_id,
      bin_step,
      bin_infos: { bins: [], amount_a: '0', amount_b: '0' },
      slippage: 0.01,
      reward_coins: [],
      collect_fee: true,
      remove_percent: removePercent,
      coin_type_a,
      coin_type_b
    })

    return tx
  }

  // Close position
  async closePosition(positionId: string) {
    const position = await this.sdk.Position.getPosition(positionId)
    const pool = await this.sdk.Pool.getPool(position.pool_id)

    const tx = this.sdk.Position.closePositionPayload({
      pool_id: position.pool_id,
      position_id: positionId,
      reward_coins: []
    })

    return tx
  }
}
```

### Example 2: Automated Position Management

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'

class AutomatedPositionManager {
  private sdk: CetusDlmmSDK
  private threshold = {
    minFeeToCollect: '1000000', // Minimum fee collection threshold
    minRewardToCollect: '500000', // Minimum reward collection threshold
    rebalanceThreshold: 0.1 // 10% price offset triggers rebalancing
  }

  constructor() {
    this.sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
  }

  // Monitor and auto-collect fees
  async autoCollectFeesAndRewards(walletAddress: string) {
    this.sdk.setSenderAddress(walletAddress)

    const positions = await this.sdk.Position.getOwnerPositionList(walletAddress)
    const collectOptions = []

    for (const position of positions) {
      const pool = await this.sdk.Pool.getPool(position.pool_id)

      // Query fees and rewards
      const { feeData, rewardData } = await this.sdk.Position.fetchPositionFeeAndReward([{
        pool_id: position.pool_id,
        position_id: position.id,
        reward_coins: [], // Need to set based on pool configuration
        coin_type_a: position.coin_type_a,
        coin_type_b: position.coin_type_b
      }])

      const positionFee = feeData[position.id]
      const positionReward = rewardData[position.id]

      // Check if fee collection threshold is reached
      if (positionFee &&
          (parseInt(positionFee.fee_owned_a) > parseInt(this.threshold.minFeeToCollect) ||
           parseInt(positionFee.fee_owned_b) > parseInt(this.threshold.minFeeToCollect))) {

        collectOptions.push({
          pool_id: position.pool_id,
          position_id: position.id,
          reward_coins: [], // Collect fees only
          coin_type_a: position.coin_type_a,
          coin_type_b: position.coin_type_b
        })

        console.log(`Position ${position.id} reached fee collection threshold`)
      }

      // Check reward collection threshold
      if (positionReward && positionReward.rewards.length > 0) {
        const totalReward = positionReward.rewards.reduce(
          (sum, reward) => sum + parseInt(reward.reward_owned), 0
        )

        if (totalReward > parseInt(this.threshold.minRewardToCollect)) {
          // Update reward coin list
          const rewardCoins = positionReward.rewards.map(reward => reward.coin_type)
          const existingOption = collectOptions.find(opt => opt.position_id === position.id)

          if (existingOption) {
            existingOption.reward_coins = rewardCoins
          } else {
            collectOptions.push({
              pool_id: position.pool_id,
              position_id: position.id,
              reward_coins: rewardCoins,
              coin_type_a: position.coin_type_a,
              coin_type_b: position.coin_type_b
            })
          }

          console.log(`Position ${position.id} reached reward collection threshold`)
        }
      }
    }

    // Execute batch collection
    if (collectOptions.length > 0) {
      console.log(`Executing batch collection, total ${collectOptions.length} positions`)
      const tx = this.sdk.Position.collectRewardAndFeePayload(collectOptions)
      return tx
    } else {
      console.log('No positions reached collection threshold')
      return null
    }
  }

  // Monitor price offset and suggest rebalancing
  async monitorAndRebalance(walletAddress: string) {
    this.sdk.setSenderAddress(walletAddress)

    const positions = await this.sdk.Position.getOwnerPositionList(walletAddress)
    const rebalanceSuggestions = []

    for (const position of positions) {
      const pool = await this.sdk.Pool.getPool(position.pool_id)
      const { active_id } = pool

      // Calculate price offset ratio
      const positionCenter = (position.lower_bin_id + position.upper_bin_id) / 2
      const priceOffset = Math.abs(active_id - positionCenter) / positionCenter

      if (priceOffset > this.threshold.rebalanceThreshold) {
        rebalanceSuggestions.push({
          positionId: position.id,
          poolId: position.pool_id,
          currentActiveBin: active_id,
          positionCenter,
          priceOffset: (priceOffset * 100).toFixed(2) + '%',
          suggestion: 'Consider rebalancing or closing position'
        })
      }
    }

    return rebalanceSuggestions
  }
}
```

## Advanced Strategies

### 1. Multi-Position Management Strategy
For large liquidity providers, may need to manage multiple positions:

```typescript
class MultiPositionManager {
  private sdk: CetusDlmmSDK

  // Create multiple positions based on price ranges
  async createMultiplePositions(poolId: string, totalAmountA: string, totalAmountB: string,
                               priceRanges: Array<{lowerPrice: string, upperPrice: string}>) {
    const pool = await this.sdk.Pool.getPool(poolId)
    const { active_id, bin_step, coin_type_a, coin_type_b } = pool

    const positions = []

    // Evenly distribute amounts to each price range
    const amountAPerRange = (parseInt(totalAmountA) / priceRanges.length).toString()
    const amountBPerRange = (parseInt(totalAmountB) / priceRanges.length).toString()

    for (const range of priceRanges) {
      const lowerBinId = BinUtils.getBinIdFromPrice(range.lowerPrice, bin_step, true, 6, 6)
      const upperBinId = BinUtils.getBinIdFromPrice(range.upperPrice, bin_step, true, 6, 6)

      // Check active Bin
      const activeBinInfo = await this.sdk.Position.getActiveBinIfInRange(
        pool.bin_manager.bin_manager_handle,
        lowerBinId,
        upperBinId,
        active_id,
        bin_step
      )

      if (!activeBinInfo) {
        console.log(`Price range ${range.lowerPrice}-${range.upperPrice} is not within active Bin, skipping`)
        continue
      }

      // Calculate liquidity distribution
      const binInfos = await this.sdk.Position.calculateAddLiquidityInfo({
        pool_id: poolId,
        amount_a: amountAPerRange,
        amount_b: amountBPerRange,
        active_id,
        bin_step,
        lower_bin_id: lowerBinId,
        upper_bin_id: upperBinId,
        active_bin_of_pool: activeBinInfo,
        strategy_type: 0 // Spot
      })

      // Check if position splitting is needed
      const positionCount = BinUtils.getPositionCount(lowerBinId, upperBinId)

      if (positionCount > 1) {
        console.log(`Price range needs to be split into ${positionCount} positions`)
        const splitPositions = BinUtils.splitBinLiquidityInfo(binInfos, lowerBinId, upperBinId)

        for (const splitBinInfo of splitPositions) {
          positions.push({
            range: `${range.lowerPrice}-${range.upperPrice}`,
            binInfo: splitBinInfo,
            lowerBinId: splitBinInfo.bins[0].bin_id,
            upperBinId: splitBinInfo.bins[splitBinInfo.bins.length - 1].bin_id
          })
        }
      } else {
        positions.push({
          range: `${range.lowerPrice}-${range.upperPrice}`,
          binInfo: binInfos,
          lowerBinId,
          upperBinId
        })
      }
    }

    return positions
  }
}
```

### 2. Risk Management Strategy

```typescript
class RiskManagement {
  // Calculate position risk metrics
  async calculatePositionRisk(positionId: string) {
    const position = await this.sdk.Position.getPosition(positionId)
    const pool = await this.sdk.Pool.getPool(position.pool_id)

    const { active_id, variable_parameters } = pool
    const { volatility_accumulator } = variable_parameters

    // 1. Price offset risk
    const positionCenter = (position.lower_bin_id + position.upper_bin_id) / 2
    const priceOffset = Math.abs(active_id - positionCenter)
    const priceOffsetPercent = (priceOffset / positionCenter) * 100

    // 2. Volatility risk
    const volatilityRisk = parseInt(volatility_accumulator) > 1000000 ? 'High' : 'Low'

    // 3. Concentration risk (position width)
    const positionWidth = position.upper_bin_id - position.lower_bin_id + 1
    const concentrationRisk = positionWidth < 10 ? 'High' : positionWidth < 50 ? 'Medium' : 'Low'

    return {
      positionId,
      priceOffset: `${priceOffsetPercent.toFixed(2)}%`,
      volatilityRisk,
      concentrationRisk,
      positionWidth,
      recommendation: this.getRiskRecommendation(priceOffsetPercent, volatilityRisk, concentrationRisk)
    }
  }

  private getRiskRecommendation(priceOffsetPercent: number, volatilityRisk: string, concentrationRisk: string) {
    const recommendations = []

    if (priceOffsetPercent > 20) {
      recommendations.push('Price offset too large, consider rebalancing or closing position')
    }

    if (volatilityRisk === 'High') {
      recommendations.push('Market volatility is high, consider reducing position or increasing slippage protection')
    }

    if (concentrationRisk === 'High') {
      recommendations.push('Position is too concentrated, consider expanding price range')
    }

    return recommendations.length > 0 ? recommendations : 'Risk controllable'
  }
}
```

## Best Practices

### 1. Position Size Optimization
- **Small positions**: Suitable for testing and learning, lower risk
- **Medium positions**: Balance between profit and risk, suitable for most users
- **Large positions**: Require professional risk management, may affect market prices

### 2. Price Range Selection
- **Narrow range**: Higher fee income, but requires frequent rebalancing
- **Wide range**: More stable positions, but lower fee income
- **Multi-layer ranges**: Create multiple positions at different price levels

### 3. Rebalancing Strategies
- **Regular rebalancing**: Rebalance at fixed times weekly or monthly
- **Threshold rebalancing**: Rebalance when price offset exceeds threshold
- **Market condition rebalancing**: Adjust based on market volatility

### 4. Fee Collection Strategies
- **Regular collection**: Collect fees at fixed intervals
- **Threshold collection**: Collect when fees reach a certain amount
- **Batch collection**: Collect fees from multiple positions at once to save Gas

### 5. Risk Management
- **Set stop loss**: Define maximum acceptable loss
- **Diversify risk**: Create positions in different pools and price ranges
- **Monitor metrics**: Regularly check risk metrics

## Troubleshooting

### Common Issues

**1. "Active Bin is not within price range"**
- **Cause**: Market price has exceeded the position's set range
- **Solution**:
  - Monitor price changes
  - Consider rebalancing or closing position
  - Create wider price range

**2. "Position count exceeds limit"**
- **Cause**: Price range is too wide, exceeding 1000 Bin limit
- **Solution**:
  - Use `BinUtils.splitBinLiquidityInfo()` to automatically split
  - Narrow price range
  - Create multiple smaller positions

**3. "Gas fees too high"**
- **Cause**: Position operations are complex, requiring extensive calculations
- **Solution**:
  - Optimize position structure
  - Batch operations to reduce transaction count
  - Choose low Gas time periods for operations

**4. "Insufficient liquidity"**
- **Cause**: Position liquidity has been completely removed or price has shifted
- **Solution**:
  - Check position status
  - Consider adding liquidity or closing position
  - Monitor active Bin location

**5. "Collection failed"**
- **Cause**: No fees or rewards available for collection
- **Solution**:
  - Use `fetchPositionFeeAndReward()` to query collectible amounts
  - Ensure position is within active Bin range
  - Check pool's reward configuration

### Debugging Suggestions

```typescript
async function debugPosition(positionId: string) {
  try {
    // 1. Check position status
    const position = await sdk.Position.getPosition(positionId)
    console.log('Position status:', position)

    // 2. Check pool status
    const pool = await sdk.Pool.getPool(position.pool_id)
    console.log('Pool status:', {
      'Active Bin': pool.active_id,
      'Price range': `Bin ${position.lower_bin_id} - ${position.upper_bin_id}`,
      'Offset': Math.abs(pool.active_id - (position.lower_bin_id + position.upper_bin_id) / 2)
    })

    // 3. Check active Bin
    const activeBinInfo = await sdk.Position.getActiveBinIfInRange(
      pool.bin_manager.bin_manager_handle,
      position.lower_bin_id,
      position.upper_bin_id,
      pool.active_id,
      pool.bin_step
    )
    console.log('Active Bin status:', activeBinInfo ? 'Within range' : 'Not within range')

    // 4. Query fees and rewards
    const { feeData, rewardData } = await sdk.Position.fetchPositionFeeAndReward([{
      pool_id: position.pool_id,
      position_id: positionId,
      reward_coins: [],
      coin_type_a: position.coin_type_a,
      coin_type_b: position.coin_type_b
    }])

    console.log('Fee data:', feeData[positionId])
    console.log('Reward data:', rewardData[positionId])

    // 5. Analyze issues
    if (!activeBinInfo) {
      console.log('Issue: Active Bin is not within position price range')
      console.log('Suggestion: Consider rebalancing or closing position')
    }

    if (!feeData[positionId] ||
        (parseInt(feeData[positionId]?.fee_owned_a || '0') === 0 &&
         parseInt(feeData[positionId]?.fee_owned_b || '0') === 0)) {
      console.log('Issue: No collectible fees')
      console.log('Possible causes: Position is not within active Bin range or insufficient trading volume')
    }

  } catch (error) {
    console.error('Debugging error:', error)
  }
}
```

## Performance Optimization

### 1. Batch Operations
```typescript
// Batch collect fees from multiple positions
const batchOptions = positions.map(position => ({
  pool_id: position.pool_id,
  position_id: position.id,
  reward_coins: [],
  coin_type_a: position.coin_type_a,
  coin_type_b: position.coin_type_b
}))

const batchTx = sdk.Position.collectRewardAndFeePayload(batchOptions)
```

### 2. Cache Optimization
```typescript
class PositionCache {
  private cache = new Map()
  private cacheDuration = 5 * 60 * 1000 // 5 minutes

  async getPositionWithCache(positionId: string) {
    if (this.cache.has(positionId)) {
      return this.cache.get(positionId)
    }

    const position = await sdk.Position.getPosition(positionId)
    this.cache.set(positionId, position)

    // Set cache expiration
    setTimeout(() => this.cache.delete(positionId), this.cacheDuration)

    return position
  }
}
```

### 3. Pre-computation Optimization
For frequent identical calculations, pre-compute and cache results:

```typescript
const calculationCache = new Map()

async function getCachedLiquidityCalculation(poolId: string, amountA: string, amountB: string,
                                            lowerBinId: number, upperBinId: number) {
  const cacheKey = `${poolId}-${amountA}-${amountB}-${lowerBinId}-${upperBinId}`

  if (!calculationCache.has(cacheKey)) {
    const pool = await sdk.Pool.getPool(poolId)
    const activeBinInfo = await sdk.Position.getActiveBinIfInRange(
      pool.bin_manager.bin_manager_handle,
      lowerBinId,
      upperBinId,
      pool.active_id,
      pool.bin_step
    )

    const binInfos = await sdk.Position.calculateAddLiquidityInfo({
      pool_id: poolId,
      amount_a: amountA,
      amount_b: amountB,
      active_id: pool.active_id,
      bin_step: pool.bin_step,
      lower_bin_id: lowerBinId,
      upper_bin_id: upperBinId,
      active_bin_of_pool: activeBinInfo,
      strategy_type: 0
    })

    calculationCache.set(cacheKey, binInfos)

    // Short-term cache (price may change)
    setTimeout(() => calculationCache.delete(cacheKey), 30 * 1000)
  }

  return calculationCache.get(cacheKey)
}
```

## Security Considerations

### 1. Private Key Security
- Never hardcode private keys in code
- Use environment variables or secure key management systems
- Consider using hardware wallets or multi-signature schemes

### 2. Transaction Verification
- Always simulate before executing actual transactions
- Verify transaction parameters and expected results
- Monitor transaction status and confirmations

### 3. Risk Management
- Set position size and risk limits
- Regularly review and adjust strategies
- Prepare contingency plans

### 4. Monitoring and Alerts
- Monitor position status and risk metrics
- Set price offset alerts
- Track fee collection status

---

**Note**: This document is based on Cetus DLMM SDK v1.0.3 version and the test file `add_liquidity_spot.test.ts`. For actual use, please refer to the latest SDK documentation and test cases.

Position management is the core of liquidity provision. Proper use of DLMM SDK can maximize returns and effectively manage risks. It is recommended to fully test in production environments and establish a comprehensive risk management system.