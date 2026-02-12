# Reward Collection Workflow Example

This example demonstrates a complete reward collection workflow for Cetus CLMM positions, including checking accumulated rewards, collecting fees, batch operations, and reward performance analysis.

## Overview

This example covers:
1. **Position discovery** - Finding positions with accumulated rewards
2. **Reward checking** - Querying reward amounts across multiple positions
3. **Batch operations** - Collecting rewards from multiple positions efficiently
4. **Fee collection** - Collecting accumulated trading fees
5. **Performance analysis** - Analyzing reward accumulation rates
6. **Automation setup** - Creating reward collection automation

## Prerequisites

```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import BN from 'bn.js'
```

## Step 1: Initialize SDK and Get Account Positions

```typescript
async function initializeAndGetPositions() {
  // Initialize SDK for mainnet
  const sdk = CetusClmmSDK.createSDK({
    env: 'mainnet'
  })

  // Initialize wallet
  const privateKey = process.env.PRIVATE_KEY
  const keypair = Ed25519Keypair.fromSecretKey(privateKey)
  const senderAddress = keypair.getPublicKey().toSuiAddress()

  // Set sender address
  sdk.setSenderAddress(senderAddress)

  console.log(`Initialized for address: ${senderAddress}`)

  // Get all positions for this account
  const positions = await sdk.Position.getPositionList(senderAddress)

  console.log(`Found ${positions.length} positions total`)

  // Filter for active positions
  const activePositions = positions.filter(pos => pos.status === 'Active')
  console.log(`${activePositions.length} active positions`)

  return { sdk, keypair, senderAddress, positions: activePositions }
}
```

## Step 2: Check Reward Amounts for Positions

```typescript
async function checkAllPositionRewards(
  sdk: CetusClmmSDK,
  positions: any[]
) {
  console.log('\n=== Checking Position Rewards ===')

  const rewardsByPosition = new Map<string, any[]>()

  // Check rewards for each position
  for (const position of positions) {
    try {
      // Get pool information for this position
      const pool = await sdk.Pool.getPool(position.pool, false) // Use cache

      // Skip pools without reward programs
      if (!pool.rewarder_infos || pool.rewarder_infos.length === 0) {
        console.log(`Position ${position.pos_object_id}: No reward program`)
        continue
      }

      // Prepare parameters for reward query
      const rewardCoinTypes = pool.rewarder_infos.map(rewarder => rewarder.coin_type)

      const params = {
        pool_id: pool.id,
        position_id: position.pos_object_id,
        coin_type_a: pool.coin_type_a,
        coin_type_b: pool.coin_type_b,
        rewarder_types: rewardCoinTypes
      }

      // Fetch reward amounts
      const rewardResults = await sdk.Rewarder.fetchPosRewardersAmount([params])

      if (rewardResults.length > 0 && rewardResults[0].rewarder_amounts.length > 0) {
        const rewards = rewardResults[0].rewarder_amounts
        rewardsByPosition.set(position.pos_object_id, rewards)

        console.log(`\nPosition ${position.pos_object_id}:`)
        rewards.forEach(reward => {
          console.log(`  ${reward.coin_type}: ${reward.amount_owned}`)
        })
      }

    } catch (error) {
      console.error(`Error checking rewards for position ${position.pos_object_id}:`, error.message)
    }
  }

  return rewardsByPosition
}
```

## Step 3: Check Fee Amounts for Positions

```typescript
async function checkAllPositionFees(
  sdk: CetusClmmSDK,
  positions: any[]
) {
  console.log('\n=== Checking Position Fees ===')

  const feesByPosition = new Map<string, { fee_owned_a: string, fee_owned_b: string }>()

  // Use batch fetching for efficiency
  const positionIds = positions.map(pos => pos.pos_object_id)
  const feeMap = await sdk.Position.batchFetchPositionFees(positionIds)

  console.log(`Fetched fees for ${Object.keys(feeMap).length} positions`)

  // Analyze fee accumulation
  let totalFeeA = new BN('0')
  let totalFeeB = new BN('0')
  let positionsWithFees = 0

  Object.entries(feeMap).forEach(([positionId, fees]) => {
    feesByPosition.set(positionId, fees)

    const feeA = new BN(fees.fee_owned_a)
    const feeB = new BN(fees.fee_owned_b)

    if (feeA.gt(new BN('0')) || feeB.gt(new BN('0'))) {
      positionsWithFees++
      totalFeeA = totalFeeA.add(feeA)
      totalFeeB = totalFeeB.add(feeB)

      console.log(`\nPosition ${positionId}:`)
      console.log(`  Token A fees: ${feeA.toString()}`)
      console.log(`  Token B fees: ${feeB.toString()}`)
    }
  })

  console.log(`\nSummary:`)
  console.log(`Positions with fees: ${positionsWithFees}/${positions.length}`)
  console.log(`Total Token A fees: ${totalFeeA.toString()}`)
  console.log(`Total Token B fees: ${totalFeeB.toString()}`)

  return feesByPosition
}
```

