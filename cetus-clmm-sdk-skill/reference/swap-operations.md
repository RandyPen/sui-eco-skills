# Swap Operations

This guide covers all aspects of swap operations in Cetus CLMM, including pre-swap calculations, executing swaps, fee calculations, and price impact analysis.

## Overview

Swap operations in CLMM involve:
- **Pre-swap calculations**: Estimating swap outcomes before execution
- **Swap execution**: Executing token exchanges
- **Fee calculations**: Computing trading fees
- **Price impact**: Analyzing price slippage effects
- **Multi-pool routing**: Finding optimal swap paths across multiple pools

## Key Concepts

### Swap Direction
- **A to B (a2b)**: Swapping from token A to token B
- **B to A (!a2b)**: Swapping from token B to token A

### Amount Specification
- **By amount in (by_amount_in)**: Specifying input amount, calculating output
- **By amount out (!by_amount_in)**: Specifying output amount, calculating required input

### Price and Slippage
- **Sqrt price**: Square root of price (fixed-point Q64.64 format)
- **Slippage tolerance**: Maximum acceptable price movement
- **Price impact**: Percentage change in pool price due to swap

## Pre-Swap Calculations

### Basic Pre-Swap

Calculate swap outcome before execution:

```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'

async function calculateSwap() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Get pool information
  const pool = await sdk.Pool.getPool('0x...')

  const params = {
    // Pool and token information
    pool: pool,
    current_sqrt_price: pool.current_sqrt_price,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b,

    // Token decimals (required for accurate calculations)
    decimals_a: 9, // SUI decimals
    decimals_b: 6, // USDC decimals

    // Swap direction and amount
    a2b: true, // true = A to B, false = B to A
    by_amount_in: true, // true = specify input amount
    amount: '1000000000' // 1 SUI (9 decimals)
  }

  try {
    const result = await sdk.Swap.preSwap(params)

    console.log('Swap Calculation Results:')
    console.log(`- Estimated Input: ${result.estimated_amount_in}`)
    console.log(`- Estimated Output: ${result.estimated_amount_out}`)
    console.log(`- Estimated Fee: ${result.estimated_fee_amount}`)
    console.log(`- New Sqrt Price: ${result.estimated_end_sqrt_price}`)
    console.log(`- Exceeds Limits: ${result.is_exceed}`)

    return result
  } catch (error) {
    console.error('Pre-swap calculation failed:', error)
    throw error
  }
}
```

### Calculate Swap with Custom Parameters

Advanced pre-swap with custom tick data:

```typescript
async function calculateSwapWithTicks() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const poolId = '0x...'

  // Get pool and tick data
  const pool = await sdk.Pool.getPool(poolId)
  const swapTicks = await sdk.Pool.fetchTicks({
    pool_id: poolId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b
  })

  const params = {
    decimals_a: 9,
    decimals_b: 6,
    a2b: true,
    by_amount_in: true,
    amount: new BN('1000000000'), // 1 SUI
    swap_ticks: swapTicks,
    current_pool: pool
  }

  // Use calculateRates for more control
  const result = sdk.Swap.calculateRates(params)

  console.log('Detailed Swap Analysis:')
  console.log(`- Input Amount: ${result.estimated_amount_in.toString()}`)
  console.log(`- Output Amount: ${result.estimated_amount_out.toString()}`)
  console.log(`- Fee Amount: ${result.estimated_fee_amount.toString()}`)
  console.log(`- Price Impact: ${result.price_impact_pct.toFixed(4)}%`)
  console.log(`- Extra Compute Limit: ${result.extra_compute_limit}`)

  return result
}
```

### Pre-Swap with Multiple Pools

Find optimal swap path across multiple pools:

```typescript
async function findOptimalSwapPath() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const poolIds = [
    '0x53d70570db4f4d8ebc20aa1b67dc6f5d061d318d371e5de50ff64525d7dd5bca',
    '0x4038aea2341070550e9c1f723315624c539788d0ca9212dca7eb4b36147c0fcb',
    '0x6fd4915e6d8d3e2ba6d81787046eb948ae36fdfc75dad2e24f0d4aaa2417a416'
  ]

  // Get first pool for token types
  const firstPool = await sdk.Pool.getPool(poolIds[0])

  const params = {
    pool_ids: poolIds,
    coin_type_a: firstPool.coin_type_a,
    coin_type_b: firstPool.coin_type_b,
    a2b: true,
    by_amount_in: true,
    amount: '10000000' // 10 USDC (6 decimals)
  }

  const result = await sdk.Swap.preSwapWithMultiPool(params)

  if (result) {
    console.log('Optimal Pool Found:')
    console.log(`- Pool Address: ${result.pool_address}`)
    console.log(`- Estimated Output: ${result.estimated_amount_out}`)
    console.log(`- Estimated Fee: ${result.estimated_fee_amount}`)
  }

  return result
}
```

## Executing Swaps

### Basic Swap Execution

Execute a swap with slippage protection:

```typescript
import { Percentage, d } from '@cetusprotocol/common-sdk'
import BN from 'bn.js'

async function executeSwap() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Configuration
  const a2b = true
  const byAmountIn = true
  const amount = '10000000' // 10 USDC
  const slippage = Percentage.fromDecimal(d(0.1)) // 0.1% slippage

  // Get pool and calculate swap
  const currentPool = await sdk.Pool.getPool('0x...')

  // Pre-calculate swap
  const preSwapResult = await sdk.Swap.preSwap({
    pool: currentPool,
    current_sqrt_price: currentPool.current_sqrt_price,
    coin_type_a: currentPool.coin_type_a,
    coin_type_b: currentPool.coin_type_b,
    decimals_a: 6,
    decimals_b: 6,
    a2b,
    by_amount_in: byAmountIn,
    amount
  })

  // Calculate amount limit with slippage
  const toAmount = byAmountIn
    ? new BN(preSwapResult.estimated_amount_out)
    : new BN(preSwapResult.estimated_amount_in)

  const amountLimit = adjustForSlippage(toAmount, slippage, !byAmountIn)

  // Create swap payload
  const swapPayload = await sdk.Swap.createSwapPayload({
    pool_id: currentPool.id,
    a2b,
    by_amount_in: byAmountIn,
    amount: amount,
    amount_limit: amountLimit.toString(),
    coin_type_a: currentPool.coin_type_a,
    coin_type_b: currentPool.coin_type_b
  })

  // Execute transaction (requires keypair)
  // const result = await sdk.FullClient.executeTx(keypair, swapPayload, true)

  return swapPayload
}
```

### Swap with Gas Estimation

Execute swap with gas estimation for SUI transactions:

```typescript
async function executeSwapWithGasEstimate() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const poolId = '0x...'

  // Get pool and tick data for gas estimation
  const currentPool = await sdk.Pool.getPool(poolId)
  const swapTicks = await sdk.Pool.fetchTicks({
    pool_id: poolId,
    coin_type_a: currentPool.coin_type_a,
    coin_type_b: currentPool.coin_type_b
  })

  const swapParams = {
    pool_id: poolId,
    a2b: true,
    by_amount_in: true,
    amount: '1000000000', // 1 SUI
    amount_limit: '990000000', // With slippage
    coin_type_a: currentPool.coin_type_a,
    coin_type_b: currentPool.coin_type_b
  }

  const gasEstimateArg = {
    by_amount_in: true,
    slippage: Percentage.fromDecimal(d(0.5)), // 0.5% slippage
    decimals_a: 9,
    decimals_b: 6,
    swap_ticks: swapTicks,
    current_pool: currentPool
  }

  // Create payload with gas estimation
  const swapPayload = await sdk.Swap.createSwapPayload(swapParams, gasEstimateArg)

  console.log('Swap payload created with gas estimation')
  return swapPayload
}
```

### Swap Without Transfer Coins

Execute swap without automatic coin transfers (advanced use):

