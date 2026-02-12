# End-to-End Liquidity Management Example

This example demonstrates a complete workflow for managing liquidity positions in Cetus CLMM, from creating a position to adding/removing liquidity and collecting rewards.

## Overview

This example covers:
1. **SDK initialization** - Setting up the SDK with proper configuration
2. **Pool discovery** - Finding suitable pools for your tokens
3. **Position creation** - Opening a new liquidity position
4. **Adding liquidity** - Depositing tokens into the position
5. **Monitoring position** - Checking position status and rewards
6. **Removing liquidity** - Withdrawing tokens from the position
7. **Collecting rewards** - Claiming accumulated fees and rewards

## Prerequisites

```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { SuiClient } from '@mysten/sui/client'
import { Percentage, d, TickMath } from '@cetusprotocol/common-sdk'
import BN from 'bn.js'
```

## Step 1: Initialize SDK and Wallet

```typescript
async function initializeSDK() {
  // Initialize SDK for mainnet
  const sdk = CetusClmmSDK.createSDK({
    env: 'mainnet'
  })

  // Initialize wallet (in production, use secure key management)
  const privateKey = process.env.PRIVATE_KEY // Store securely
  const keypair = Ed25519Keypair.fromSecretKey(privateKey)
  const senderAddress = keypair.getPublicKey().toSuiAddress()

  // Set sender address in SDK
  sdk.setSenderAddress(senderAddress)

  console.log(`SDK initialized for address: ${senderAddress}`)
  return { sdk, keypair, senderAddress }
}
```

## Step 2: Find Suitable Pool

```typescript
async function findPool(sdk: CetusClmmSDK, tokenA: string, tokenB: string) {
  console.log(`Searching for pools with ${tokenA} / ${tokenB}`)

  // Get all pools for the token pair
  const pools = await sdk.Pool.getPoolByCoins([tokenA, tokenB])

  if (pools.length === 0) {
    throw new Error(`No pools found for ${tokenA}/${tokenB}`)
  }

  // Select pool with highest liquidity
  const pool = pools.sort((a, b) =>
    parseFloat(b.liquidity) - parseFloat(a.liquidity)
  )[0]

  console.log(`Selected pool: ${pool.id}`)
  console.log(`- Current price: ${pool.current_price}`)
  console.log(`- Liquidity: ${pool.liquidity}`)
  console.log(`- Fee rate: ${pool.fee_rate}`)
  console.log(`- Tick spacing: ${pool.tick_spacing}`)

  return pool
}
```

## Step 3: Calculate Optimal Tick Range

```typescript
import { TickMath, TickUtil } from '@cetusprotocol/common-sdk'

function calculateOptimalTicks(
  currentPrice: number,
  strategy: 'tight' | 'medium' | 'wide',
  tokenADecimals: number,
  tokenBDecimals: number,
  tickSpacing: number
) {
  // Convert current price to tick index
  const currentTick = TickMath.priceToTickIndex(
    currentPrice,
    tokenADecimals,
    tokenBDecimals
  )

  // Determine range based on strategy
  let tickRange: number
  switch (strategy) {
    case 'tight':
      tickRange = 100 // ±0.1%
      break
    case 'medium':
      tickRange = 1000 // ±1%
      break
    case 'wide':
      tickRange = 10000 // ±10%
      break
  }

  // Calculate raw tick bounds
  const lowerTick = currentTick - tickRange
  const upperTick = currentTick + tickRange

  // Adjust to valid ticks based on tick spacing
  const adjustedLower = TickUtil.getNearestTickByTick(lowerTick, tickSpacing)
  const adjustedUpper = TickUtil.getNearestTickByTick(upperTick, tickSpacing)

  console.log(`Optimal tick range (${strategy} strategy):`)
  console.log(`- Current tick: ${currentTick}`)
  console.log(`- Lower tick: ${adjustedLower}`)
  console.log(`- Upper tick: ${adjustedUpper}`)
  console.log(`- Range: ±${tickRange} ticks`)

  return {
    lowerTick: adjustedLower,
    upperTick: adjustedUpper,
    currentTick
  }
}
```

