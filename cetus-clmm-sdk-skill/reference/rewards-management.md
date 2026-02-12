# Rewards Management

This guide covers all aspects of rewards management in Cetus CLMM, including collecting rewards, fetching position rewards, calculating emissions, and managing reward-related transactions.

## Overview

Rewards management in CLMM involves:
- **Collecting rewards**: Claiming accumulated liquidity provider rewards
- **Fetching position rewards**: Querying reward amounts for specific positions
- **Calculating emissions**: Understanding daily reward distribution
- **Batch operations**: Processing multiple positions efficiently
- **Fee collection**: Collecting trading fees from positions

## Key Concepts

### Rewarder System
- **Rewarders**: Incentive programs that distribute tokens to liquidity providers
- **Emissions per second**: Rate at which rewards are distributed
- **Growth global**: Global accumulator for reward calculations
- **Reward coins**: Token types distributed as rewards (up to 3 per pool)

### Position Rewards
- **Reward growth inside**: Accumulated rewards within a position's price range
- **Reward amount owned**: Claimable reward amount for a position
- **Reward coin types**: Specific token types eligible for rewards

### Fee Collection
- **Fee growth inside**: Accumulated fees within a position's price range
- **Fee owned**: Claimable fee amount for a position
- **Protocol fees**: Fees retained by the protocol

## Collecting Rewards

### Basic Reward Collection

Collect rewards from a position:

```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'

async function collectRewards() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Get pool information
  const pool = await sdk.Pool.getPool('0x...')
  const positionId = '0x...'

  // Get reward coin types from pool
  const rewardCoinTypes = pool.rewarder_infos.map((rewarder) => rewarder.coin_type)

  const params = {
    // Pool and position identifiers
    pool_id: pool.id,
    pos_id: positionId,

    // Token types
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,

    // Reward configuration
    rewarder_coin_types: rewardCoinTypes,
    collect_fee: true // Optional: also collect accumulated fees
  }

  try {
    // Create transaction payload
    const payload = await sdk.Rewarder.collectRewarderPayload(params)

    console.log('Reward collection payload created')
    // Execute transaction (requires keypair)
    // const result = await sdk.FullClient.executeTx(keypair, payload, true)

    return payload
  } catch (error) {
    console.error('Failed to create reward collection payload:', error)
    throw error
  }
}
```

### Collect Rewards with Fee Collection

Collect both rewards and fees in one transaction:

```typescript
async function collectRewardsAndFees() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const pool = await sdk.Pool.getPool('0x...')
  const positionId = '0x...'

  const rewardCoinTypes = pool.rewarder_infos.map((rewarder) => rewarder.coin_type)

  const params = {
    pool_id: pool.id,
    pos_id: positionId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    rewarder_coin_types: rewardCoinTypes,
    collect_fee: true // Collect fees along with rewards
  }

  const payload = await sdk.Rewarder.collectRewarderPayload(params)
  return payload
}
```

### Batch Collect Rewards

Collect rewards from multiple positions efficiently:

```typescript
async function batchCollectRewards() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const positionIds = ['0x...', '0x...', '0x...']

  // Build parameters for each position
  const paramsList: CollectRewarderParams[] = []

  for (const positionId of positionIds) {
    const position = await sdk.Position.getPositionById(positionId, false)
    const pool = await sdk.Pool.getPool(position.pool, false)

    const rewardCoinTypes = pool.rewarder_infos.map((rewarder) => rewarder.coin_type)

    paramsList.push({
      pool_id: pool.id,
      pos_id: positionId,
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b,
      rewarder_coin_types: rewardCoinTypes,
      collect_fee: true
    })
  }

  // Create batch collection payload
  const payload = await sdk.Rewarder.batchCollectRewardsPayload(paramsList)

  console.log(`Batch collection payload created for ${paramsList.length} positions`)
  return payload
}
```

## Fetching Position Rewards

### Get Position Reward Amounts

Fetch accumulated rewards for a specific position:

```typescript
async function getPositionRewards() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const poolId = '0x...'
  const positionId = '0x...'

  // Get pool information
  const pool = await sdk.Pool.getPool(poolId)
  const rewardCoinTypes = pool.rewarder_infos.map((rewarder) => rewarder.coin_type)

  const params = {
    pool_id: poolId,
    position_id: positionId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    rewarder_types: rewardCoinTypes
  }

  try {
    const result = await sdk.Rewarder.fetchPosRewardersAmount([params])

    if (result.length > 0) {
      const positionRewards = result[0]
      console.log(`Rewards for position ${positionId}:`)

      positionRewards.rewarder_amounts.forEach((reward, index) => {
        console.log(`  ${reward.coin_type}: ${reward.amount_owned}`)
      })

      return positionRewards
    }

    return null
  } catch (error) {
    console.error('Failed to fetch position rewards:', error)
    throw error
  }
}
```