```typescript
async function executeSwapWithoutTransfer() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const poolId = '0x...'

  const currentPool = await sdk.Pool.getPool(poolId)

  const swapParams = {
    pool_id: poolId,
    a2b: true,
    by_amount_in: true,
    amount: '10000000',
    amount_limit: '9950000', // 0.5% slippage
    coin_type_a: currentPool.coin_type_a,
    coin_type_b: currentPool.coin_type_b
  }

  // Create payload without automatic coin transfers
  const { tx, coin_ab_s } = await sdk.Swap.createSwapWithoutTransferCoinsPayload(swapParams)

  console.log('Swap transaction created:')
  console.log(`- Transaction: ${tx}`)
  console.log(`- Coin outputs: ${coin_ab_s.length}`)

  // Manual coin handling required
  // buildTransferCoinToSender(sdk, tx, coin_ab_s[0], currentPool.coin_type_a)
  // buildTransferCoinToSender(sdk, tx, coin_ab_s[1], currentPool.coin_type_b)

  return { tx, coin_ab_s }
}
```

## Fee and Price Impact Calculations

### Calculate Swap Fees

Calculate fees for a swap path:

```typescript
async function calculateSwapFees() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // This is typically called internally, but demonstrates the calculation
  const swapPaths = [] // Would be populated from swap result

  const totalFee = sdk.Swap.calculateSwapFee(swapPaths)
  console.log(`Total swap fee: ${totalFee}`)

  return totalFee
}
```

### Calculate Price Impact

Analyze price impact of a swap:

```typescript
async function calculatePriceImpact() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const swapPaths = [] // Would be populated from swap result

  const priceImpact = sdk.Swap.calculateSwapPriceImpact(swapPaths)
  console.log(`Price impact: ${priceImpact}%`)

  return priceImpact
}
```

### Calculate Single Impact

Calculate price impact for a single pool:

```typescript
function calculateSingleImpact(rate: Decimal, currentPrice: Decimal): Decimal {
  // ((currentPrice - rate) / currentPrice) * 100
  return currentPrice.minus(rate).div(currentPrice).mul(100)
}
```

## Swap Parameter Types

### SwapParams Type

Based on the actual SDK implementation:

```typescript
type SwapParams = {
  // Pool identifier
  pool_id: string

  // Token types
  coin_type_a: string
  coin_type_b: string

  // Swap direction
  a2b: boolean // true = A to B, false = B to A

  // Amount specification
  by_amount_in: boolean // true = specify input amount

  // Swap amounts
  amount: string // Swap amount
  amount_limit: string // Minimum output or maximum input

  // Optional swap partner for fee sharing
  swap_partner?: string
}
```

### PreSwapParams Type

Parameters for pre-swap calculation:

```typescript
type PreSwapParams = {
  // Pool information
  pool: any // Pool object from sdk.Pool.getPool()
  current_sqrt_price: number

  // Token information
  coin_type_a: string
  coin_type_b: string
  decimals_a: number
  decimals_b: number

  // Swap parameters
  a2b: boolean
  by_amount_in: boolean
  amount: string
}
```

### CalculateRatesParams Type

Parameters for detailed rate calculation:

```typescript
type CalculateRatesParams = {
  decimals_a: number
  decimals_b: number
  a2b: boolean
  by_amount_in: boolean
  amount: BN
  swap_ticks: Array<TickData>
  current_pool: any // Pool object
}
```

## Best Practices

### 1. Always Use Pre-Swap
Always calculate swap outcomes before execution to:
- Verify sufficient liquidity
- Check price impact
- Calculate accurate fees
- Set appropriate slippage limits