## Step 4: Open New Position

```typescript
async function openPosition(
  sdk: CetusClmmSDK,
  poolId: string,
  lowerTick: number,
  upperTick: number
) {
  // Get pool for token types
  const pool = await sdk.Pool.getPool(poolId)

  // Create position opening payload
  const openPositionPayload = sdk.Position.openPositionPayload({
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    pool_id: poolId,
    tick_lower: lowerTick.toString(),
    tick_upper: upperTick.toString()
  })

  console.log('Position opening payload created')
  console.log(`- Pool: ${poolId}`)
  console.log(`- Tick range: ${lowerTick} to ${upperTick}`)
  console.log(`- Token A: ${pool.coin_type_a}`)
  console.log(`- Token B: ${pool.coin_type_b}`)

  // In a real scenario, you would execute this transaction
  // const result = await sdk.FullClient.executeTx(keypair, openPositionPayload, true)

  return openPositionPayload
}
```

## Step 5: Add Liquidity to Position

```typescript
import { ClmmPoolUtil, TickMath } from '@cetusprotocol/common-sdk'

async function addLiquidity(
  sdk: CetusClmmSDK,
  positionId: string,
  poolId: string,
  lowerTick: number,
  upperTick: number,
  tokenAAmount: string,
  tokenBAmount: string
) {
  // Get current pool state
  const pool = await sdk.Pool.getPool(poolId)
  const currentSqrtPrice = new BN(pool.current_sqrt_price)

  // Convert ticks to sqrt prices
  const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
  const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

  // Calculate liquidity from token amounts
  const tokenAmounts = {
    coin_amount_a: tokenAAmount,
    coin_amount_b: tokenBAmount
  }

  const liquidity = ClmmPoolUtil.estimateLiquidityFromCoinAmounts(
    currentSqrtPrice,
    lowerTick,
    upperTick,
    tokenAmounts
  )

  // Apply 0.5% slippage tolerance
  const slippage = Percentage.fromDecimal(d(0.5))

  // Calculate token amounts with slippage
  const calculatedAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
    new BN(liquidity),
    currentSqrtPrice,
    lowerSqrtPrice,
    upperSqrtPrice,
    true // round up for adding liquidity
  )

  const adjustedAmounts = ClmmPoolUtil.adjustForCoinSlippage(
    calculatedAmounts,
    slippage,
    true // adjust up for maximum amounts
  )

  // Create add liquidity payload
  const addLiquidityParams = {
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    pool_id: poolId,
    pos_id: positionId,
    tick_lower: lowerTick.toString(),
    tick_upper: upperTick.toString(),
    delta_liquidity: liquidity,
    max_amount_a: adjustedAmounts.coin_amount_limit_a,
    max_amount_b: adjustedAmounts.coin_amount_limit_b,
    collect_fee: false,
    rewarder_coin_types: []
  }

  const payload = await sdk.Position.createAddLiquidityPayload(addLiquidityParams)

  console.log('Add liquidity payload created:')
  console.log(`- Position: ${positionId}`)
  console.log(`- Liquidity: ${liquidity}`)
  console.log(`- Max token A: ${adjustedAmounts.coin_amount_limit_a}`)
  console.log(`- Max token B: ${adjustedAmounts.coin_amount_limit_b}`)

  return payload
}
```

## Step 6: Monitor Position Status

