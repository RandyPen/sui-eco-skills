# Liquidity Management

This guide covers all aspects of liquidity management in Cetus CLMM, including adding/removing liquidity, opening/closing positions, and related calculations.

## Overview

Liquidity management in CLMM involves:
- **Adding liquidity**: Depositing tokens into existing positions
- **Removing liquidity**: Withdrawing tokens from positions
- **Opening positions**: Creating new liquidity positions
- **Closing positions**: Removing and collecting from positions
- **Position management**: Querying and updating position information

## Key Concepts

### Liquidity Positions
A liquidity position represents your share of a pool within a specific price range (defined by tick lower and upper bounds). Positions earn trading fees and rewards proportional to their liquidity contribution.

### Ticks and Price Ranges
- **Tick lower/upper**: Define the price range where your liquidity is active
- **Current tick**: The pool's current price expressed as a tick index
- **Active liquidity**: Liquidity that earns fees within the current price range

### Liquidity Amounts
- **Delta liquidity**: The amount of liquidity to add or remove
- **Token amounts**: Calculated based on current price, tick range, and liquidity

## Adding Liquidity

### Basic Add Liquidity

Add liquidity to an existing position:

```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'
import { TickMath } from '@cetusprotocol/common-sdk'

async function addLiquidity() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Parameters for adding liquidity
  const params = {
    // Pool and token information
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    pool_id: '0x...',

    // Position information
    pos_id: '0x...', // Existing position ID
    tick_lower: '-60000', // Lower tick bound
    tick_upper: '60000',  // Upper tick bound

    // Liquidity and amount limits
    delta_liquidity: '1000000000', // Liquidity amount to add
    max_amount_a: '1000000000',    // Maximum token A to spend
    max_amount_b: '50000000',      // Maximum token B to spend

    // Optional: collect fees and rewards
    collect_fee: false,
    rewarder_coin_types: []
  }

  // Create transaction payload
  const payload = await sdk.Position.createAddLiquidityPayload(params)

  // Execute transaction (requires keypair)
  // const result = await sdk.FullClient.executeTx(keypair, payload, true)
  return payload
}
```

### Calculate Liquidity Requirements

Use `@cetusprotocol/common-sdk` utilities to calculate required token amounts:

```typescript
import { TickMath, ClmmPoolUtil, Percentage } from '@cetusprotocol/common-sdk'
import BN from 'bn.js'

async function calculateAddLiquidity(
  pool: any, // Pool object from sdk.Pool.getPool()
  lowerTick: number,
  upperTick: number,
  liquidityAmount: string
) {
  // Convert ticks to sqrt prices
  const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
  const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)
  const currentSqrtPrice = new BN(pool.current_sqrt_price)

  // Calculate token amounts for given liquidity
  const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
    new BN(liquidityAmount),
    currentSqrtPrice,
    lowerSqrtPrice,
    upperSqrtPrice,
    false // round_up parameter
  )

  // Apply slippage tolerance (e.g., 1%)
  const slippage = new Percentage(new BN(1), new BN(100))
  const adjustedAmounts = ClmmPoolUtil.adjustForCoinSlippage(
    coinAmounts,
    slippage,
    true // adjust_up for maximum amounts
  )

  return {
    tokenAAmount: adjustedAmounts.coin_amount_limit_a,
    tokenBAmount: adjustedAmounts.coin_amount_limit_b,
    calculatedAmounts: coinAmounts
  }
}
```

### Add Liquidity with Fixed Token Amount

Add liquidity with a fixed amount of one token:

```typescript
async function addLiquidityFixToken() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const params = {
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',
    pool_id: '0x...',
    tick_lower: '-60000',
    tick_upper: '60000',
    amount: '1000000000', // Fixed token amount
    fix_amount_a: true,   // true = fixed token A, false = fixed token B
    is_open: false,       // false = add to existing position
    pos_id: '0x...',      // Existing position ID
    collect_fee: false,
    rewarder_coin_types: []
  }

  // This method calculates the other token amount automatically
  const payload = await sdk.Position.createAddLiquidityFixTokenPayload(params)
  return payload
}
```

