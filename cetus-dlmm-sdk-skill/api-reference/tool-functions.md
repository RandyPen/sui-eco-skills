# Tool Functions Reference

Cetus DLMM SDK provides a rich set of tool functions for price calculation, fee calculation, and liquidity math. These functions are located in different modules and can be imported as needed.

## Overview

Tool functions are divided into the following categories:

1. **BinUtils**: Price to Bin ID conversion, liquidity calculation (located in `@cetusprotocol/dlmm-sdk/utils`)
2. **FeeUtils**: Fee calculation, protocol fee distribution (located in `@cetusprotocol/dlmm-sdk/utils`)

## Import Methods

```typescript
// Import DLMM SDK tool functions
import { BinUtils, FeeUtils } from '@cetusprotocol/dlmm-sdk/utils'
```

## BinUtils

BinUtils provides tools for price to Bin ID conversion, liquidity calculation, and position management.

### Core Functions

#### 1. Price to Bin ID Conversion

**`getBinIdFromPrice(price, binStep, min, decimal_a, decimal_b)`**
- **Function**: Calculate the corresponding Bin ID based on price
- **Parameters**:
  - `price`: Price (string format)
  - `binStep`: Bin step (basis points)
  - `min`: Whether to use the minimum Bin ID (boolean, true means floor, false means ceil)
  - `decimal_a`: Decimal places of Coin A
  - `decimal_b`: Decimal places of Coin B
- **Returns**: Bin ID (number)

**Example**:
```typescript
const binId = BinUtils.getBinIdFromPrice('1.05', 10, true, 9, 6)
// Result: 12345 (example value, actual determined by calculation)
```

**`getPriceFromBinId(bin_id, bin_step, decimal_a, decimal_b)`**
- **Function**: Calculate price based on Bin ID
- **Parameters**:
  - `bin_id`: Bin ID
  - `bin_step`: Bin step
  - `decimal_a`: Decimal places of Coin A
  - `decimal_b`: Decimal places of Coin B
- **Returns**: Price (string format)

**Example**:
```typescript
const price = BinUtils.getPriceFromBinId(12345, 10, 9, 6)
// Result: '1.05' (example value, actual determined by calculation)
```

**`getQPriceFromId(binId, binStep)`**
- **Function**: Get the QPrice of a Bin (Q64x64 format)
- **Parameters**:
  - `binId`: Bin ID
  - `binStep`: Bin step
- **Returns**: QPrice (string format)

**Example**:
```typescript
const qPrice = BinUtils.getQPriceFromId(12345, 10)
// Result: '12345678901234567890' (Q64x64 format)
```

#### 2. Liquidity Calculation

**`getLiquidity(amount_a, amount_b, qPrice)`**
- **Function**: Calculate liquidity based on two-token amounts and QPrice
- **Parameters**:
  - `amount_a`: Coin A amount (string format)
  - `amount_b`: Coin B amount (string format)
  - `qPrice`: QPrice (Q64x64 format)
- **Returns**: Liquidity value (string format)

**Example**:
```typescript
const liquidity = BinUtils.getLiquidity('1000000', '1200000', qPrice)
```

**`getAmountsFromLiquidity(amount_a, amount_b, delta_liquidity, liquidity_supply)`**
- **Function**: Calculate two-token amount changes based on liquidity change
- **Parameters**:
  - `amount_a`: Current Coin A amount
  - `amount_b`: Current Coin B amount
  - `delta_liquidity`: Liquidity change amount
  - `liquidity_supply`: Total liquidity supply
- **Returns**: `[amount_a_out, amount_b_out]` tuple

**Example**:
```typescript
const [amountAOut, amountBOut] = BinUtils.getAmountsFromLiquidity(
  '1000000', '1200000', '500000', '10000000'
)
```

#### 3. Position Management

**`splitBinLiquidityInfo(liquidity_bins, lower_bin_id, upper_bin_id)`**
- **Function**: Split liquidity bins into multiple positions (max 1000 bins per position)
- **Parameters**:
  - `liquidity_bins`: Liquidity bin information
  - `lower_bin_id`: Lower bound Bin ID
  - `upper_bin_id`: Upper bound Bin ID