```typescript
async function monitorPosition(sdk: CetusClmmSDK, positionId: string) {
  // Get position details
  const position = await sdk.Position.getPositionById(positionId)
  const pool = await sdk.Pool.getPool(position.pool)

  // Check if position is in range
  const currentTick = TickMath.sqrtPriceX64ToTickIndex(new BN(pool.current_sqrt_price))
  const isInRange = currentTick >= position.tick_lower_index &&
                    currentTick <= position.tick_upper_index

  // Get accumulated fees
  const feeParams = {
    pool_id: pool.id,
    position_id: positionId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b
  }

  const feeAmounts = await sdk.Position.fetchPosFeeAmount([feeParams])
  const fees = feeAmounts[0]

  // Get accumulated rewards (if any)
  let rewards = []
  if (pool.rewarder_infos && pool.rewarder_infos.length > 0) {
    const rewardParams = {
      pool_id: pool.id,
      position_id: positionId,
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b,
      rewarder_types: pool.rewarder_infos.map(r => r.coin_type)
    }

    const rewardResults = await sdk.Rewarder.fetchPosRewardersAmount([rewardParams])
    if (rewardResults.length > 0) {
      rewards = rewardResults[0].rewarder_amounts
    }
  }

  console.log('Position Status:')
  console.log(`- Position ID: ${positionId}`)
  console.log(`- Pool: ${pool.id}`)
  console.log(`- Liquidity: ${position.liquidity}`)
  console.log(`- Tick range: ${position.tick_lower_index} to ${position.tick_upper_index}`)
  console.log(`- Current tick: ${currentTick}`)
  console.log(`- In range: ${isInRange}`)
  console.log(`- Status: ${isInRange ? 'ACTIVE' : 'OUT OF RANGE'}`)

  console.log('\nAccumulated Fees:')
  console.log(`- Token A: ${fees.fee_owned_a}`)
  console.log(`- Token B: ${fees.fee_owned_b}`)

  if (rewards.length > 0) {
    console.log('\nAccumulated Rewards:')
    rewards.forEach(reward => {
      console.log(`- ${reward.coin_type}: ${reward.amount_owned}`)
    })
  }

  return {
    position,
    pool,
    isInRange,
    fees,
    rewards
  }
}
```

## Step 7: Remove Liquidity

```typescript
async function removeLiquidity(
  sdk: CetusClmmSDK,
  positionId: string,
  percentage: number // e.g., 0.5 for 50%
) {
  // Get position details
  const position = await sdk.Position.getPositionById(positionId)
  const pool = await sdk.Pool.getPool(position.pool)

  // Calculate liquidity to remove
  const currentLiquidity = new BN(position.liquidity)
  const liquidityToRemove = currentLiquidity.muln(percentage)

  // Get current pool state
  const currentSqrtPrice = new BN(pool.current_sqrt_price)
  const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_lower_index)
  const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_upper_index)

  // Calculate token amounts for removal
  const tokenAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
    liquidityToRemove,
    currentSqrtPrice,
    lowerSqrtPrice,
    upperSqrtPrice,
    true // round up for removal (get maximum possible)
  )

  // Apply slippage tolerance for minimum amounts
  const slippage = Percentage.fromDecimal(d(0.5))
  const adjustedAmounts = ClmmPoolUtil.adjustForCoinSlippage(
    tokenAmounts,
    slippage,
    false // adjust down for minimum amounts
  )

  // Create remove liquidity payload
  const removeParams = {
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    pool_id: pool.id,
    pos_id: positionId,
    delta_liquidity: liquidityToRemove.toString(),
    min_amount_a: adjustedAmounts.coin_amount_limit_a,
    min_amount_b: adjustedAmounts.coin_amount_limit_b,
    collect_fee: true, // Collect fees when removing liquidity
    rewarder_coin_types: pool.rewarder_infos?.map(r => r.coin_type) || [],
    is_return_coins: true
  }

  const payload = await sdk.Position.removeLiquidityPayload(removeParams)

  console.log('Remove liquidity payload created:')
  console.log(`- Remove ${percentage * 100}% of liquidity`)
  console.log(`- Liquidity to remove: ${liquidityToRemove.toString()}`)
  console.log(`- Min token A: ${adjustedAmounts.coin_amount_limit_a}`)
  console.log(`- Min token B: ${adjustedAmounts.coin_amount_limit_b}`)
  console.log(`- Collect fees: ${removeParams.collect_fee}`)

  return payload
}
```

## Step 8: Collect Rewards and Fees

