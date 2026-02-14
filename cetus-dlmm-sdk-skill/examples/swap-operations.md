# Swap Operations Detailed Guide

Swapping is one of the core functionalities of the DLMM protocol, allowing users to exchange tokens in liquidity pools. Cetus DLMM SDK provides complete swap functionality, supporting exact input/output modes, slippage protection, and partner fees.

## Overview

DLMM swap operations are based on the Bin system, supporting the following features:
- **Exact input/output modes**: Fixed input amount or fixed output amount
- **Slippage protection**: Set maximum acceptable price slippage
- **Pre-swap quotes**: Get swap quotes and fee estimates
- **Partner integration**: Support partner fee sharing
- **Multi-Bin routing**: Automatically select optimal Bin path

## Core Concepts

### Swap Direction
- **A to B (a2b: true)**: Swap from Coin A to Coin B
- **B to A (a2b: false)**: Swap from Coin B to Coin A

### Swap Mode
- **Fixed input (by_amount_in: true)**: Specify input amount, calculate output amount
- **Fixed output (by_amount_in: false)**: Specify output amount, calculate input amount

### Slippage Protection
Slippage protection prevents unexpected losses due to significant price fluctuations. SDK automatically calculates slippage limits:
- **Fixed input mode**: Set minimum output amount limit
- **Fixed output mode**: Set maximum input amount limit

### Fee Structure
Swaps involve the following fees:
- **Base fee**: Fixed fee rate
- **Variable fee**: Dynamically adjusted based on market volatility
- **Protocol fee**: Portion of fees collected by the protocol
- **Partner fee**: Fee sharing for referred partners (optional)

## Swap Workflow

### Step 1: Initialize SDK and Get Pool Information

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'

// Initialize SDK
const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' }) // or 'testnet'
sdk.setSenderAddress(walletAddress)

// Get pool information
const poolId = '0x94088f9a28a6b355ab3569b9cc32895dbccf4c6716f030d59d3f0cf747305ec9'
const pool = await sdk.Pool.getPool(poolId)
const { coin_type_a, coin_type_b } = pool
```

### Step 2: Get Pre-Swap Quote

Use `preSwapQuote()` to get swap quote, including estimated output amount, fees, and Bin path:

```typescript
const preSwapOption = {
  pool_id: poolId,
  a2b: true,              // A to B direction
  by_amount_in: true,     // Fixed input mode
  in_amount: '100000',    // Input amount (string format)
  coin_type_a,           // Automatically inferred from type definition
  coin_type_b            // Automatically inferred from type definition
}

const quote = await sdk.Swap.preSwapQuote(preSwapOption)
console.log('Swap quote:', quote)
```

**Pre-swap quote return object** (`PreSwapQuote`):
```typescript
{
  pool_id: string,        // Pool ID
  a2b: boolean,           // Swap direction
  in_amount: string,      // Input amount
  out_amount: string,     // Output amount
  ref_fee_amount: string, // Referral fee amount
  fee_amount: string,     // Total fee amount
  partner: string,        // Partner address
  from_coin_type: string, // Source coin type
  to_coin_type: string,   // Target coin type
  bin_swaps: BinSwap[]    // Bin swap path
}
```

### Step 3: Create Swap Transaction

Create swap transaction based on quote, set slippage protection:

```typescript
const swapOption = {
  quote_obj: quote,       // Pre-swap quote
  by_amount_in: true,     // Consistent with pre-swap quote
  slippage: 0.01,         // 1% slippage protection
  coin_type_a,
  coin_type_b
  // partner: '0x...'     // Optional: Partner address
}