- **Returns**: Array of split positions

**Example**:
```typescript
const splitPositions = BinUtils.splitBinLiquidityInfo(binInfos, lowerBinId, upperBinId)
```

**`getPositionCount(lower_bin_id, upper_bin_id)`**
- **Function**: Calculate the number of positions within a price range
- **Parameters**:
  - `lower_bin_id`: Lower bound Bin ID
  - `upper_bin_id`: Upper bound Bin ID
- **Returns**: Number of positions (number)

**Example**:
```typescript
const positionCount = BinUtils.getPositionCount(lowerBinId, upperBinId)
console.log(`Need to create ${positionCount} positions`)
```

#### 4. Other Utility Functions

**`calculateOutByShare(bin, remove_liquidity)`**
- **Function**: Calculate removed two-token amounts based on liquidity share
- **Parameters**:
  - `bin`: Bin information (contains amount_a, amount_b, liquidity)
  - `remove_liquidity`: Liquidity to remove
- **Returns**: `{ amount_a, amount_b }` object

**`getBinShift(active_id, bin_step, max_price_slippage)`**
- **Function**: Calculate Bin shift based on price slippage
- **Parameters**:
  - `active_id`: Active Bin ID
  - `bin_step`: Bin step
  - `max_price_slippage`: Maximum price slippage (decimal format, e.g., 0.01 means 1%)
- **Returns**: Bin shift amount (number)

**`findMinMaxBinId(binStep)`**
- **Function**: Find the minimum and maximum valid Bin IDs for a given Bin step
- **Parameters**: `binStep`: Bin step
- **Returns**: `{ minBinId, maxBinId }` object

### BinUtils Complete Example

```typescript
import { BinUtils } from '@cetusprotocol/dlmm-sdk/utils'

// 1. Price to Bin ID conversion
const price = '1.05'
const binStep = 10
const decimals_a = 9
const decimals_b = 6

const binId = BinUtils.getBinIdFromPrice(price, binStep, true, decimals_a, decimals_b)
console.log(`Bin ID for price ${price}: ${binId}`)

const calculatedPrice = BinUtils.getPriceFromBinId(binId, binStep, decimals_a, decimals_b)
console.log(`Price for Bin ID ${binId}: ${calculatedPrice}`)

// 2. Liquidity calculation
const qPrice = BinUtils.getQPriceFromId(binId, binStep)
const liquidity = BinUtils.getLiquidity('1000000', '1200000', qPrice)
console.log(`Liquidity value: ${liquidity}`)

// 3. Position splitting
const lowerBinId = binId - 100
const upperBinId = binId + 100
const positionCount = BinUtils.getPositionCount(lowerBinId, upperBinId)
console.log(`Need ${positionCount} positions within the price range`)
```

## FeeUtils

FeeUtils provides fee calculation functionality, including base fee, variable fee, and protocol fee calculation.

### Core Functions

**`getVariableFee(variableParameters)`**
- **Function**: Calculate variable fee
- **Parameters**:
  - `variableParameters`: Variable fee parameter object
    - `volatility_accumulator`: Volatility accumulator
    - `bin_step_config`: Bin step configuration
      - `variable_fee_control`: Variable fee control parameter
      - `bin_step`: Bin step
- **Returns**: Variable fee value (string format)

**Example**:
```typescript
const variableFee = FeeUtils.getVariableFee({
  volatility_accumulator: '1000000',
  bin_step_config: {
    variable_fee_control: '500000',
    bin_step: 10
  }
})
```

**`calculateCompositionFee(amount, total_fee_rate)`**
- **Function**: Calculate composition fee
- **Parameters**:
  - `amount`: Amount
  - `total_fee_rate`: Total fee rate
- **Returns**: Composition fee (string format)

**`calculateProtocolFee(fee_amount, protocol_fee_rate)`**
- **Function**: Calculate protocol fee
- **Parameters**:
  - `fee_amount`: Fee amount
  - `protocol_fee_rate`: Protocol fee rate
- **Returns**: Protocol fee (string format)