### Batch Fetch Position Rewards

Fetch rewards for multiple positions:

```typescript
async function batchFetchPositionRewards() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const positionIds = ['0x...', '0x...', '0x...']

  const rewardsMap = await sdk.Rewarder.batchFetchPositionRewarders(positionIds)

  console.log(`Fetched rewards for ${Object.keys(rewardsMap).length} positions:`)
  Object.entries(rewardsMap).forEach(([positionId, rewards]) => {
    console.log(`\nPosition ${positionId}:`)
    rewards.forEach((reward) => {
      console.log(`  ${reward.coin_type}: ${reward.amount_owned}`)
    })
  })

  return rewardsMap
}
```

### Fetch Pool Position Rewards

Get all rewards for positions in a specific pool:

```typescript
async function getPoolPositionRewards() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const accountAddress = '0x...' // Your account address
  const poolId = '0x...'

  // Get pool and positions
  const pool = await sdk.Pool.getPool(poolId)
  const positions = await sdk.Position.getPositionList(accountAddress, [poolId])

  console.log(`Found ${positions.length} positions in pool ${poolId}`)

  // Fetch rewards for each position
  const paramsList: FetchPosRewardParams[] = positions.map((position) => ({
    pool_id: poolId,
    position_id: position.pos_object_id,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    rewarder_types: pool.rewarder_infos.map((rewarder) => rewarder.coin_type)
  }))

  if (paramsList.length > 0) {
    const results = await sdk.Rewarder.fetchPosRewardersAmount(paramsList)

    let totalRewards = new Map<string, string>()
    results.forEach((result) => {
      result.rewarder_amounts.forEach((reward) => {
        const current = totalRewards.get(reward.coin_type) || '0'
        const newTotal = new BN(current).add(new BN(reward.amount_owned)).toString()
        totalRewards.set(reward.coin_type, newTotal)
      })
    })

    console.log('Total rewards across all positions:')
    totalRewards.forEach((amount, coinType) => {
      console.log(`  ${coinType}: ${amount}`)
    })

    return { results, totalRewards: Object.fromEntries(totalRewards) }
  }

  return { results: [], totalRewards: {} }
}
```

## Fee Collection

### Collect Fees from Position

Collect accumulated trading fees:

```typescript
async function collectFees() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const poolId = '0x...'
  const positionId = '0x...'

  const pool = await sdk.Pool.getPool(poolId)

  const params = {
    pool_id: poolId,
    pos_id: positionId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b
  }

  // Create fee collection payload
  const payload = await sdk.Position.collectFeePayload(params)

  console.log('Fee collection payload created')
  return payload
}
```

### Fetch Position Fee Amounts

Check accumulated fees before collection:

```typescript
async function checkFeeAmounts() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const positionId = '0x...'

  // Get position and pool information
  const position = await sdk.Position.getPositionById(positionId, false)
  const pool = await sdk.Pool.getPool(position.pool, false)

  const params = {
    pool_id: pool.id,
    position_id: positionId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b
  }

  const feeAmounts = await sdk.Position.fetchPosFeeAmount([params])

  if (feeAmounts.length > 0) {
    const fees = feeAmounts[0]
    console.log('Accumulated fees:')
    console.log(`  Token A: ${fees.fee_owned_a}`)
    console.log(`  Token B: ${fees.fee_owned_b}`)
    console.log(`  Position: ${fees.position_id}`)

    return fees
  }

  return null
}
```

### Batch Fetch Position Fees

Fetch fees for multiple positions:

```typescript
async function batchCheckFees() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const positionIds = ['0x...', '0x...', '0x...']

  const feeMap = await sdk.Position.batchFetchPositionFees(positionIds)

  console.log(`Fetched fees for ${Object.keys(feeMap).length} positions:`)
  Object.entries(feeMap).forEach(([positionId, fees]) => {
    console.log(`\nPosition ${positionId}:`)
    console.log(`  Token A: ${fees.fee_owned_a}`)
    console.log(`  Token B: ${fees.fee_owned_b}`)
  })

  return feeMap
}
```

## Emissions and Rewards Analysis

### Get Daily Emissions

Calculate daily reward emissions for a pool:

```typescript
async function getDailyEmissions() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const poolId = '0x...'

  const emissions = await sdk.Rewarder.emissionsEveryDay(poolId)

  if (emissions) {
    console.log(`Daily emissions for pool ${poolId}:`)
    emissions.forEach((emission) => {
      console.log(`  ${emission.coin_type}: ${emission.emissions} tokens/day`)
    })

    // Calculate estimated daily rewards for a position
    const pool = await sdk.Pool.getPool(poolId)
    const totalLiquidity = parseFloat(pool.liquidity)

    if (totalLiquidity > 0) {
      emissions.forEach((emission) => {
        // Simplified estimation: proportional to liquidity share
        // In reality, reward distribution depends on position range and time
        const estimatedDaily = emission.emissions // This is total pool emissions
        console.log(`  ${emission.coin_type}: ${estimatedDaily} total daily emissions`)
      })
    }
  }

  return emissions
}
```

### Analyze Reward Performance

Analyze reward accumulation over time:

```typescript
async function analyzeRewardPerformance(positionId: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Get position and pool
  const position = await sdk.Position.getPositionById(positionId)
  const pool = await sdk.Pool.getPool(position.pool)

  // Fetch current rewards
  const rewardCoinTypes = pool.rewarder_infos.map((rewarder) => rewarder.coin_type)
  const params = {
    pool_id: pool.id,
    position_id: positionId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    rewarder_types: rewardCoinTypes
  }

  const rewards = await sdk.Rewarder.fetchPosRewardersAmount([params])

  if (rewards.length > 0) {
    const positionRewards = rewards[0]

    console.log(`Reward performance for position ${positionId}:`)
    console.log(`- Pool: ${pool.id}`)
    console.log(`- Liquidity: ${position.liquidity}`)
    console.log(`- Tick range: ${position.tick_lower_index} to ${position.tick_upper_index}`)

    console.log('\nAccumulated rewards:')
    positionRewards.rewarder_amounts.forEach((reward, index) => {
      console.log(`  ${reward.coin_type}: ${reward.amount_owned}`)

      // Calculate APR estimation (simplified)
      const dailyEmissions = pool.rewarder_infos[index]?.emissions_every_day || 0
      const poolTotalLiquidity = parseFloat(pool.liquidity)
      const positionLiquidity = parseFloat(position.liquidity)

      if (poolTotalLiquidity > 0 && dailyEmissions > 0) {
        const positionShare = positionLiquidity / poolTotalLiquidity
        const dailyReward = dailyEmissions * positionShare
        const annualReward = dailyReward * 365

        console.log(`    Estimated daily: ${dailyReward.toFixed(4)}`)
        console.log(`    Estimated annual: ${annualReward.toFixed(4)}`)
      }
    })
  }

  return rewards
}
```

## Reward Parameter Types

### CollectRewarderParams Type

Based on the actual SDK implementation:

```typescript
type CollectRewarderParams = {
  // Pool and position identifiers
  pool_id: string
  pos_id: string

  // Token types
  coin_type_a: string
  coin_type_b: string

  // Reward configuration
  rewarder_coin_types: string[]
  collect_fee: boolean
}
```

### FetchPosRewardParams Type

Parameters for fetching position rewards:

```typescript
type FetchPosRewardParams = {
  pool_id: string
  position_id: string
  coin_type_a: string
  coin_type_b: string
  rewarder_types: string[]
}
```

### CollectFeesQuote Type

Fee collection result:

```typescript
type CollectFeesQuote = {
  position_id: string
  fee_owned_a: string
  fee_owned_b: string
}
```

### RewarderAmountOwned Type

Individual reward amount:

```typescript
type RewarderAmountOwned = {
  amount_owned: string
  coin_type: string
}
```

## Best Practices

### 1. Regular Reward Collection
Collect rewards regularly to:
- Maximize capital efficiency
- Reduce exposure to reward token volatility
- Maintain accurate position accounting

```typescript
async function autoCollectRewards(positionIds: string[], threshold: string = '1000000') {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  for (const positionId of positionIds) {
    // Check reward amounts
    const rewardsMap = await sdk.Rewarder.batchFetchPositionRewarders([positionId])
    const rewards = rewardsMap[positionId]

    if (rewards && rewards.length > 0) {
      // Check if any reward exceeds threshold
      const shouldCollect = rewards.some(reward =>
        new BN(reward.amount_owned).gt(new BN(threshold))
      )

      if (shouldCollect) {
        console.log(`Collecting rewards for position ${positionId}`)
        // Implement collection logic
      }
    }
  }
}
```

### 2. Monitor Reward Accumulation
Track reward accumulation over time:

```typescript
class RewardTracker {
  private rewardsHistory: Map<string, Array<{timestamp: number, amounts: RewarderAmountOwned[]}>> = new Map()

  async trackPositionRewards(positionId: string) {
    const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
    const rewardsMap = await sdk.Rewarder.batchFetchPositionRewarders([positionId])
    const rewards = rewardsMap[positionId]

    if (rewards) {
      const history = this.rewardsHistory.get(positionId) || []
      history.push({
        timestamp: Date.now(),
        amounts: rewards
      })
      this.rewardsHistory.set(positionId, history)

      // Analyze growth
      if (history.length >= 2) {
        const latest = history[history.length - 1]
        const previous = history[history.length - 2]

        rewards.forEach((reward, index) => {
          const growth = new BN(latest.amounts[index].amount_owned)
            .sub(new BN(previous.amounts[index].amount_owned))
          console.log(`Growth for ${reward.coin_type}: ${growth.toString()}`)
        })
      }
    }
  }
}
```

### 3. Optimize Gas Costs
Batch operations to reduce gas costs:

```typescript
async function optimizeRewardCollection(positions: Array<{positionId: string, poolId: string}>) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Group positions by pool to batch operations
  const positionsByPool = new Map<string, string[]>()

  for (const { positionId, poolId } of positions) {
    if (!positionsByPool.has(poolId)) {
      positionsByPool.set(poolId, [])
    }
    positionsByPool.get(poolId)!.push(positionId)
  }

  // Process each pool batch
  for (const [poolId, positionIds] of positionsByPool) {
    const pool = await sdk.Pool.getPool(poolId)
    const rewardCoinTypes = pool.rewarder_infos.map((rewarder) => rewarder.coin_type)

    // Build batch parameters
    const paramsList = positionIds.map(positionId => ({
      pool_id: poolId,
      pos_id: positionId,
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b,
      rewarder_coin_types: rewardCoinTypes,
      collect_fee: true
    }))

    // Execute batch collection
    const payload = await sdk.Rewarder.batchCollectRewardsPayload(paramsList)
    console.log(`Batch collection for pool ${poolId}: ${positionIds.length} positions`)

    // Execute transaction
    // await sdk.FullClient.executeTx(keypair, payload, true)
  }
}
```

### 4. Handle Reward Token Changes
Monitor and adapt to reward program changes:

```typescript
async function monitorRewardPrograms(poolId: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const pool = await sdk.Pool.getPool(poolId)

  console.log(`Reward programs for pool ${poolId}:`)
  pool.rewarder_infos.forEach((rewarder, index) => {
    console.log(`Program ${index + 1}:`)
    console.log(`  Token: ${rewarder.coin_type}`)
    console.log(`  Emissions per second: ${rewarder.emissions_per_second}`)
    console.log(`  Daily emissions: ${rewarder.emissions_every_day}`)
    console.log(`  Growth global: ${rewarder.growth_global}`)
  })

  // Track changes over time
  const lastChecked = localStorage.getItem(`rewarders_${poolId}`)
  if (lastChecked) {
    const previous = JSON.parse(lastChecked)
    // Compare with current
  }

  // Store current state
  localStorage.setItem(`rewarders_${poolId}`, JSON.stringify(pool.rewarder_infos))
}
```

## Common Issues and Solutions

### No Rewards Available
**Problem**: `fetchPosRewardersAmount` returns zero or empty results.
**Solution**:
- Verify position is within active price range
- Check if pool has active reward programs
- Ensure sufficient time has passed for reward accumulation
- Confirm position liquidity is significant enough

### Collection Failed
**Problem**: Reward collection transaction fails.
**Solution**:
- Check gas balance and increase gas budget
- Verify position still exists and is accessible
- Ensure reward amounts haven't changed since last check
- Try smaller batch sizes for batch operations

### Inaccurate Reward Estimates
**Problem**: Estimated rewards differ from actual amounts.
**Solution**:
- Account for price range impact on reward accumulation
- Consider time-weighted liquidity calculations
- Factor in other positions' liquidity in the same range
- Use `fetchPosRewardersAmount` for accurate amounts

### High Gas Costs
**Problem**: Reward collection gas costs are excessive.
**Solution**:
- Batch multiple positions together
- Collect less frequently with larger thresholds
- Consider gas optimization techniques
- Monitor network congestion

## Next Steps

After mastering rewards management, you may want to:
- **Implement auto-compounding**: Automatically reinvest collected rewards
- **Build reward dashboards**: Visualize reward performance across positions
- **Optimize reward strategies**: Adjust positions based on reward programs
- **Monitor program changes**: Track reward program updates and adjustments