## Removing Liquidity

### Basic Remove Liquidity

Remove liquidity from a position:

```typescript
async function removeLiquidity() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const params = {
    // Pool and token information
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',
    pool_id: '0x...',
    pos_id: '0x...',

    // Liquidity to remove and minimum amounts
    delta_liquidity: '500000000', // Half of the liquidity
    min_amount_a: '450000000',    // Minimum token A to receive
    min_amount_b: '20000000',     // Minimum token B to receive

    // Optional: return coins directly
    is_return_coins: true,

    // Optional: collect rewards
    rewarder_coin_types: []
  }

  const payload = await sdk.Position.removeLiquidityPayload(params)
  return payload
}
```

### Calculate Removal Amounts

Calculate token amounts when removing liquidity:

```typescript
async function calculateRemoveLiquidity(
  pool: any,
  position: any,
  liquidityToRemove: string
) {
  const lowerTick = Number(position.tick_lower_index)
  const upperTick = Number(position.tick_upper_index)
  const currentSqrtPrice = new BN(pool.current_sqrt_price)

  const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
  const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

  // Calculate token amounts for the liquidity to remove
  const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
    new BN(liquidityToRemove),
    currentSqrtPrice,
    lowerSqrtPrice,
    upperSqrtPrice,
    true // round_up for removal (get maximum possible)
  )

  // Apply slippage tolerance for minimum amounts
  const slippage = new Percentage(new BN(1), new BN(100))
  const adjustedAmounts = ClmmPoolUtil.adjustForCoinSlippage(
    coinAmounts,
    slippage,
    false // adjust_down for minimum amounts
  )

  return {
    minTokenA: adjustedAmounts.coin_amount_limit_a,
    minTokenB: adjustedAmounts.coin_amount_limit_b,
    calculatedAmounts: coinAmounts
  }
}
```

## Opening Positions

### Open New Position

Create a new liquidity position:

```typescript
async function openPosition() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const params = {
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',
    pool_id: '0x...',
    tick_lower: '-60000', // Price range lower bound
    tick_upper: '60000'   // Price range upper bound
  }

  const payload = sdk.Position.openPositionPayload(params)
  return payload
}
```

### Open Position with Initial Liquidity

Open a position and add initial liquidity in one transaction:

```typescript
async function openPositionWithLiquidity() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // First, open the position
  const openParams = {
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',
    pool_id: '0x...',
    tick_lower: '-60000',
    tick_upper: '60000'
  }

  const tx = sdk.Position.openPositionPayload(openParams)

  // Then add liquidity to the new position
  // Note: In practice, you might need to get the new position ID
  // This is a simplified example
  const addParams = {
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',
    pool_id: '0x...',
    pos_id: '0x...', // Would be the new position ID
    tick_lower: '-60000',
    tick_upper: '60000',
    delta_liquidity: '1000000000',
    max_amount_a: '1000000000',
    max_amount_b: '50000000',
    collect_fee: false,
    rewarder_coin_types: []
  }

  await sdk.Position.createAddLiquidityPayload(addParams, tx)
  return tx
}
```

### Calculate Optimal Price Range

Determine optimal tick range based on trading strategy:

```typescript
import { TickMath, TickUtil } from '@cetusprotocol/common-sdk'

function calculateOptimalTicks(
  currentPrice: number,
  strategy: 'tight' | 'medium' | 'wide' = 'medium'
) {
  const currentTick = TickMath.priceToTickIndex(
    currentPrice,
    9, // token A decimals
    6  // token B decimals
  )

  let tickRange: number
  switch (strategy) {
    case 'tight':
      tickRange = 100 // ±0.1% range
      break
    case 'medium':
      tickRange = 1000 // ±1% range
      break
    case 'wide':
      tickRange = 10000 // ±10% range
      break
  }

  const lowerTick = currentTick - tickRange
  const upperTick = currentTick + tickRange

  // Ensure ticks are valid and consider tick spacing
  const tickSpacing = 1 // Pool tick spacing
  const adjustedLower = TickUtil.getNearestTickByTick(lowerTick, tickSpacing)
  const adjustedUpper = TickUtil.getNearestTickByTick(upperTick, tickSpacing)

  return {
    lowerTick: adjustedLower,
    upperTick: adjustedUpper,
    rangePercent: (tickRange * 2) / 10000 // Approximate percentage
  }
}
```

## Closing Positions

### Close Position

Close a position and collect remaining tokens:

```typescript
async function closePosition() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const params = {
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',
    pool_id: '0x...',
    pos_id: '0x...',

    // Minimum amounts to receive
    min_amount_a: '800000000',
    min_amount_b: '40000000',

    // Optional: collect rewards
    rewarder_coin_types: []
  }

  const payload = await sdk.Position.closePositionPayload(params)
  return payload
}
```

### Close Position with Fee Collection

Close position and collect accumulated fees:

```typescript
async function closePositionWithFees() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // First, collect fees from the position
  const feeParams = {
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',
    pool_id: '0x...',
    pos_id: '0x...',
    collect_fee: true
  }

  const tx = await sdk.Position.collectFeePayload(feeParams)

  // Then close the position
  const closeParams = {
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',
    pool_id: '0x...',
    pos_id: '0x...',
    min_amount_a: '800000000',
    min_amount_b: '40000000',
    rewarder_coin_types: []
  }

  await sdk.Position.closePositionPayload(closeParams, tx)
  return tx
}
```

## Position Management

### Get Position Information

Query position details:

```typescript
async function getPositionInfo(sdk: CetusClmmSDK, positionId: string) {
  try {
    // Get basic position information
    const position = await sdk.Position.getPositionById(positionId)

    console.log('Position Details:')
    console.log(`- ID: ${position.pos_object_id}`)
    console.log(`- Pool: ${position.pool}`)
    console.log(`- Liquidity: ${position.liquidity}`)
    console.log(`- Tick Range: ${position.tick_lower_index} to ${position.tick_upper_index}`)
    console.log(`- Token A: ${position.coin_type_a}`)
    console.log(`- Token B: ${position.coin_type_b}`)

    // Check if position is in range
    const pool = await sdk.Pool.getPool(position.pool)
    const currentTick = TickMath.sqrtPriceX64ToTickIndex(new BN(pool.current_sqrt_price))

    const positionStatus = ClmmPoolUtil.getPositionStatus(
      currentTick,
      Number(position.tick_lower_index),
      Number(position.tick_upper_index)
    )

    console.log(`- Status: ${positionStatus}`) // BelowRange, InRange, or AboveRange

    return position
  } catch (error) {
    console.error('Failed to get position info:', error)
    throw error
  }
}
```

### List Account Positions

Get all positions for an account:

```typescript
async function listAccountPositions(sdk: CetusClmmSDK, accountAddress: string) {
  try {
    const positions = await sdk.Position.getPositionList(accountAddress)

    console.log(`Found ${positions.length} positions:`)
    positions.forEach((position, index) => {
      console.log(`${index + 1}. ${position.pos_object_id}`)
      console.log(`   Pool: ${position.pool}`)
      console.log(`   Liquidity: ${position.liquidity}`)
      console.log(`   Range: ${position.tick_lower_index} to ${position.tick_upper_index}`)
    })

    return positions
  } catch (error) {
    console.error('Failed to list positions:', error)
    return []
  }
}
```

### Update Position Information

Refresh position data (useful after transactions):