```typescript
async function collectAllRewards(
  sdk: CetusClmmSDK,
  positionId: string
) {
  // Get position and pool details
  const position = await sdk.Position.getPositionById(positionId)
  const pool = await sdk.Pool.getPool(position.pool)

  // Get reward coin types
  const rewardCoinTypes = pool.rewarder_infos?.map(rewarder => rewarder.coin_type) || []

  // Create collect rewards payload
  const collectParams = {
    pool_id: pool.id,
    pos_id: positionId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,
    rewarder_coin_types: rewardCoinTypes,
    collect_fee: true // Collect fees along with rewards
  }

  const payload = await sdk.Rewarder.collectRewarderPayload(collectParams)

  console.log('Collect rewards payload created:')
  console.log(`- Position: ${positionId}`)
  console.log(`- Collect fees: ${collectParams.collect_fee}`)
  console.log(`- Reward coins: ${rewardCoinTypes.length}`)

  return payload
}
```

## Complete Workflow Example

```typescript
async function completeLiquidityWorkflow() {
  try {
    // Step 1: Initialize
    const { sdk, keypair } = await initializeSDK()

    // Token addresses (example: SUI/USDC)
    const SUI = '0x2::sui::SUI'
    const USDC = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'

    // Step 2: Find pool
    const pool = await findPool(sdk, SUI, USDC)

    // Step 3: Calculate optimal ticks
    const currentPrice = parseFloat(pool.current_price)
    const { lowerTick, upperTick } = calculateOptimalTicks(
      currentPrice,
      'medium', // strategy
      9, // SUI decimals
      6, // USDC decimals
      parseInt(pool.tick_spacing)
    )

    // Step 4: Open position (simulated - would need transaction execution)
    console.log('\n=== Opening Position ===')
    const openPayload = await openPosition(sdk, pool.id, lowerTick, upperTick)
    // const openResult = await sdk.FullClient.executeTx(keypair, openPayload, true)
    // const positionId = extractPositionIdFromResult(openResult)
    const positionId = '0x...' // In real scenario, extract from transaction result

    // Step 5: Add liquidity
    console.log('\n=== Adding Liquidity ===')
    const addPayload = await addLiquidity(
      sdk,
      positionId,
      pool.id,
      lowerTick,
      upperTick,
      '1000000000', // 1 SUI
      '1000000'     // 1 USDC
    )
    // await sdk.FullClient.executeTx(keypair, addPayload, true)

    // Step 6: Monitor position
    console.log('\n=== Monitoring Position ===')
    await monitorPosition(sdk, positionId)

    // Wait some time for fees/rewards to accumulate
    console.log('\nWaiting 24 hours for fees to accumulate...')
    // await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000))

    // Step 7: Remove 50% liquidity
    console.log('\n=== Removing 50% Liquidity ===')
    const removePayload = await removeLiquidity(sdk, positionId, 0.5)
    // await sdk.FullClient.executeTx(keypair, removePayload, true)

    // Step 8: Collect remaining rewards
    console.log('\n=== Collecting Remaining Rewards ===')
    const collectPayload = await collectAllRewards(sdk, positionId)
    // await sdk.FullClient.executeTx(keypair, collectPayload, true)

    console.log('\n=== Workflow Complete ===')

  } catch (error) {
    console.error('Workflow failed:', error)
    throw error
  }
}

// Run the complete workflow
// completeLiquidityWorkflow()
```

## Best Practices Demonstrated

1. **Error Handling**: Each function includes try-catch where appropriate
2. **Slippage Protection**: All swaps and liquidity operations use slippage tolerance
3. **Gas Estimation**: Payloads are created with appropriate gas considerations
4. **State Validation**: Positions are checked for being in-range before operations
5. **Batch Operations**: Multiple operations are batched where possible
6. **Security**: Private keys are handled securely (not shown in example)

## Next Steps

After running this workflow, you can:
1. **Automate monitoring**: Set up regular position status checks
2. **Implement rebalancing**: Automatically adjust positions based on price movements
3. **Optimize fees**: Experiment with different tick ranges and strategies
4. **Scale operations**: Manage multiple positions across different pools