## Step 4: Determine Collection Strategy

```typescript
function determineCollectionStrategy(
  rewardsByPosition: Map<string, any[]>,
  feesByPosition: Map<string, any>,
  thresholds: {
    minReward: string,
    minFeeA: string,
    minFeeB: string,
    gasCostEstimate: string
  }
) {
  console.log('\n=== Collection Strategy Analysis ===')

  const positionsToCollect = new Set<string>()
  const collectRewards = new Map<string, string[]>() // positionId -> reward coin types
  const collectFees = new Set<string>()

  const minRewardBN = new BN(thresholds.minReward)
  const minFeeABN = new BN(thresholds.minFeeA)
  const minFeeBBN = new BN(thresholds.minFeeB)
  const gasCostBN = new BN(thresholds.gasCostEstimate)

  // Analyze rewards
  rewardsByPosition.forEach((rewards, positionId) => {
    const shouldCollectRewards = rewards.some(reward =>
      new BN(reward.amount_owned).gt(minRewardBN)
    )

    if (shouldCollectRewards) {
      positionsToCollect.add(positionId)
      collectRewards.set(positionId, rewards.map(r => r.coin_type))
      console.log(`Position ${positionId}: Collect rewards (exceeds ${thresholds.minReward})`)
    }
  })

  // Analyze fees
  feesByPosition.forEach((fees, positionId) => {
    const feeA = new BN(fees.fee_owned_a)
    const feeB = new BN(fees.fee_owned_b)

    const shouldCollectFees = feeA.gt(minFeeABN) || feeB.gt(minFeeBBN)

    if (shouldCollectFees) {
      positionsToCollect.add(positionId)
      collectFees.add(positionId)
      console.log(`Position ${positionId}: Collect fees (A: ${feeA.toString()}, B: ${feeB.toString()})`)
    }
  })

  // Check if collection is economically viable
  const totalPositions = positionsToCollect.size
  const estimatedGasCost = gasCostBN.muln(totalPositions)

  console.log(`\nEconomic Analysis:`)
  console.log(`Positions to collect: ${totalPositions}`)
  console.log(`Estimated gas cost: ${estimatedGasCost.toString()}`)

  // For demonstration, assume 1 SUI = 1000000000 base units
  const estimatedGasCostSUI = estimatedGasCost.div(new BN('1000000000'))
  console.log(`Estimated gas cost (SUI): ${estimatedGasCostSUI.toString()}`)

  // Simple profitability check
  const isProfitable = totalPositions > 0 // In reality, compare with collected value

  return {
    positionsToCollect: Array.from(positionsToCollect),
    collectRewards,
    collectFees,
    totalPositions,
    estimatedGasCost: estimatedGasCost.toString(),
    isProfitable
  }
}
```

## Step 5: Batch Collect Rewards and Fees

