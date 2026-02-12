# Complete Swap Flow Example

This example demonstrates a complete swap workflow in Cetus CLMM, from pre-swap calculations to execution, including price impact analysis, slippage protection, and multi-pool routing.

## Overview

This example covers:
1. **SDK initialization** - Setting up the SDK for swap operations
2. **Token selection** - Identifying swap pairs and pools
3. **Pre-swap analysis** - Calculating swap outcomes and price impact
4. **Slippage configuration** - Setting appropriate slippage tolerance
5. **Swap execution** - Creating and executing swap transactions
6. **Multi-pool routing** - Finding optimal swap paths
7. **Post-swap analysis** - Verifying results and analyzing impact

## Prerequisites

```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Percentage, d, TickMath } from '@cetusprotocol/common-sdk'
import BN from 'bn.js'
```

## Step 1: Initialize SDK and Wallet

```typescript
async function initializeForSwaps() {
  // Initialize SDK for swap operations
  const sdk = CetusClmmSDK.createSDK({
    env: 'mainnet'
  })

  // Initialize wallet (in production, use secure key management)
  const privateKey = process.env.PRIVATE_KEY
  const keypair = Ed25519Keypair.fromSecretKey(privateKey)
  const senderAddress = keypair.getPublicKey().toSuiAddress()

  // Set sender address in SDK
  sdk.setSenderAddress(senderAddress)

  console.log(`Swap SDK initialized for address: ${senderAddress}`)
  return { sdk, keypair, senderAddress }
}
```

## Step 2: Find Best Pool for Swap

```typescript
async function findBestSwapPool(
  sdk: CetusClmmSDK,
  tokenA: string,
  tokenB: string,
  amount: string,
  isAtoB: boolean
) {
  console.log(`Finding best pool for ${isAtoB ? 'A→B' : 'B→A'} swap`)
  console.log(`Amount: ${amount}`)

  // Get all pools for the token pair
  const pools = await sdk.Pool.getPoolByCoins([tokenA, tokenB])

  if (pools.length === 0) {
    throw new Error(`No pools found for ${tokenA}/${tokenB}`)
  }

  // Evaluate each pool for best swap rate
  let bestPool = null
  let bestOutput = new BN('0')
  let bestPoolIndex = -1

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]

    try {
      // Calculate pre-swap for this pool
      const preSwapResult = await sdk.Swap.preSwap({
        pool: pool,
        current_sqrt_price: Number(pool.current_sqrt_price),
        coin_type_a: pool.coin_type_a,
        coin_type_b: pool.coin_type_b,
        decimals_a: 9, // Adjust based on tokens
        decimals_b: 6,
        a2b: isAtoB,
        by_amount_in: true,
        amount: amount
      })

      const outputAmount = new BN(preSwapResult.estimated_amount_out)

      // Check if this pool offers better rate
      if (outputAmount.gt(bestOutput)) {
        bestOutput = outputAmount
        bestPool = pool
        bestPoolIndex = i
      }

      console.log(`Pool ${i}: ${pool.id}`)
      console.log(`  Output: ${outputAmount.toString()}`)
      console.log(`  Fee: ${preSwapResult.estimated_fee_amount}`)
      console.log(`  Price Impact: ${preSwapResult.estimated_price_impact}%`)

    } catch (error) {
      console.log(`Pool ${i} calculation failed: ${error.message}`)
    }
  }

  if (!bestPool) {
    throw new Error('No suitable pool found for swap')
  }

  console.log(`\nSelected pool ${bestPoolIndex}: ${bestPool.id}`)
  console.log(`Best output: ${bestOutput.toString()}`)

  return { pool: bestPool, estimatedOutput: bestOutput }
}
```

## Step 3: Advanced Pre-Swap Analysis