**`getProtocolFees(fee_a, fee_b, protocol_fee_rate)`**
- **Function**: Calculate protocol fees for two tokens
- **Parameters**:
  - `fee_a`: Coin A fee
  - `fee_b`: Coin B fee
  - `protocol_fee_rate`: Protocol fee rate
- **Returns**: `{ protocol_fee_a, protocol_fee_b }` object

**`getCompositionFees(active_bin, used_bin, variableParameters)`**
- **Function**: Calculate composition fees (two tokens)
- **Parameters**:
  - `active_bin`: Active bin information
  - `used_bin`: Used bin information
  - `variableParameters`: Variable fee parameters
- **Returns**: `{ fees_a, fees_b }` object

### FeeUtils Complete Example

```typescript
import { FeeUtils } from '@cetusprotocol/dlmm-sdk/utils'

// Calculate variable fee
const variableFee = FeeUtils.getVariableFee({
  volatility_accumulator: '1000000',
  bin_step_config: {
    variable_fee_control: '500000',
    bin_step: 10
  }
})

console.log(`Variable fee: ${variableFee}`)

// Calculate protocol fee
const feeAmount = '1000000'
const protocolFeeRate = '100' // 1% (100 basis points)
const protocolFee = FeeUtils.calculateProtocolFee(feeAmount, protocolFeeRate)
console.log(`Protocol fee: ${protocolFee}`)

// Calculate two-token protocol fees
const protocolFees = FeeUtils.getProtocolFees('500000', '600000', protocolFeeRate)
console.log(`Protocol fees - Coin A: ${protocolFees.protocol_fee_a}, Coin B: ${protocolFees.protocol_fee_b}`)
```



## Comprehensive Usage Example

Here is a complete example combining multiple tool functions:

```typescript
import { BinUtils, FeeUtils } from '@cetusprotocol/dlmm-sdk/utils'

async function calculateLiquidityAndFees() {
  // 1. Price calculation
  const price = '1.05'
  const binStep = 10
  const decimals_a = 9
  const decimals_b = 6

  const binId = BinUtils.getBinIdFromPrice(price, binStep, true, decimals_a, decimals_b)
  console.log(`Bin ID for price ${price}: ${binId}`)

  // 2. Liquidity calculation
  const qPrice = BinUtils.getQPriceFromId(binId, binStep)
  const liquidity = BinUtils.getLiquidity('1000000', '1200000', qPrice)
  console.log(`Liquidity value: ${liquidity}`)

  // 3. Fee calculation
  const variableFee = FeeUtils.getVariableFee({
    volatility_accumulator: '1000000',
    bin_step_config: {
      variable_fee_control: '500000',
      bin_step: 10
    }
  })
  console.log(`Variable fee: ${variableFee}`)

  return {
    binId,
    liquidity,
    variableFee
  }
}

// Execute calculation
calculateLiquidityAndFees().then(result => {
  console.log('Calculation result:', result)
})
```

## Best Practices

1. **Precision Handling**:
   - Pass all amount parameters in string format to avoid JavaScript number precision issues
   - Use Decimal.js for high-precision calculations
   - Use BN type for large integer operations

2. **Error Handling**:
   - Always wrap tool function calls with try-catch
   - Validate input parameter validity
   - Check return value legitimacy

3. **Performance Optimization**:
   - Cache frequently used calculation results
   - Batch process related calculations
   - Avoid unnecessary type conversions

4. **Code Organization**:
   - Organize tool function usage by functional modules
   - Provide appropriate comments and documentation
   - Create reusable tool function wrappers

## Frequently Asked Questions


### 1. How to handle large numbers?
- Pass large numbers in string format
- Use BN type for large integer operations
- Use Decimal.js for high-precision decimal operations
- Avoid using JavaScript's Number type for large numbers

### 2. Do tool functions have version compatibility?
- Tool functions are bound to SDK versions
- Major version updates may change APIs
- Check SDK changelogs for updates
- Pin SDK versions in production environments

### 3. How to debug tool function calculations?
- Use console output for intermediate results
- Compare with official calculators or test cases
- Verify calculation process step by step
- Use mock data for testing

---

**Note**: This document is based on Cetus DLMM SDK v1.0.3. Please refer to the latest SDK documentation and type definitions for actual usage.