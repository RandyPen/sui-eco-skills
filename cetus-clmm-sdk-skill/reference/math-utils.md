# Math Utilities

This guide covers the mathematical utilities provided by `@cetusprotocol/common-sdk` for Cetus CLMM calculations, including price conversions, tick mathematics, liquidity calculations, and slippage handling.

## Overview

The common SDK provides essential mathematical tools for CLMM operations:
- **TickMath**: Conversions between price, sqrt price, and tick index
- **ClmmPoolUtil**: Liquidity and token amount calculations
- **TickUtil**: Tick range and spacing utilities
- **Percentage**: Slippage and percentage calculations
- **MathUtil**: General mathematical operations

## TickMath Utilities

### Price to Sqrt Price Conversion

Convert between price and sqrt price (Q64.64 fixed-point format):

```typescript
import { TickMath } from '@cetusprotocol/common-sdk'
import BN from 'bn.js'

// Convert price to sqrt price
const price = 1.5 // 1 token A = 1.5 token B
const tokenADecimals = 9 // SUI decimals
const tokenBDecimals = 6 // USDC decimals

const sqrtPrice = TickMath.priceToSqrtPriceX64(price, tokenADecimals, tokenBDecimals)
console.log(`Sqrt price for ${price}: ${sqrtPrice.toString()}`)

// Convert sqrt price back to price
const convertedPrice = TickMath.sqrtPriceX64ToPrice(sqrtPrice, tokenADecimals, tokenBDecimals)
console.log(`Price from sqrt price: ${convertedPrice}`)
```

### Tick Index Conversions

Convert between tick index and sqrt price:

```typescript
// Convert tick index to sqrt price
const tickIndex = 1000
const sqrtPriceFromTick = TickMath.tickIndexToSqrtPriceX64(tickIndex)
console.log(`Tick ${tickIndex} -> Sqrt price: ${sqrtPriceFromTick.toString()}`)

// Convert sqrt price to tick index
const sqrtPrice = new BN('79228162514264337593543950336') // sqrt(1.0)
const tickFromSqrtPrice = TickMath.sqrtPriceX64ToTickIndex(sqrtPrice)
console.log(`Sqrt price -> Tick index: ${tickFromSqrtPrice}`)

// Price to tick index (with tick spacing consideration)
const tickFromPrice = TickMath.priceToInitializeTickIndex(
  price,
  tokenADecimals,
  tokenBDecimals,
  10 // tick spacing
)
console.log(`Price ${price} -> Tick index: ${tickFromPrice}`)
```

### Boundary Checks

Check price and tick boundaries:

```typescript
import { MIN_SQRT_PRICE, MAX_SQRT_PRICE, MIN_TICK_INDEX, MAX_TICK_INDEX } from '@cetusprotocol/common-sdk'

console.log(`Min sqrt price: ${MIN_SQRT_PRICE}`)
console.log(`Max sqrt price: ${MAX_SQRT_PRICE}`)
console.log(`Min tick index: ${MIN_TICK_INDEX}`)
console.log(`Max tick index: ${MAX_TICK_INDEX}`)

// Validate tick index
const isValidTick = tickIndex >= MIN_TICK_INDEX && tickIndex <= MAX_TICK_INDEX
console.log(`Tick ${tickIndex} is valid: ${isValidTick}`)
```

## ClmmPoolUtil Calculations

### Token Amounts from Liquidity

Calculate token amounts for given liquidity:

```typescript
import { ClmmPoolUtil, TickMath } from '@cetusprotocol/common-sdk'
import BN from 'bn.js'

async function calculateTokenAmounts() {
  // Get current pool state
  const currentSqrtPrice = new BN('79228162514264337593543950336') // sqrt(1.0)
  const lowerTick = -1000
  const upperTick = 1000
  const liquidity = new BN('1000000000')

  // Convert ticks to sqrt prices
  const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
  const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

  // Calculate token amounts (round up for maximum amounts)
  const tokenAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
    liquidity,
    currentSqrtPrice,
    lowerSqrtPrice,
    upperSqrtPrice,
    true // round_up
  )

  console.log('Token amounts for liquidity:')
  console.log(`- Token A: ${tokenAmounts.coin_amount_a}`)
  console.log(`- Token B: ${tokenAmounts.coin_amount_b}`)

  return tokenAmounts
}
```

### Estimate Liquidity from Token Amounts

Estimate liquidity required for specific token amounts:

```typescript
async function estimateLiquidity() {
  const currentSqrtPrice = new BN('79228162514264337593543950336')
  const lowerTick = -500
  const upperTick = 500

  const tokenAmounts = {
    coin_amount_a: '1000000000', // 1 SUI
    coin_amount_b: '1000000'     // 1 USDC
  }

  const estimatedLiquidity = ClmmPoolUtil.estimateLiquidityFromCoinAmounts(
    currentSqrtPrice,
    lowerTick,
    upperTick,
    tokenAmounts
  )

  console.log(`Estimated liquidity: ${estimatedLiquidity}`)
  return estimatedLiquidity
}
```

### Fixed Token Amount Calculations

Calculate liquidity and other token amount when fixing one token:

```typescript
import { Percentage, d } from '@cetusprotocol/common-sdk'

async function calculateWithFixedToken() {
  const lowerTick = -60000
  const upperTick = 60000
  const coinAmount = new BN('1000000000') // 1 SUI
  const isCoinA = true // Fixed token A amount
  const roundUp = true // For adding liquidity
  const slippage = 0.01 // 1% slippage
  const currentSqrtPrice = new BN('79228162514264337593543950336')

  const result = ClmmPoolUtil.estLiquidityAndCoinAmountFromOneAmounts(
    lowerTick,
    upperTick,
    coinAmount,
    isCoinA,
    roundUp,
    slippage,
    currentSqrtPrice
  )

  console.log('Fixed token calculation results:')
  console.log(`- Liquidity: ${result.liquidity_amount}`)
  console.log(`- Token A amount: ${result.coin_amount_a}`)
  console.log(`- Token B amount: ${result.coin_amount_b}`)
  console.log(`- Token A limit (with slippage): ${result.coin_amount_limit_a}`)
  console.log(`- Token B limit (with slippage): ${result.coin_amount_limit_b}`)
  console.log(`- Fixed token A: ${result.fix_amount_a}`)

  return result
}
```

## TickUtil Utilities

### Tick Spacing and Ranges

Work with tick spacing and valid tick ranges:

```typescript
import { TickUtil } from '@cetusprotocol/common-sdk'

const tickSpacing = 10

// Get valid tick range for given spacing
const minTick = TickUtil.getMinIndex(tickSpacing)
const maxTick = TickUtil.getMaxIndex(tickSpacing)

console.log(`Tick spacing: ${tickSpacing}`)
console.log(`Valid tick range: ${minTick} to ${maxTick}`)

// Find nearest valid tick
const desiredTick = 123
const nearestTick = getNearestTickByTick(desiredTick, tickSpacing)
console.log(`Desired tick: ${desiredTick}, Nearest valid tick: ${nearestTick}`)
```

### Tick Side Detection

Determine position relative to tick range:

```typescript
function analyzeTickPosition(currentTick: number, lowerTick: number, upperTick: number) {
  const position = getTickSide(currentTick, lowerTick, upperTick)

  switch (position) {
    case 'inRange':
      console.log('Current tick is within position range')
      break
    case 'left':
      console.log('Current tick is below position range')
      break
    case 'right':
      console.log('Current tick is above position range')
      break
  }

  return position
}

// Example usage
const currentTick = 500
const lowerTick = -1000
const upperTick = 1000

analyzeTickPosition(currentTick, lowerTick, upperTick)
```

## Percentage and Slippage

### Percentage Calculations

Create and work with percentage values:

```typescript
import { Percentage } from '@cetusprotocol/common-sdk'
import BN from 'bn.js'

// Create percentage from fraction
const slippage = new Percentage(new BN(5), new BN(1000)) // 0.5%
console.log(`Slippage: ${slippage.toString()}`)

// Create percentage from decimal
const decimalSlippage = Percentage.fromDecimal(d(0.5)) // 0.5%
console.log(`Decimal slippage: ${decimalSlippage.toString()}`)

// Convert to decimal
const decimalValue = decimalSlippage.toDecimal()
console.log(`Decimal value: ${decimalValue.toString()}`)

// Create from fraction with numbers
const fee = Percentage.fromFraction(3, 1000) // 0.3%
console.log(`Fee percentage: ${fee.toString()}`)
```

### Slippage Adjustments

Adjust amounts for slippage tolerance:

```typescript
import { adjustForSlippage, adjustForCoinSlippage } from '@cetusprotocol/common-sdk'

// Adjust single amount
const amount = new BN('1000000000')
const slippage = new Percentage(new BN(5), new BN(1000)) // 0.5%

// Adjust up (for maximum input/minimum output)
const adjustedUp = adjustForSlippage(amount, slippage, true)
console.log(`Amount adjusted up: ${adjustedUp.toString()}`)

// Adjust down (for minimum input/maximum output)
const adjustedDown = adjustForSlippage(amount, slippage, false)
console.log(`Amount adjusted down: ${adjustedDown.toString()}`)

// Adjust token pair amounts
const tokenAmounts = {
  coin_amount_a: '1000000000',
  coin_amount_b: '50000000'
}

const adjustedTokens = adjustForCoinSlippage(tokenAmounts, slippage, true)
console.log('Adjusted token amounts:')
console.log(`- Token A: ${adjustedTokens.coin_amount_limit_a}`)
console.log(`- Token B: ${adjustedTokens.coin_amount_limit_b}`)
```

## Core CLMM Mathematical Functions

### Delta Calculations

Calculate token deltas between prices:

```typescript
import { getDeltaA, getDeltaB } from '@cetusprotocol/common-sdk'

function calculateTokenDeltas() {
  const sqrtPrice0 = new BN('79228162514264337593543950336') // sqrt(1.0)
  const sqrtPrice1 = new BN('79236085330515764027303304731') // sqrt(1.0001)
  const liquidity = new BN('1000000000')

  // Calculate token A delta (round up for maximum)
  const deltaA = getDeltaA(sqrtPrice0, sqrtPrice1, liquidity, true)
  console.log(`Token A delta: ${deltaA.toString()}`)

  // Calculate token B delta (round up for maximum)
  const deltaB = getDeltaB(sqrtPrice0, sqrtPrice1, liquidity, true)
  console.log(`Token B delta: ${deltaB.toString()}`)

  return { deltaA, deltaB }
}
```

### Next Sqrt Price Calculations

Calculate next sqrt price from token amount:

```typescript
import {
  getNextSqrtPriceFromInput,
  getNextSqrtPriceFromOutput,
  getNextSqrtPriceAUp,
  getNextSqrtPriceBDown
} from '@cetusprotocol/common-sdk'

function calculateNextPrices() {
  const currentSqrtPrice = new BN('79228162514264337593543950336')
  const liquidity = new BN('1000000000')
  const amount = new BN('1000000') // 0.001 token

  // From input (swapping in)
  const nextFromInput = getNextSqrtPriceFromInput(currentSqrtPrice, liquidity, amount, true)
  console.log(`Next sqrt price from input: ${nextFromInput.toString()}`)

  // From output (swapping out)
  const nextFromOutput = getNextSqrtPriceFromOutput(currentSqrtPrice, liquidity, amount, true)
  console.log(`Next sqrt price from output: ${nextFromOutput.toString()}`)

  // Direct calculations
  const nextAUp = getNextSqrtPriceAUp(currentSqrtPrice, liquidity, amount, true)
  const nextBDown = getNextSqrtPriceBDown(currentSqrtPrice, liquidity, amount, true)

  console.log(`Next A up: ${nextAUp.toString()}`)
  console.log(`Next B down: ${nextBDown.toString()}`)

  return { nextFromInput, nextFromOutput, nextAUp, nextBDown }
}
```

### Liquidity Estimation

Estimate liquidity from token amounts:

```typescript
import { estimateLiquidityForCoinA, estimateLiquidityForCoinB } from '@cetusprotocol/common-sdk'

function estimateLiquidity() {
  const sqrtPriceX = new BN('79228162514264337593543950336')
  const sqrtPriceY = new BN('79236085330515764027303304731')
  const coinAmount = new BN('1000000000')

  // Estimate liquidity for token A
  const liquidityA = estimateLiquidityForCoinA(sqrtPriceX, sqrtPriceY, coinAmount)
  console.log(`Liquidity for token A: ${liquidityA.toString()}`)

  // Estimate liquidity for token B
  const liquidityB = estimateLiquidityForCoinB(sqrtPriceX, sqrtPriceY, coinAmount)
  console.log(`Liquidity for token B: ${liquidityB.toString()}`)

  return { liquidityA, liquidityB }
}
```

## MathUtil General Utilities

### Mathematical Operations

General mathematical utilities:

```typescript
import { MathUtil, ONE, ZERO, U64_MAX } from '@cetusprotocol/common-sdk'

// Check multiplication with overflow protection
const a = new BN('1000000000')
const b = new BN('2000000000')
const product = MathUtil.checkMul(a, b, 128)
console.log(`Checked product: ${product.toString()}`)

// Division with rounding
const numerator = new BN('1000000000000')
const denominator = new BN('3')
const roundedUp = MathUtil.checkDivRoundUpIf(numerator, denominator, true)
const roundedDown = MathUtil.checkDivRoundUpIf(numerator, denominator, false)
console.log(`Rounded up: ${roundedUp.toString()}, Rounded down: ${roundedDown.toString()}`)

// Shift left with checking
const shifted = MathUtil.checkMulShiftLeft(a, b, 64, 256)
console.log(`Shifted result: ${shifted.toString()}`)

// Overflow checking
const isOverflow = MathUtil.isOverflow(product, 64)
console.log(`Overflow 64-bit: ${isOverflow}`)
```

### Decimal Conversions

Convert between decimal and fixed-point formats:

```typescript
// Convert from X64 format
const x64Value = new BN('79228162514264337593543950336')
const decimalValue = MathUtil.fromX64(x64Value)
console.log(`X64 to decimal: ${decimalValue}`)

// Convert to X64 format
const backToX64 = MathUtil.toX64(decimalValue)
console.log(`Decimal to X64: ${backToX64.toString()}`)

// Decimal.js conversions
const decimal = d('1.5')
const x64Decimal = MathUtil.toX64Decimal(decimal)
const fromX64Decimal = MathUtil.fromX64Decimal(x64Decimal)
console.log(`Decimal conversions: ${decimal} -> ${fromX64Decimal.toString()}`)
```

## Practical Examples

### Calculate Optimal Tick Range

Determine optimal tick range based on price and strategy:

```typescript
import { TickMath, TickUtil } from '@cetusprotocol/common-sdk'

function calculateOptimalRange(
  currentPrice: number,
  strategy: 'tight' | 'medium' | 'wide',
  tokenADecimals: number,
  tokenBDecimals: number,
  tickSpacing: number = 10
) {
  // Convert price to tick
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

  // Calculate raw ticks
  const lowerTick = currentTick - tickRange
  const upperTick = currentTick + tickRange

  // Adjust to valid ticks
  const adjustedLower = TickUtil.getNearestTickByTick(lowerTick, tickSpacing)
  const adjustedUpper = TickUtil.getNearestTickByTick(upperTick, tickSpacing)

  // Convert to prices for display
  const lowerPrice = TickMath.tickIndexToPrice(adjustedLower, tokenADecimals, tokenBDecimals)
  const upperPrice = TickMath.tickIndexToPrice(adjustedUpper, tokenADecimals, tokenBDecimals)

  console.log(`Optimal range for ${strategy} strategy:`)
  console.log(`- Ticks: ${adjustedLower} to ${adjustedUpper}`)
  console.log(`- Prices: ${lowerPrice.toFixed(6)} to ${upperPrice.toFixed(6)}`)
  console.log(`- Current price: ${currentPrice} (tick ${currentTick})`)

  return {
    lowerTick: adjustedLower,
    upperTick: adjustedUpper,
    lowerPrice,
    upperPrice,
    tickRange
  }
}
```

### Slippage Protection for Swaps

Calculate amount limits with slippage protection:

```typescript
import { Percentage, d, adjustForSlippage } from '@cetusprotocol/common-sdk'

function calculateSwapLimits(
  estimatedAmount: string,
  isInput: boolean,
  slippageTolerance: number = 0.5 // 0.5%
) {
  const amount = new BN(estimatedAmount)
  const slippage = Percentage.fromDecimal(d(slippageTolerance))

  // For input amount: adjust down for maximum input
  // For output amount: adjust up for minimum output
  const adjustUp = !isInput

  const limit = adjustForSlippage(amount, slippage, adjustUp)

  console.log(`Swap amount calculation:`)
  console.log(`- Estimated: ${amount.toString()}`)
  console.log(`- Is input: ${isInput}`)
  console.log(`- Slippage: ${slippageTolerance}%`)
  console.log(`- Limit: ${limit.toString()}`)

  return limit.toString()
}
```

### Liquidity Position Analysis

Analyze liquidity position metrics:

```typescript
import { ClmmPoolUtil, TickMath } from '@cetusprotocol/common-sdk'

async function analyzePosition(
  poolSqrtPrice: BN,
  positionLowerTick: number,
  positionUpperTick: number,
  positionLiquidity: BN
) {
  // Convert ticks to sqrt prices
  const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(positionLowerTick)
  const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(positionUpperTick)

  // Calculate token amounts
  const tokenAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
    positionLiquidity,
    poolSqrtPrice,
    lowerSqrtPrice,
    upperSqrtPrice,
    false // round down for current value
  )

  // Calculate position value (simplified)
  const currentTick = TickMath.sqrtPriceX64ToTickIndex(poolSqrtPrice)
  const isInRange = currentTick >= positionLowerTick && currentTick <= positionUpperTick

  console.log('Position Analysis:')
  console.log(`- Lower tick: ${positionLowerTick}`)
  console.log(`- Upper tick: ${positionUpperTick}`)
  console.log(`- Current tick: ${currentTick}`)
  console.log(`- In range: ${isInRange}`)
  console.log(`- Liquidity: ${positionLiquidity.toString()}`)
  console.log(`- Token A amount: ${tokenAmounts.coin_amount_a}`)
  console.log(`- Token B amount: ${tokenAmounts.coin_amount_b}`)

  return {
    tokenAmounts,
    isInRange,
    currentTick
  }
}
```

## Best Practices

### 1. Use Appropriate Precision
Always use the correct decimal places for token amounts:

```typescript
function formatTokenAmount(amount: string, decimals: number): string {
  // Convert from base units to human-readable
  const divisor = new BN(10).pow(new BN(decimals))
  const formatted = new BN(amount).div(divisor).toString()
  return formatted
}

// Example: SUI has 9 decimals
const suiAmount = '1000000000' // 1 SUI in base units
console.log(`Human readable: ${formatTokenAmount(suiAmount, 9)} SUI`)
```

### 2. Validate Calculations
Always validate mathematical operations:

```typescript
import { MathUtil } from '@cetusprotocol/common-sdk'

function safeMultiply(a: BN, b: BN): BN {
  try {
    return MathUtil.checkMul(a, b, 256)
  } catch (error) {
    console.error('Multiplication overflow:', error)
    // Handle overflow appropriately
    return new BN(0)
  }
}
```

### 3. Handle Edge Cases
Consider edge cases in calculations:

```typescript
function calculateWithBounds(
  value: BN,
  minValue: BN,
  maxValue: BN
): BN {
  if (value.lt(minValue)) return minValue
  if (value.gt(maxValue)) return maxValue
  return value
}

// Example: Bound sqrt price
const sqrtPrice = new BN('80000000000000000000')
const bounded = calculateWithBounds(
  sqrtPrice,
  new BN(MIN_SQRT_PRICE),
  new BN(MAX_SQRT_PRICE)
)
```

### 4. Cache Expensive Calculations
Cache results of expensive calculations:

```typescript
const tickToSqrtPriceCache = new Map<number, BN>()

function getCachedSqrtPrice(tick: number): BN {
  if (!tickToSqrtPriceCache.has(tick)) {
    tickToSqrtPriceCache.set(tick, TickMath.tickIndexToSqrtPriceX64(tick))
  }
  return tickToSqrtPriceCache.get(tick)!
}
```

## Common Issues and Solutions

### Precision Loss
**Problem**: Calculations lose precision with large numbers.
**Solution**:
- Use BN for integer arithmetic
- Maintain sufficient bit width (256-bit for most calculations)
- Use Decimal.js for decimal calculations

### Overflow Errors
**Problem**: Calculations overflow 64-bit or 128-bit limits.
**Solution**:
- Use `MathUtil.checkMul` for multiplication
- Validate inputs before calculations
- Use appropriate bit width for operations

### Invalid Tick Values
**Problem**: Tick index is outside valid range or not aligned with spacing.
**Solution**:
- Use `TickUtil.getNearestTickByTick` to align ticks
- Validate against `MIN_TICK_INDEX` and `MAX_TICK_INDEX`
- Check tick spacing requirements

### Slippage Calculation Errors
**Problem**: Slippage calculations produce incorrect limits.
**Solution**:
- Verify `adjust_up` parameter logic
- Use `Percentage.fromDecimal` for precise slippage
- Test with edge cases (0% slippage, 100% slippage)

## Next Steps

After mastering math utilities, you may want to:
- **Optimize calculations**: Implement caching for frequently used values
- **Build analytics**: Use these utilities for position analysis and risk assessment
- **Create simulators**: Build trading simulators using the mathematical models
- **Implement advanced strategies**: Develop complex liquidity provision strategies