```typescript
async function advancedPreSwapAnalysis(
  sdk: CetusClmmSDK,
  poolId: string,
  tokenA: string,
  tokenB: string,
  amount: string,
  isAtoB: boolean,
  slippageTolerance: number = 0.5 // 0.5% default
) {
  // Get detailed pool information
  const pool = await sdk.Pool.getPool(poolId)
  const swapTicks = await sdk.Pool.fetchTicks({
    pool_id: poolId,
    coin_type_a: tokenA,
    coin_type_b: tokenB
  })

  // Configure swap parameters
  const params = {
    decimals_a: 9, // SUI decimals
    decimals_b: 6, // USDC decimals
    a2b: isAtoB,
    by_amount_in: true,
    amount: new BN(amount),
    swap_ticks: swapTicks,
    current_pool: pool
  }

  // Calculate detailed rates
  const rates = sdk.Swap.calculateRates(params)

  console.log('=== Advanced Swap Analysis ===')
  console.log(`Pool: ${poolId}`)
  console.log(`Direction: ${isAtoB ? 'A→B' : 'B→A'}`)
  console.log(`Input Amount: ${rates.estimated_amount_in.toString()}`)
  console.log(`Output Amount: ${rates.estimated_amount_out.toString()}`)
  console.log(`Fee Amount: ${rates.estimated_fee_amount.toString()}`)
  console.log(`Price Impact: ${rates.price_impact_pct.toFixed(4)}%`)
  console.log(`Cross Ticks: ${rates.cross_tick_count}`)
  console.log(`Extra Compute Limit: ${rates.extra_compute_limit}`)

  // Check for warnings
  if (parseFloat(rates.price_impact_pct.toFixed(4)) > 1.0) {
    console.warn('⚠️ High price impact detected (>1%)')
  }

  if (rates.cross_tick_count > 100) {
    console.warn('⚠️ High number of cross ticks - consider splitting swap')
  }

  if (rates.extra_compute_limit > 100000) {
    console.warn('⚠️ High compute requirement - gas costs may be high')
  }

  // Calculate slippage-adjusted amount limit
  const slippage = Percentage.fromDecimal(d(slippageTolerance))
  const toAmount = isAtoB ? rates.estimated_amount_out : rates.estimated_amount_in

  // For by_amount_in=true: input is fixed, output gets min amount limit
  // For by_amount_in=false: output is fixed, input gets max amount limit
  const adjustUp = !true // true = by_amount_in, so adjust down for output

  const amountLimit = adjustForSlippage(toAmount, slippage, adjustUp)

  console.log(`\nSlippage Configuration:`)
  console.log(`Tolerance: ${slippageTolerance}%`)
  console.log(`Amount Limit: ${amountLimit.toString()}`)

  return {
    rates,
    pool,
    swapTicks,
    amountLimit: amountLimit.toString(),
    warnings: {
      highPriceImpact: parseFloat(rates.price_impact_pct.toFixed(4)) > 1.0,
      manyCrossTicks: rates.cross_tick_count > 100,
      highCompute: rates.extra_compute_limit > 100000
    }
  }
}
```

## Step 4: Execute Swap with Slippage Protection