```typescript
async function updatePositionInfo(sdk: CetusClmmSDK, positionId: string) {
  try {
    const updatedPosition = await sdk.Position.updatePositionInfo(positionId)
    console.log('Position updated successfully')
    return updatedPosition
  } catch (error) {
    console.error('Failed to update position:', error)
    throw error
  }
}
```

## Fee Collection

### Collect Fees from Position

Collect accumulated trading fees:

```typescript
async function collectFees() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const params = {
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',
    pool_id: '0x...',
    pos_id: '0x...',
    collect_fee: true
  }

  const payload = await sdk.Position.collectFeePayload(params)
  return payload
}
```

### Check Fee Amounts

Check accumulated fees before collection:

```typescript
async function checkFeeAmounts(sdk: CetusClmmSDK, positionId: string) {
  try {
    const position = await sdk.Position.getPositionById(positionId)
    const pool = await sdk.Pool.getPool(position.pool)

    const feeParams = {
      pool_id: pool.id,
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b,
      pos_id: positionId
    }

    const feeAmounts = await sdk.Position.fetchPosFeeAmount(feeParams)

    console.log('Accumulated Fees:')
    console.log(`- Token A: ${feeAmounts.fee_a_amount}`)
    console.log(`- Token B: ${feeAmounts.fee_b_amount}`)

    return feeAmounts
  } catch (error) {
    console.error('Failed to fetch fee amounts:', error)
    throw error
  }
}
```

## Best Practices

### 1. Slippage Protection
Always use appropriate slippage tolerance when adding/removing liquidity:
```typescript
// Recommended: 0.5-1% for stable pairs, 1-3% for volatile pairs
const slippage = new Percentage(new BN(5), new BN(1000)) // 0.5%
```

### 2. Gas Estimation
Estimate gas before executing transactions:
```typescript
async function estimateGas(payload: any) {
  try {
    const dryRunResult = await sdk.FullClient.dryRunTransaction(payload)
    return dryRunResult.effects.gasUsed
  } catch (error) {
    console.error('Gas estimation failed:', error)
    return null
  }
}
```

### 3. Position Monitoring
Regularly monitor position status and adjust as needed:
- Check if position is still in range
- Monitor accumulated fees and rewards
- Consider rebalancing if price moves significantly

### 4. Error Handling
Implement robust error handling:
```typescript
async function safeLiquidityOperation(operation: () => Promise<any>) {
  try {
    return await operation()
  } catch (error: any) {
    if (error.message?.includes('insufficient balance')) {
      console.error('Insufficient token balance')
    } else if (error.message?.includes('position not found')) {
      console.error('Position does not exist')
    } else if (error.message?.includes('out of range')) {
      console.error('Position is out of price range')
    } else {
      console.error('Operation failed:', error)
    }
    throw error
  }
}
```

## Common Issues and Solutions

### Insufficient Liquidity Error
**Problem**: `createAddLiquidityPayload` fails with insufficient liquidity error.
**Solution**:
- Verify position exists and is accessible
- Check tick range matches position's range
- Ensure you're not trying to add more liquidity than available

### Position Not Found
**Problem**: Position ID is invalid or position doesn't exist.
**Solution**:
- Verify position ID format and ownership
- Check if position was closed or removed
- Use `sdk.Position.getPositionById()` to validate

### Out of Range Position
**Problem**: Position is no longer in the active price range.
**Solution**:
- Check current pool price vs position range
- Consider closing position and opening new one
- Or wait for price to return to range

### Transaction Timeout
**Problem**: Transaction takes too long or times out.
**Solution**:
- Increase gas budget
- Check network congestion
- Retry with higher priority fee

## Next Steps

After managing liquidity, you may want to:
- **Collect rewards**: See [Rewards Management](rewards-management.md)
- **Monitor positions**: Implement position tracking
- **Optimize strategies**: Adjust ranges based on market conditions
- **Explore advanced features**: Check pool and swap operations guides