```typescript
async function batchCollectRewardsAndFees(
  sdk: CetusClmmSDK,
  strategy: {
    positionsToCollect: string[],
    collectRewards: Map<string, string[]>,
    collectFees: Set<string>
  },
  keypair: Ed25519Keypair
) {
  if (strategy.positionsToCollect.length === 0) {
    console.log('No positions meet collection criteria')
    return null
  }

  console.log(`\n=== Batch Collection for ${strategy.positionsToCollect.length} Positions ===`)

  // Group positions by pool for efficient batch operations
  const positionsByPool = new Map<string, Array<{
    positionId: string,
    rewardCoinTypes: string[],
    collectFee: boolean
  }>>()

  // Build position information
  for (const positionId of strategy.positionsToCollect) {
    const position = await sdk.Position.getPositionById(positionId, false)
    const pool = await sdk.Pool.getPool(position.pool, false)

    const poolId = pool.id
    const rewardCoinTypes = strategy.collectRewards.get(positionId) || []
    const collectFee = strategy.collectFees.has(positionId)

    if (!positionsByPool.has(poolId)) {
      positionsByPool.set(poolId, [])
    }

    positionsByPool.get(poolId)!.push({
      positionId,
      rewardCoinTypes,
      collectFee
    })
  }

  console.log(`Grouped into ${positionsByPool.size} pool batches`)

  // Create batch collection parameters
  const batchParams = []

  for (const [poolId, positions] of positionsByPool) {
    const pool = await sdk.Pool.getPool(poolId, false)

    // Create parameters for each position in this pool
    const paramsList = positions.map(({ positionId, rewardCoinTypes, collectFee }) => ({
      pool_id: poolId,
      pos_id: positionId,
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b,
      rewarder_coin_types: rewardCoinTypes,
      collect_fee: collectFee
    }))

    // If only one position in pool, use single collection
    if (paramsList.length === 1) {
      console.log(`Pool ${poolId}: Single position collection`)
      const payload = await sdk.Rewarder.collectRewarderPayload(paramsList[0])
      batchParams.push({ type: 'single', payload, poolId, positionCount: 1 })
    } else {
      // Use batch collection for multiple positions in same pool
      console.log(`Pool ${poolId}: Batch collection for ${paramsList.length} positions`)
      const payload = await sdk.Rewarder.batchCollectRewardsPayload(paramsList)
      batchParams.push({ type: 'batch', payload, poolId, positionCount: paramsList.length })
    }
  }

  // Execute transactions (simulated)
  console.log('\n=== Collection Execution Plan ===')
  let totalGasEstimate = new BN('0')
  const gasPerTransaction = new BN('2000000') // Example gas estimate

  batchParams.forEach((param, index) => {
    console.log(`Batch ${index + 1}: ${param.type} collection for ${param.positionCount} positions in pool ${param.poolId}`)
    totalGasEstimate = totalGasEstimate.add(gasPerTransaction.muln(param.positionCount))
  })

  console.log(`Total estimated gas: ${totalGasEstimate.toString()}`)

  // For demonstration, return the collection plan
  return {
    batchParams,
    totalBatches: batchParams.length,
    totalPositions: strategy.positionsToCollect.length,
    totalGasEstimate: totalGasEstimate.toString(),
    executionPlan: batchParams.map(p => ({
      type: p.type,
      poolId: p.poolId,
      positionCount: p.positionCount
    }))
  }
}
```

## Step 6: Individual Position Collection

```typescript
async function collectIndividualPosition(
  sdk: CetusClmmSDK,
  positionId: string,
  collectRewards: boolean = true,
  collectFees: boolean = true,
  keypair: Ed25519Keypair
) {
  console.log(`\n=== Individual Position Collection: ${positionId} ===`)

  // Get position and pool details
  const position = await sdk.Position.getPositionById(positionId)
  const pool = await sdk.Pool.getPool(position.pool)

  // Get reward coin types if collecting rewards
  let rewardCoinTypes: string[] = []
  if (collectRewards && pool.rewarder_infos && pool.rewarder_infos.length > 0) {
    rewardCoinTypes = pool.rewarder_infos.map(rewarder => rewarder.coin_type)
  }

  // Create collection parameters
  const params = {
    pool_id: pool.id,
    pos_id: positionId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    rewarder_coin_types: rewardCoinTypes,
    collect_fee: collectFees
  }

  try {
    // Create payload
    const payload = await sdk.Rewarder.collectRewarderPayload(params)

    console.log('Collection payload created:')
    console.log(`- Position: ${positionId}`)
    console.log(`- Pool: ${pool.id}`)
    console.log(`- Collect rewards: ${collectRewards} (${rewardCoinTypes.length} tokens)`)
    console.log(`- Collect fees: ${collectFees}`)

    // Execute transaction (simulated)
    // const result = await sdk.FullClient.executeTx(keypair, payload, true)
    // console.log(`Transaction digest: ${result.digest}`)

    return {
      payload,
      params,
      status: 'ready',
      estimatedGas: '2000000' // Example gas estimate
    }

  } catch (error) {
    console.error('Failed to create collection payload:', error)
    throw error
  }
}
```

## Step 7: Reward Performance Analysis