```typescript
async function executeSwapWithProtection(
  sdk: CetusClmmSDK,
  poolId: string,
  tokenA: string,
  tokenB: string,
  amount: string,
  isAtoB: boolean,
  amountLimit: string,
  keypair: Ed25519Keypair
) {
  console.log('\n=== Executing Swap ===')

  // Get pool for gas estimation
  const pool = await sdk.Pool.getPool(poolId)
  const swapTicks = await sdk.Pool.fetchTicks({
    pool_id: poolId,
    coin_type_a: tokenA,
    coin_type_b: tokenB
  })

  const swapParams = {
    pool_id: poolId,
    coin_type_a: tokenA,
    coin_type_b: tokenB,
    a2b: isAtoB,
    by_amount_in: true,
    amount: amount,
    amount_limit: amountLimit
  }

  // Configure gas estimation for SUI swaps
  const gasEstimateArg = {
    by_amount_in: true,
    slippage: Percentage.fromDecimal(d(0.5)),
    decimals_a: 9,
    decimals_b: 6,
    swap_ticks: swapTicks,
    current_pool: pool
  }

  try {
    // Create swap payload with gas estimation
    const swapPayload = await sdk.Swap.createSwapPayload(swapParams, gasEstimateArg)

    console.log('Swap payload created successfully')
    console.log(`- Direction: ${isAtoB ? 'A→B' : 'B→A'}`)
    console.log(`- Input Amount: ${amount}`)
    console.log(`- Amount Limit: ${amountLimit}`)

    // Execute transaction
    // const result = await sdk.FullClient.executeTx(keypair, swapPayload, true)
    // console.log(`Transaction digest: ${result.digest}`)

    // For demonstration, return payload
    return {
      payload: swapPayload,
      params: swapParams,
      status: 'ready'
    }

  } catch (error) {
    console.error('Failed to create swap payload:', error)
    throw error
  }
}
```

## Step 5: Multi-Pool Routing

```typescript
async function findOptimalSwapRoute(
  sdk: CetusClmmSDK,
  tokenA: string,
  tokenB: string,
  amount: string,
  intermediateTokens: string[] = []
) {
  console.log(`\n=== Multi-Pool Routing Analysis ===`)
  console.log(`Route: ${tokenA} → ${intermediateTokens.join(' → ')} → ${tokenB}`)
  console.log(`Amount: ${amount}`)

  // Collect all possible pools
  const allPools = []
  const pairs = []

  // Direct pair
  pairs.push([tokenA, tokenB])

  // Intermediate pairs
  if (intermediateTokens.length > 0) {
    let currentToken = tokenA
    for (const intermediate of intermediateTokens) {
      pairs.push([currentToken, intermediate])
      currentToken = intermediate
    }
    pairs.push([currentToken, tokenB])
  }

  // Get pools for each pair
  for (const [token1, token2] of pairs) {
    const pools = await sdk.Pool.getPoolByCoins([token1, token2])
    console.log(`Found ${pools.length} pools for ${token1}/${token2}`)
    allPools.push(...pools)
  }

  // For multi-pool routing, use preSwapWithMultiPool
  const params = {
    pool_ids: allPools.map(p => p.id),
    coin_type_a: tokenA,
    coin_type_b: tokenB,
    a2b: true,
    by_amount_in: true,
    amount: amount
  }

  try {
    const result = await sdk.Swap.preSwapWithMultiPool(params)

    if (result) {
      console.log('\nOptimal Route Found:')
      console.log(`- Pool Address: ${result.pool_address}`)
      console.log(`- Estimated Output: ${result.estimated_amount_out}`)
      console.log(`- Estimated Fee: ${result.estimated_fee_amount}`)
      console.log(`- Cross Tick Count: ${result.cross_tick_count}`)

      return result
    } else {
      console.log('No suitable route found')
      return null
    }

  } catch (error) {
    console.error('Multi-pool routing failed:', error)
    return null
  }
}
```

## Step 6: Price Impact Analysis