```typescript
async function safeSwap(params: SwapParams) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const pool = await sdk.Pool.getPool(params.pool_id)

  // Pre-calculate
  const preSwap = await sdk.Swap.preSwap({
    pool: pool,
    current_sqrt_price: pool.current_sqrt_price,
    coin_type_a: params.coin_type_a,
    coin_type_b: params.coin_type_b,
    decimals_a: 9, // Adjust based on tokens
    decimals_b: 6,
    a2b: params.a2b,
    by_amount_in: params.by_amount_in,
    amount: params.amount
  })

  // Check if swap is feasible
  if (preSwap.is_exceed) {
    throw new Error('Swap exceeds pool limits')
  }

  // Check price impact (example threshold: 1%)
  if (parseFloat(preSwap.estimated_price_impact) > 1.0) {
    console.warn('High price impact detected')
  }

  return preSwap
}
```

### 2. Set Appropriate Slippage
- **Stable pairs**: 0.1-0.5% slippage
- **Volatile pairs**: 1-3% slippage
- **High volatility**: 5% or higher

```typescript
import { Percentage, d } from '@cetusprotocol/common-sdk'

function getSlippageTolerance(pairVolatility: 'stable' | 'medium' | 'high'): Percentage {
  switch (pairVolatility) {
    case 'stable':
      return Percentage.fromDecimal(d(0.1)) // 0.1%
    case 'medium':
      return Percentage.fromDecimal(d(0.5)) // 0.5%
    case 'high':
      return Percentage.fromDecimal(d(1.0)) // 1.0%
  }
}
```

### 3. Handle Gas for SUI Swaps
When swapping SUI, account for gas requirements:

```typescript
async function swapSuiWithGasReserve() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const pool = await sdk.Pool.getPool(poolId)

  // Get tick data for gas estimation
  const swapTicks = await sdk.Pool.fetchTicks({
    pool_id: poolId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b
  })

  const gasEstimateArg = {
    by_amount_in: true,
    slippage: Percentage.fromDecimal(d(0.5)),
    decimals_a: 9,
    decimals_b: 6,
    swap_ticks: swapTicks,
    current_pool: pool
  }

  // Use gas estimation in payload creation
  const payload = await sdk.Swap.createSwapPayload(swapParams, gasEstimateArg)

  return payload
}
```

### 4. Monitor Cross-Tick Count
Limit swaps that cross too many ticks:

```typescript
async function checkSwapComplexity(poolId: string, amount: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const pool = await sdk.Pool.getPool(poolId)
  const swapTicks = await sdk.Pool.fetchTicks({
    pool_id: poolId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b
  })

  const rates = sdk.Swap.calculateRates({
    decimals_a: 9,
    decimals_b: 6,
    a2b: true,
    by_amount_in: true,
    amount: new BN(amount),
    swap_ticks: swapTicks,
    current_pool: pool
  })

  // Check compute limits
  if (rates.extra_compute_limit > 0) {
    console.log(`Extra compute required: ${rates.extra_compute_limit}`)
  }

  // Warn for high complexity
  if (rates.extra_compute_limit > 100000) {
    console.warn('High swap complexity detected')
  }

  return rates
}
```

## Common Issues and Solutions

### Swap Exceeds Limits
**Problem**: `preSwap` returns `is_exceed: true`
**Solution**:
- Reduce swap amount
- Check pool liquidity
- Verify tick data is up to date
- Try different pool with higher liquidity

### Insufficient Output Amount
**Problem**: Output amount is less than expected
**Solution**:
- Increase slippage tolerance
- Check for price impact
- Verify pool price hasn't moved significantly
- Consider splitting large swaps

### Gas Estimation Failure
**Problem**: Gas estimation fails for SUI swaps
**Solution**:
- Manually set gas budget
- Ensure sufficient SUI balance
- Use `createSwapWithoutTransferCoinsPayload` for manual handling
- Check network congestion

### High Price Impact
**Problem**: Price impact exceeds acceptable level
**Solution**:
- Reduce swap amount
- Use multiple smaller swaps
- Find alternative pool with deeper liquidity
- Consider limit orders instead

## Next Steps

After mastering swap operations, you may want to:
- **Monitor positions**: Track swap impact on existing liquidity positions
- **Implement trading strategies**: Build automated trading bots
- **Analyze pool data**: Use swap data for market analysis
- **Optimize routing**: Implement multi-pool routing algorithms