const tx = sdk.Swap.swapPayload(swapOption)
```

**Slippage calculation logic**:
- **Fixed input mode**: `out_amount_limit = out_amount * (1 - slippage)`
- **Fixed output mode**: `in_amount_limit = in_amount * (1 + slippage)`

### Step 4: Execute Transaction

```typescript
// Simulate transaction verification
const simResult = await sdk.FullClient.sendSimulationTransaction(tx, walletAddress)
if (simResult.effects.status.status === 'success') {
  console.log('Transaction simulation successful')

  // Execute actual transaction (requires wallet signature)
  // const result = await sdk.FullClient.executeTx(keyPair, tx, true)
  // console.log('Transaction execution successful:', result)
} else {
  console.error('Transaction simulation failed:', simResult)
}
```

## Complete Examples

### Example 1: A to B Swap (Fixed Input)

Based on the `swap_a2b` test in `swap.test.ts`:

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'

async function swapA2B() {
  // 1. Initialize
  const sdk = CetusDlmmSDK.createSDK({ env: 'testnet' })
  sdk.setSenderAddress(walletAddress)

  // 2. Get pool information
  const poolId = '0x94088f9a28a6b355ab3569b9cc32895dbccf4c6716f030d59d3f0cf747305ec9'
  const pool = await sdk.Pool.getPool(poolId)
  const { coin_type_a, coin_type_b } = pool

  // 3. Get pre-swap quote
  const by_amount_in = true
  const quote = await sdk.Swap.preSwapQuote({
    pool_id: poolId,
    a2b: true,              // A to B direction
    by_amount_in,
    in_amount: '100000',    // Input amount
    coin_type_a,
    coin_type_b
  })

  console.log('Pre-swap quote:', {
    'Input amount': quote.in_amount,
    'Output amount': quote.out_amount,
    'Total fee': quote.fee_amount,
    'Referral fee': quote.ref_fee_amount,
    'Bin path count': quote.bin_swaps.length
  })

  // 4. Create swap transaction
  const tx = sdk.Swap.swapPayload({
    coin_type_a,
    coin_type_b,
    quote_obj: quote,
    by_amount_in,
    slippage: 0.01          // 1% slippage protection
  })

  // 5. Execute transaction (requires wallet integration)
  // const result = await sdk.FullClient.executeTx(keyPair, tx, true)
  // console.log('Swap successful:', result)

  return tx
}
```

### Example 2: B to A Swap (Fixed Input)

Based on the `swap_b2a` test in `swap.test.ts`:

```typescript
async function swapB2A() {
  const sdk = CetusDlmmSDK.createSDK({ env: 'testnet' })
  sdk.setSenderAddress(walletAddress)

  const poolId = '0x94088f9a28a6b355ab3569b9cc32895dbccf4c6716f030d59d3f0cf747305ec9'
  const pool = await sdk.Pool.getPool(poolId)
  const { coin_type_a, coin_type_b } = pool

  const by_amount_in = true
  const quote = await sdk.Swap.preSwapQuote({
    pool_id: poolId,
    a2b: false,             // B to A direction
    by_amount_in,
    in_amount: '30000000',  // Larger input amount
    coin_type_a,
    coin_type_b
  })

  console.log('B to A swap quote:', quote)

  const tx = sdk.Swap.swapPayload({
    coin_type_a,
    coin_type_b,
    quote_obj: quote,
    by_amount_in,
    slippage: 0.01
  })

  return tx
}
```

### Example 3: Fixed Output Mode Swap

```typescript
async function swapByAmountOut() {
  const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
  sdk.setSenderAddress(walletAddress)

  const poolId = '0x94088f9a28a6b355ab3569b9cc32895dbccf4c6716f030d59d3f0cf747305ec9'
  const pool = await sdk.Pool.getPool(poolId)
  const { coin_type_a, coin_type_b } = pool

  // Fixed output mode: specify desired output amount
  const by_amount_in = false
  const desiredOutput = '50000'  // Desired output amount to obtain

  const quote = await sdk.Swap.preSwapQuote({
    pool_id: poolId,
    a2b: true,                  // A to B direction
    by_amount_in: false,        // Fixed output mode
    in_amount: desiredOutput,   // Note: here we pass the output amount
    coin_type_a,
    coin_type_b
  })

  console.log('Fixed output mode:', {
    'Desired output': desiredOutput,
    'Estimated input': quote.in_amount,
    'Actual output': quote.out_amount,
    'Fee': quote.fee_amount
  })

  const tx = sdk.Swap.swapPayload({
    coin_type_a,
    coin_type_b,
    quote_obj: quote,
    by_amount_in: false,        // Must be consistent with pre-swap quote
    slippage: 0.005             // 0.5% slippage protection (stricter for fixed output mode)
  })

  return tx
}
```

## Advanced Features

### Partner Swaps

If swapping through partner referral, you can enjoy fee discounts and support partner revenue sharing:

```typescript
async function swapWithPartner() {
  const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
  sdk.setSenderAddress(walletAddress)

  const poolId = '0x94088f9a28a6b355ab3569b9cc32895dbccf4c6716f030d59d3f0cf747305ec9'
  const pool = await sdk.Pool.getPool(poolId)
  const { coin_type_a, coin_type_b } = pool

  const partnerAddress = '0xpartner_address_here' // Partner address

  const quote = await sdk.Swap.preSwapQuote({
    pool_id: poolId,
    a2b: true,
    by_amount_in: true,
    in_amount: '100000',
    coin_type_a,
    coin_type_b
  })

  const tx = sdk.Swap.swapPayload({
    coin_type_a,
    coin_type_b,
    quote_obj: quote,
    by_amount_in: true,
    slippage: 0.01,
    partner: partnerAddress  // Specify partner
  })

  console.log('Partner swap transaction created successfully')
  return tx
}
```