```typescript
async function analyzeSwapPriceImpact(
  sdk: CetusClmmSDK,
  poolId: string,
  swapAmounts: string[]
) {
  console.log('\n=== Price Impact Analysis ===')

  const pool = await sdk.Pool.getPool(poolId)
  const swapTicks = await sdk.Pool.fetchTicks({
    pool_id: poolId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b
  })

  const impacts = []

  for (const amount of swapAmounts) {
    const rates = sdk.Swap.calculateRates({
      decimals_a: 9,
      decimals_b: 6,
      a2b: true,
      by_amount_in: true,
      amount: new BN(amount),
      swap_ticks: swapTicks,
      current_pool: pool
    })

    impacts.push({
      amount: amount,
      priceImpact: rates.price_impact_pct.toFixed(4),
      output: rates.estimated_amount_out.toString(),
      fee: rates.estimated_fee_amount.toString()
    })
  }

  console.log('Swap Size vs Price Impact:')
  impacts.forEach(impact => {
    console.log(`  ${impact.amount} → ${impact.priceImpact}% impact, Output: ${impact.output}`)
  })

  // Find optimal swap size (balance between amount and impact)
  const optimal = impacts.reduce((best, current) => {
    const currentImpact = parseFloat(current.priceImpact)
    if (currentImpact < 0.5) { // Less than 0.5% impact
      return current.amount > best.amount ? current : best
    }
    return best
  }, { amount: '0', priceImpact: '100' })

  console.log(`\nRecommended swap size: ${optimal.amount} (${optimal.priceImpact}% impact)`)

  return { impacts, optimal }
}
```

## Step 7: Complete Swap Workflow

```typescript
async function completeSwapWorkflow() {
  try {
    console.log('=== Complete Swap Workflow ===\n')

    // Step 1: Initialize
    const { sdk, keypair } = await initializeForSwaps()

    // Token addresses (example: SUI/USDC)
    const SUI = '0x2::sui::SUI'
    const USDC = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'

    // Swap parameters
    const swapAmount = '1000000000' // 1 SUI
    const isAtoB = true // SUI → USDC
    const slippageTolerance = 0.3 // 0.3%

    // Step 2: Find best pool
    console.log('1. Finding best pool...')
    const { pool, estimatedOutput } = await findBestSwapPool(
      sdk, SUI, USDC, swapAmount, isAtoB
    )

    // Step 3: Advanced analysis
    console.log('\n2. Performing advanced analysis...')
    const analysis = await advancedPreSwapAnalysis(
      sdk,
      pool.id,
      SUI,
      USDC,
      swapAmount,
      isAtoB,
      slippageTolerance
    )

    // Step 4: Check if swap is acceptable
    if (analysis.warnings.highPriceImpact) {
      console.warn('\n⚠️ Warning: High price impact detected')
      console.warn('Consider:')
      console.warn('1. Splitting swap into smaller amounts')
      console.warn('2. Waiting for better liquidity')
      console.warn('3. Using alternative pool')

      // Analyze optimal swap sizes
      console.log('\nAnalyzing optimal swap sizes...')
      const testAmounts = [
        '100000000',    // 0.1 SUI
        '500000000',    // 0.5 SUI
        '1000000000',   // 1 SUI
        '2000000000',   // 2 SUI
      ]
      await analyzeSwapPriceImpact(sdk, pool.id, testAmounts)
    }

    // Step 5: Multi-pool routing check
    console.log('\n3. Checking multi-pool routes...')
    const intermediateTokens = [
      // Add potential intermediate tokens here
      // '0x...::usdt::USDT',
    ]

    const routeResult = await findOptimalSwapRoute(
      sdk,
      SUI,
      USDC,
      swapAmount,
      intermediateTokens
    )

    // Step 6: Execute swap
    console.log('\n4. Executing swap...')
    const swapResult = await executeSwapWithProtection(
      sdk,
      pool.id,
      SUI,
      USDC,
      swapAmount,
      isAtoB,
      analysis.amountLimit,
      keypair
    )

    // Step 7: Post-swap analysis
    console.log('\n5. Post-swap analysis...')
    console.log('- Swap parameters prepared')
    console.log('- Slippage protection configured')
    console.log('- Gas estimation included')

    if (routeResult && routeResult.estimated_amount_out > analysis.rates.estimated_amount_out.toString()) {
      console.log('\n💡 Suggestion: Multi-pool route offers better rate!')
      console.log(`Direct: ${analysis.rates.estimated_amount_out.toString()}`)
      console.log(`Multi-pool: ${routeResult.estimated_amount_out}`)
    }

    console.log('\n=== Swap Workflow Complete ===')
    console.log('To execute:')
    console.log('1. Uncomment the transaction execution code')
    console.log('2. Ensure sufficient balance for gas')
    console.log('3. Monitor transaction status')

    return {
      pool,
      analysis,
      routeResult,
      swapResult,
      recommendations: {
        executeDirect: !analysis.warnings.highPriceImpact,
        considerMultiPool: routeResult !== null,
        optimalAmount: analysis.warnings.highPriceImpact ? 'Split into smaller swaps' : swapAmount
      }
    }

  } catch (error) {
    console.error('Swap workflow failed:', error)
    throw error
  }
}

// Run the complete workflow
// completeSwapWorkflow()
```