```typescript
async function analyzeRewardPerformance(
  sdk: CetusClmmSDK,
  positionId: string,
  historicalData: Array<{ timestamp: number, rewards: any[] }> = []
) {
  console.log(`\n=== Reward Performance Analysis: ${positionId} ===`)

  // Get current position and pool
  const position = await sdk.Position.getPositionById(positionId)
  const pool = await sdk.Pool.getPool(position.pool)

  // Get current rewards
  const rewardCoinTypes = pool.rewarder_infos?.map(rewarder => rewarder.coin_type) || []
  const params = {
    pool_id: pool.id,
    position_id: positionId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    rewarder_types: rewardCoinTypes
  }

  const currentRewards = await sdk.Rewarder.fetchPosRewardersAmount([params])

  if (currentRewards.length === 0 || currentRewards[0].rewarder_amounts.length === 0) {
    console.log('No rewards available for analysis')
    return null
  }

  const currentRewardData = currentRewards[0].rewarder_amounts

  // Calculate reward rates if historical data available
  if (historicalData.length >= 2) {
    const latest = historicalData[historicalData.length - 1]
    const previous = historicalData[historicalData.length - 2]

    const timeDiffHours = (latest.timestamp - previous.timestamp) / (1000 * 60 * 60)

    console.log(`\nReward Growth Analysis (last ${timeDiffHours.toFixed(1)} hours):`)

    currentRewardData.forEach((currentReward, index) => {
      const previousAmount = new BN(previous.rewards[index]?.amount_owned || '0')
      const currentAmount = new BN(currentReward.amount_owned)
      const growth = currentAmount.sub(previousAmount)

      if (growth.gt(new BN('0'))) {
        const hourlyRate = growth.divn(Math.max(1, Math.floor(timeDiffHours)))
        const dailyRate = hourlyRate.muln(24)

        console.log(`${currentReward.coin_type}:`)
        console.log(`  Growth: ${growth.toString()}`)
        console.log(`  Hourly rate: ${hourlyRate.toString()}`)
        console.log(`  Estimated daily: ${dailyRate.toString()}`)
      }
    })
  }

  // Calculate APR estimates
  console.log('\nAPR Estimation:')
  const positionLiquidity = new BN(position.liquidity)
  const poolTotalLiquidity = new BN(pool.liquidity)

  if (positionLiquidity.gt(new BN('0')) && poolTotalLiquidity.gt(new BN('0'))) {
    const positionShare = positionLiquidity.mul(new BN('1000000')).div(poolTotalLiquidity)
    const positionSharePercent = positionShare.toNumber() / 10000 // Convert to percentage

    currentRewardData.forEach((reward, index) => {
      const rewarderInfo = pool.rewarder_infos?.[index]
      if (rewarderInfo && rewarderInfo.emissions_every_day) {
        const dailyEmissions = new BN(rewarderInfo.emissions_every_day)
        const positionDailyReward = dailyEmissions.mul(positionShare).div(new BN('1000000'))

        // Simplified APR calculation (annual = daily * 365)
        const annualReward = positionDailyReward.muln(365)

        console.log(`${reward.coin_type}:`)
        console.log(`  Position share: ${positionSharePercent.toFixed(4)}%`)
        console.log(`  Daily emissions: ${dailyEmissions.toString()}`)
        console.log(`  Estimated daily: ${positionDailyReward.toString()}`)
        console.log(`  Estimated annual: ${annualReward.toString()}`)
      }
    })
  }

  return {
    currentRewards: currentRewardData,
    positionShare: positionLiquidity.gt(new BN('0')) && poolTotalLiquidity.gt(new BN('0'))
      ? positionLiquidity.mul(new BN('10000')).div(poolTotalLiquidity).toNumber() / 100
      : 0
  }
}
```

## Step 8: Complete Reward Collection Workflow