### Multi-Bin Route Analysis

Pre-swap quotes contain detailed Bin path information that can be used for analysis and optimization:

```typescript
async function analyzeSwapRoute() {
  const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
  sdk.setSenderAddress(walletAddress)

  const poolId = '0x94088f9a28a6b355ab3569b9cc32895dbccf4c6716f030d59d3f0cf747305ec9'
  const pool = await sdk.Pool.getPool(poolId)
  const { coin_type_a, coin_type_b } = pool

  const quote = await sdk.Swap.preSwapQuote({
    pool_id: poolId,
    a2b: true,
    by_amount_in: true,
    in_amount: '1000000',  // Larger amount, may involve multiple Bins
    coin_type_a,
    coin_type_b
  })

  // Analyze Bin path
  console.log('Swap route analysis:')
  console.log(`Total Bin count: ${quote.bin_swaps.length}`)

  let totalInput = 0
  let totalOutput = 0
  let totalFee = 0

  quote.bin_swaps.forEach((binSwap, index) => {
    console.log(`Bin ${index + 1}:`)
    console.log(`  Bin ID: ${binSwap.bin_id}`)
    console.log(`  Input: ${binSwap.in_amount}`)
    console.log(`  Output: ${binSwap.out_amount}`)
    console.log(`  Fee: ${binSwap.fee_amount}`)

    totalInput += parseInt(binSwap.in_amount)
    totalOutput += parseInt(binSwap.out_amount)
    totalFee += parseInt(binSwap.fee_amount)
  })

  console.log(`Total - Input: ${totalInput}, Output: ${totalOutput}, Fee: ${totalFee}`)

  return quote
}
```

## Parameter Configuration Guide

### 1. Amount Format
- Use **string format** to pass amounts, avoiding JavaScript number precision issues
- Amount unit is **the smallest unit of the token** (consider decimal places)
- Example: For USDC with 6 decimal places, `1 USDC = 1000000`

### 2. Slippage Setting Recommendations
- **Normal market conditions**: 0.5% - 1% (0.005 - 0.01)
- **High volatility markets**: 2% - 5% (0.02 - 0.05)
- **Fixed output mode**: Recommended to use stricter slippage (0.1% - 0.5%)

### 3. Swap Direction Selection
- **A to B**: When you want to exchange Coin A for Coin B
- **B to A**: When you want to exchange Coin B for Coin A
- Ensure direction matches the pool's coin types

### 4. Swap Mode Selection
- **Fixed input (by_amount_in: true)**: Know how much to spend, want to know how much you'll get
- **Fixed output (by_amount_in: false)**: Know how much you need to get, want to know how much to spend

## Error Handling

### Common Errors and Solutions

**1. "Transaction simulation failed"**
- **Cause**: Parameter error, insufficient balance, slippage too small
- **Solution**:
  - Check amount format and direction
  - Confirm wallet has sufficient balance
  - Appropriately increase slippage tolerance
  - Use `preSwapQuote()` to verify quote

**2. "No quote info"**
- **Cause**: Pre-swap quote returned empty
- **Solution**:
  - Check if pool ID is correct
  - Confirm pool has sufficient liquidity
  - Reduce swap amount or try another direction

**3. "Invalid slippage"**
- **Cause**: Invalid slippage parameter
- **Solution**:
  - Ensure slippage value is between 0-1
  - Fixed output mode may require smaller slippage

**4. "Insufficient liquidity"**
- **Cause**: Pool liquidity insufficient
- **Solution**:
  - Reduce swap amount
  - Try another pool with higher liquidity
  - Wait for liquidity to increase

### Debugging Suggestions

```typescript
async function debugSwap() {
  try {
    const sdk = CetusDlmmSDK.createSDK({ env: 'testnet' })
    sdk.setSenderAddress(walletAddress)

    // 1. Verify pool status
    const pool = await sdk.Pool.getPool(poolId)
    console.log('Pool status:', {
      'Active Bin': pool.active_id,
      'Coin A balance': pool.balance_a,
      'Coin B balance': pool.balance_b,
      'Base fee rate': pool.base_fee_rate
    })

    // 2. Get detailed quote
    const quote = await sdk.Swap.preSwapQuote({
      pool_id: poolId,
      a2b: true,
      by_amount_in: true,
      in_amount: '10000', // Use small amount for testing
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b
    })

    console.log('Detailed quote:', JSON.stringify(quote, null, 2))

    // 3. Simulate transaction
    const tx = sdk.Swap.swapPayload({
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b,
      quote_obj: quote,
      by_amount_in: true,
      slippage: 0.05 // Use larger slippage for testing
    })

    const simResult = await sdk.FullClient.sendSimulationTransaction(tx, walletAddress)
    console.log('Simulation result:', simResult)

  } catch (error) {
    console.error('Swap debugging error:', error)
    // Analyze error information, adjust parameters
  }
}
```