## Best Practices Demonstrated

### 1. Always Pre-Calculate
- **Pre-swap calculations** before any execution
- **Price impact analysis** to avoid excessive slippage
- **Multiple pool evaluation** for best rates

### 2. Slippage Protection
- **Dynamic slippage** based on token volatility
- **Amount limits** for worst-case scenarios
- **Adjustment logic** for input vs output amounts

### 3. Gas Optimization
- **Gas estimation** for SUI transactions
- **Compute limit monitoring** for complex swaps
- **Batch considerations** for multiple operations

### 4. Risk Management
- **Warning thresholds** for price impact
- **Alternative route analysis**
- **Optimal size calculations**

### 5. Multi-Pool Routing
- **Intermediate token evaluation**
- **Route optimization** for best rates
- **Fallback options** if direct swap is poor

## Next Steps

After running this workflow, you can:

1. **Monitor execution**: Track swap transaction status and confirmations
2. **Analyze results**: Compare actual vs estimated outcomes
3. **Optimize strategies**: Refine swap size and timing based on results
4. **Implement automation**: Create automated swap execution systems
5. **Add monitoring**: Implement alerts for price impact and liquidity changes

## Common Swap Scenarios

### Small Swaps (<0.1% of pool liquidity)
- Minimal price impact
- Can use tighter slippage (0.1-0.3%)
- Direct pool route usually optimal

### Medium Swaps (0.1-1% of pool liquidity)
- Moderate price impact
- Use standard slippage (0.3-0.5%)
- Consider splitting into multiple swaps

### Large Swaps (>1% of pool liquidity)
- Significant price impact
- Use higher slippage (0.5-2.0%)
- Strongly consider multi-pool routing
- May need to wait for better liquidity

## Troubleshooting

### Swap Fails with "Insufficient Output"
- Increase slippage tolerance
- Verify pool liquidity hasn't changed
- Check for recent large swaps in the pool

### Gas Estimation Fails
- Ensure sufficient SUI balance for gas
- Try manual gas budgeting
- Consider simpler swap parameters

### No Suitable Pool Found
- Verify token addresses are correct
- Check if pool exists on current network
- Consider creating a limit order instead

## Performance Optimization

### Caching Pool Data
```typescript
const poolCache = new Map<string, any>()

async function getCachedPool(poolId: string): Promise<any> {
  if (!poolCache.has(poolId)) {
    const pool = await sdk.Pool.getPool(poolId)
    poolCache.set(poolId, pool)
    // Cache for 30 seconds
    setTimeout(() => poolCache.delete(poolId), 30000)
  }
  return poolCache.get(poolId)
}
```

### Batch Tick Fetching
```typescript
async function batchFetchTicks(poolIds: string[]) {
  const ticksByPool = new Map<string, any[]>()

  await Promise.all(
    poolIds.map(async (poolId) => {
      const pool = await sdk.Pool.getPool(poolId)
      const ticks = await sdk.Pool.fetchTicks({
        pool_id: poolId,
        coin_type_a: pool.coin_type_a,
        coin_type_b: pool.coin_type_b
      })
      ticksByPool.set(poolId, ticks)
    })
  )

  return ticksByPool
}
```