```typescript
async function completeRewardCollectionWorkflow() {
  try {
    console.log('=== Complete Reward Collection Workflow ===\n')

    // Step 1: Initialize and get positions
    console.log('1. Initializing and fetching positions...')
    const { sdk, keypair, positions } = await initializeAndGetPositions()

    if (positions.length === 0) {
      console.log('No active positions found')
      return { status: 'no_positions' }
    }

    // Step 2: Check rewards
    console.log('\n2. Checking accumulated rewards...')
    const rewardsByPosition = await checkAllPositionRewards(sdk, positions)

    // Step 3: Check fees
    console.log('\n3. Checking accumulated fees...')
    const feesByPosition = await checkAllPositionFees(sdk, positions)

    // Step 4: Determine collection strategy
    console.log('\n4. Determining collection strategy...')
    const collectionThresholds = {
      minReward: '1000000',     // Minimum reward amount to collect (e.g., 0.001 token)
      minFeeA: '500000',        // Minimum fee amount token A
      minFeeB: '500000',        // Minimum fee amount token B
      gasCostEstimate: '2000000' // Estimated gas cost per transaction
    }

    const strategy = determineCollectionStrategy(
      rewardsByPosition,
      feesByPosition,
      collectionThresholds
    )

    // Step 5: Execute collection
    if (strategy.isProfitable && strategy.totalPositions > 0) {
      console.log('\n5. Executing batch collection...')
      const collectionPlan = await batchCollectRewardsAndFees(sdk, strategy, keypair)

      if (collectionPlan) {
        console.log('\nCollection Plan Ready:')
        console.log(`Total batches: ${collectionPlan.totalBatches}`)
        console.log(`Total positions: ${collectionPlan.totalPositions}`)
        console.log(`Estimated gas: ${collectionPlan.totalGasEstimate}`)

        // For demonstration, show execution plan
        console.log('\nExecution Plan:')
        collectionPlan.executionPlan.forEach((plan, index) => {
          console.log(`  ${index + 1}. ${plan.type} for ${plan.positionCount} positions in pool ${plan.poolId}`)
        })

        // Uncomment to execute
        // console.log('\nExecuting collection...')
        // for (const batch of collectionPlan.batchParams) {
        //   await sdk.FullClient.executeTx(keypair, batch.payload, true)
        // }
      }
    } else {
      console.log('\n5. Collection not economically viable')
      console.log('Consider:')
      console.log('- Increasing collection thresholds')
      console.log('- Waiting for more accumulation')
      console.log('- Manual collection for specific positions')

      // Optionally collect from the most valuable position
      if (positions.length > 0) {
        const mostValuablePosition = positions[0] // In reality, find position with highest rewards
        console.log(`\nExample: Collecting from position ${mostValuablePosition.pos_object_id}`)
        await collectIndividualPosition(
          sdk,
          mostValuablePosition.pos_object_id,
          true,
          true,
          keypair
        )
      }
    }

    // Step 6: Performance analysis
    console.log('\n6. Performance analysis...')
    if (positions.length > 0) {
      const samplePosition = positions[0]
      await analyzeRewardPerformance(sdk, samplePosition.pos_object_id)

      // Example historical data (in real scenario, store this)
      const historicalData = [
        {
          timestamp: Date.now() - (24 * 60 * 60 * 1000), // 24 hours ago
          rewards: [{ coin_type: '0x2::sui::SUI', amount_owned: '500000' }]
        },
        {
          timestamp: Date.now(),
          rewards: [{ coin_type: '0x2::sui::SUI', amount_owned: '1500000' }]
        }
      ]

      console.log('\nHistorical analysis example:')
      console.log('24h growth: 1,000,000 tokens')
      console.log('Daily rate: 1,000,000 tokens/day')
    }

    console.log('\n=== Workflow Complete ===')

    return {
      status: 'completed',
      positionsCount: positions.length,
      positionsWithRewards: rewardsByPosition.size,
      positionsWithFees: feesByPosition.size,
      collectionStrategy: strategy
    }

  } catch (error) {
    console.error('Reward collection workflow failed:', error)
    throw error
  }
}

// Run the complete workflow
// completeRewardCollectionWorkflow()
```

## Best Practices Demonstrated

### 1. Economic Viability Checking
- **Gas cost estimation** before collection
- **Threshold-based collection** to avoid unprofitable operations
- **Batch optimization** to reduce gas costs

### 2. Efficient Data Fetching
- **Batch fetching** for multiple positions
- **Cache usage** for pool data
- **Error handling** for individual position failures

### 3. Flexible Collection Strategies
- **Individual vs batch collection** based on position count
- **Pool-based grouping** for efficient batch operations
- **Configurable thresholds** for different token types

### 4. Performance Monitoring
- **Reward growth tracking** over time
- **APR estimation** for position evaluation
- **Historical data analysis** for trend identification

### 5. Risk Management
- **Transaction failure handling**
- **Gas price monitoring**
- **Network congestion considerations**

## Automation Patterns