## Performance Optimization

### 1. Batch Swaps
For multiple swap operations, consider batch processing:

```typescript
async function batchSwaps() {
  const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
  sdk.setSenderAddress(walletAddress)

  const pool = await sdk.Pool.getPool(poolId)
  const { coin_type_a, coin_type_b } = pool

  // Batch get quotes
  const swapAmounts = ['100000', '200000', '300000']
  const quotes = await Promise.all(
    swapAmounts.map(amount =>
      sdk.Swap.preSwapQuote({
        pool_id: poolId,
        a2b: true,
        by_amount_in: true,
        in_amount: amount,
        coin_type_a,
        coin_type_b
      })
    )
  )

  // Analyze best swap timing
  const bestQuote = quotes.reduce((best, current) =>
    parseInt(current.out_amount) > parseInt(best.out_amount) ? current : best
  )

  console.log('Best swap quote:', bestQuote)
  return bestQuote
}
```

### 2. Cache Pool Information
Avoid repeatedly fetching pool information:

```typescript
class SwapService {
  private poolCache: Map<string, any> = new Map()

  async getPoolWithCache(poolId: string) {
    if (!this.poolCache.has(poolId)) {
      const pool = await sdk.Pool.getPool(poolId)
      this.poolCache.set(poolId, pool)
      // Set cache expiration time (e.g., 5 minutes)
      setTimeout(() => this.poolCache.delete(poolId), 5 * 60 * 1000)
    }
    return this.poolCache.get(poolId)
  }
}
```

### 3. Pre-computation Optimization
For frequent identical swaps, pre-compute and cache results:

```typescript
const swapCache = new Map()

async function getCachedQuote(poolId: string, amount: string, direction: boolean) {
  const cacheKey = `${poolId}-${amount}-${direction}`

  if (!swapCache.has(cacheKey)) {
    const pool = await sdk.Pool.getPool(poolId)
    const quote = await sdk.Swap.preSwapQuote({
      pool_id: poolId,
      a2b: direction,
      by_amount_in: true,
      in_amount: amount,
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b
    })
    swapCache.set(cacheKey, quote)

    // Short-term cache (price may change rapidly)
    setTimeout(() => swapCache.delete(cacheKey), 30 * 1000)
  }

  return swapCache.get(cacheKey)
}
```

## Security Considerations

### 1. Slippage Protection
- Always set reasonable slippage protection
- Monitor market volatility, adjust slippage settings
- Consider using dynamic slippage calculation

### 2. Amount Validation
- Validate input amount effectiveness
- Check if balance is sufficient
- Confirm minimum/maximum swap limits

### 3. Transaction Verification
- Always simulate before executing actual transactions
- Verify transaction results and status
- Monitor gas fees and confirmation time

### 4. Error Recovery
- Implement retry mechanisms
- Provide user-friendly error messages
- Log failed transactions for analysis

## Best Practices

1. **Testnet verification**: First verify complete swap flow on testnet
2. **Progressive amounts**: Start with small amounts, gradually increase
3. **Monitoring logs**: Record key steps and results
4. **User confirmation**: Require user confirmation before important operations
5. **Regular updates**: Follow SDK updates and best practice changes

## Troubleshooting

### Issue: Swap amount too small
**Symptoms**: Swap fails or fee ratio too high
**Solution**:
- Increase swap amount
- Check pool's minimum swap limit
- Consider batching small amount swaps

### Issue: Price impact too high
**Symptoms**: Actual output much lower than expected
**Solution**:
- Reduce single swap amount
- Split into multiple swaps
- Choose pool with higher liquidity

### Issue: Gas fees too high
**Symptoms**: Transaction fees unreasonable
**Solution**:
- Optimize transaction structure
- Choose off-peak hours
- Use gas optimization techniques

---

**Note**: This document is based on Cetus DLMM SDK v1.0.3 and the test file `swap.test.ts`. For actual use, please refer to the latest SDK documentation and test cases.

Swap operations are core functionality of DeFi applications. Proper use of DLMM SDK ensures safe and efficient token exchange experiences. It is recommended to fully test in production environments and monitor key metrics.