### Scheduled Collection Service
```typescript
class RewardCollectionService {
  private sdk: CetusClmmSDK
  private keypair: Ed25519Keypair
  private collectionInterval: number = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    this.sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
    // Initialize keypair from secure storage
  }

  async start() {
    console.log('Starting reward collection service...')

    // Initial collection
    await this.collectRewards()

    // Schedule periodic collection
    setInterval(async () => {
      await this.collectRewards()
    }, this.collectionInterval)
  }

  async collectRewards() {
    try {
      console.log(`\n[${new Date().toISOString()}] Running reward collection...`)

      const { sdk, keypair, positions } = await initializeAndGetPositions()

      if (positions.length === 0) {
        console.log('No positions to collect')
        return
      }

      // Implement collection logic from workflow
      const rewardsByPosition = await checkAllPositionRewards(sdk, positions)
      const feesByPosition = await checkAllPositionFees(sdk, positions)

      // Determine and execute collection
      const strategy = determineCollectionStrategy(rewardsByPosition, feesByPosition, {
        minReward: '1000000',
        minFeeA: '500000',
        minFeeB: '500000',
        gasCostEstimate: '2000000'
      })

      if (strategy.isProfitable) {
        await batchCollectRewardsAndFees(sdk, strategy, keypair)
        console.log('Collection completed successfully')
      } else {
        console.log('Collection skipped - not economically viable')
      }

    } catch (error) {
      console.error('Collection service error:', error)
      // Implement retry logic or alerting
    }
  }
}
```

### Threshold-Based Automation
```typescript
async function monitorAndCollectByThreshold(
  positionIds: string[],
  thresholds: { [coinType: string]: string }
) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  for (const positionId of positionIds) {
    // Check current rewards
    const rewardsMap = await sdk.Rewarder.batchFetchPositionRewarders([positionId])
    const rewards = rewardsMap[positionId]

    if (rewards && rewards.length > 0) {
      // Check if any reward exceeds threshold
      const shouldCollect = rewards.some(reward => {
        const threshold = thresholds[reward.coin_type] || '1000000'
        return new BN(reward.amount_owned).gt(new BN(threshold))
      })

      if (shouldCollect) {
        console.log(`Threshold exceeded for position ${positionId}, collecting...`)
        // Execute collection
        // await collectIndividualPosition(sdk, positionId, true, true, keypair)
      }
    }
  }
}
```

## Common Issues and Solutions

### No Rewards Available
**Problem**: Position shows zero rewards despite being active.
**Solution**:
- Verify position is within active price range
- Check pool reward program status
- Ensure sufficient time has passed for accumulation
- Confirm position has meaningful liquidity

### Collection Transaction Fails
**Problem**: Reward collection transaction reverts.
**Solution**:
- Check gas balance and increase gas budget
- Verify position hasn't been closed or modified
- Ensure reward amounts haven't changed
- Try smaller batch sizes

### Inaccurate APR Estimates
**Problem**: Estimated rewards differ from actual.
**Solution**:
- Account for price range impact
- Consider time-weighted liquidity
- Factor in other positions in same range
- Use actual historical data for calibration

### High Gas Costs
**Problem**: Collection gas costs exceed reward value.
**Solution**:
- Increase collection thresholds
- Batch multiple positions
- Optimize collection frequency
- Monitor network gas prices

## Next Steps

After implementing this workflow, you can:

1. **Implement automation**: Create scheduled collection services
2. **Add monitoring**: Implement alerts for high-value rewards
3. **Optimize strategies**: Fine-tune thresholds based on historical data
4. **Expand analytics**: Build dashboards for reward performance
5. **Integrate notifications**: Add email/SMS alerts for collection events

## Performance Optimization Tips

### Data Caching
```typescript
const poolCache = new Map<string, { pool: any, timestamp: number }>()

async function getCachedPool(poolId: string): Promise<any> {
  const cached = poolCache.get(poolId)
  const now = Date.now()

  if (cached && (now - cached.timestamp) < 5 * 60 * 1000) { // 5 minute cache
    return cached.pool
  }

  const pool = await sdk.Pool.getPool(poolId, false)
  poolCache.set(poolId, { pool, timestamp: now })
  return pool
}
```

### Batch Processing
```typescript
async function processPositionsInBatches(
  positions: any[],
  batchSize: number,
  processor: (batch: any[]) => Promise<void>
) {
  for (let i = 0; i < positions.length; i += batchSize) {
    const batch = positions.slice(i, i + batchSize)
    console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(positions.length / batchSize)}`)
    await processor(batch)
  }
}
```

### Gas Price Monitoring
```typescript
async function getOptimalCollectionTime(): Promise<boolean> {
  // In real implementation, check current gas prices
  // and historical patterns to find optimal times

  const currentHour = new Date().getHours()

  // Example: Prefer low-activity hours
  const optimalHours = [1, 2, 3, 4, 5] // 1 AM - 5 AM

  return optimalHours.includes(currentHour)
}
```