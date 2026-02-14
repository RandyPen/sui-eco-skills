# Type Definitions Reference

This document provides a complete type definitions reference for the Cetus DLMM SDK. All type definitions are based on real code from the `@cetusprotocol/dlmm-sdk` package.

## Overview

The DLMM SDK's type system provides complete TypeScript type safety support, including:
- **Core Data Models**: Pools, positions, bins, etc.
- **Function Parameter Types**: Operation options and configurations
- **Enumeration Types**: Strategy types, error codes, etc.
- **Constant Definitions**: System limits and default values

## Import Methods

```typescript
// Import types from the dlmm package
import {
  DlmmPool,
  DlmmPosition,
  BinAmount,
  StrategyType,
  CreatePoolOption,
  AddLiquidityOption,
  MAX_BIN_PER_POSITION
} from '@cetusprotocol/dlmm-sdk'

// Import common types from the common package
import { CoinPairType } from '@cetusprotocol/common-sdk/type'
```

## Core Data Models

### DlmmPool - DLMM Pool Type
Represents the complete state of a DLMM liquidity pool.

```typescript
type DlmmPool = {
  // Basic information
  pool_type: string           // Pool type
  index: number               // Pool index
  id: string                  // Pool ID
  bin_step: number           // Bin step size

  // Bin management
  bin_manager: BinManager    // Bin manager
  active_id: number          // Current active Bin ID

  // Fees and parameters
  variable_parameters: VariableParameters  // Variable parameters
  base_fee_rate: string      // Base fee rate
  protocol_fee_a: string     // Coin A protocol fee
  protocol_fee_b: string     // Coin B protocol fee

  // Balances and status
  balance_a: string          // Coin A balance
  balance_b: string          // Coin B balance

  // Metadata and configuration
  url: string                // Metadata URL
  permissions: PoolPermissions // Permission configuration

  // Management modules
  reward_manager: RewardManager   // Reward manager
  position_manager: PositionManager // Position manager

  // Coin pair (inherited from CoinPairType)
  coin_type_a: string        // Coin A type
  coin_type_b: string        // Coin B type
}
```

### DlmmPosition - DLMM Position Type
Represents a liquidity position.

```typescript
type DlmmPosition = {
  // Identification information
  id: string                 // Position ID
  pool_id: string            // Associated pool ID
  index: number              // Position index
  name: string               // Position name

  // Price range
  lower_bin_id: number       // Lower Bin ID
  upper_bin_id: number       // Upper Bin ID

  // Liquidity information
  liquidity_shares: string[] // Liquidity shares array (shares per Bin)

  // Metadata
  description: string        // Description
  uri: string                // Metadata URI

  // Coin pair (inherited from CoinPairType)
  coin_type_a: string        // Coin A type
  coin_type_b: string        // Coin B type
}
```

### BinAmount - Bin Amount Type
Represents token amounts and liquidity information in a Bin.

```typescript
type BinAmount = {
  bin_id: number            // Bin ID
  amount_a: string          // Coin A amount (string format)
  amount_b: string          // Coin B amount (string format)
  liquidity?: string        // Liquidity value (optional)
  price_per_lamport: string // Price per lamport
}
```

### BinManager - Bin Manager Type
Manages configuration and status of all Bins in a pool.

```typescript
type BinManager = {
  bin_step: number          // Bin step size
  bin_manager_handle: string // Bin manager handle
  size: string              // Size
}
```

### VariableParameters - Variable Parameters Type
Contains dynamically adjustable fee parameters and volatility data.

```typescript
type VariableParameters = {
  volatility_accumulator: string    // Volatility accumulator
  volatility_reference: string      // Volatility reference
  index_reference: number           // Index reference
  last_update_timestamp: string     // Last update timestamp
  bin_step_config: BinStepConfig    // Bin step configuration
}
```

### BinStepConfig - Bin Step Configuration Type
Detailed configuration parameters for Bin step size.

```typescript
type BinStepConfig = {
  bin_step: number                  // Bin step size
  base_factor: number               // Base factor
  filter_period: number             // Filter period
  decay_period: number              // Decay period
  reduction_factor: number          // Reduction factor
  variable_fee_control: string      // Variable fee control
  max_volatility_accumulator: string // Maximum volatility accumulator
  protocol_fee_rate: string         // Protocol fee rate
}
```

## Function Parameter Types

### CreatePoolOption - Create Pool Option
Parameters required when creating a DLMM pool.

```typescript
type CreatePoolOption = {
  active_id: number          // Active Bin ID
} & BaseCreatePoolOption

type BaseCreatePoolOption = {
  bin_step: number          // Bin step size
  base_factor: number       // Base factor
  url?: string              // Optional: Metadata URL
} & CoinPairType            // Inherits coin pair type
```

### AddLiquidityOption - Add Liquidity Option
Parameters required when adding liquidity to a pool.

```typescript
type AddLiquidityOption = BaseAddLiquidityOption & {
  position_id: string                   // Position ID (when adding to existing position)
  collect_fee: boolean                  // Whether to collect fees simultaneously
  reward_coins: string[]                // Reward coin list
}

type BaseAddLiquidityOption = {
  pool_id: string | TransactionObjectArgument  // Pool ID or transaction object argument
  bin_infos: BinLiquidityInfo           // Liquidity Bin information
  strategy_type: StrategyType           // Strategy type
  max_price_slippage: number            // Maximum price slippage
  active_id: number                     // Active Bin ID
  bin_step: number                      // Bin step size
  use_bin_infos?: boolean               // Optional: Whether to use bin_infos
  coin_object_id_a?: TransactionObjectArgument // Optional: Coin A object ID
  coin_object_id_b?: TransactionObjectArgument // Optional: Coin B object ID
} & CoinPairType                        // Inherits coin pair type
```

### RemoveLiquidityOption - Remove Liquidity Option
Parameters required when removing liquidity from a position.

```typescript
type RemoveLiquidityOption = {
  pool_id: string                       // Pool ID
  position_id: string                   // Position ID
  remove_liquidity: string              // Liquidity amount to remove
  collect_fee: boolean                  // Whether to collect fees simultaneously
  reward_coins: string[]                // Reward coin list
} & CoinPairType                        // Inherits coin pair type
```

### SwapOption - Swap Option
Parameters required when executing a token swap.

```typescript
type SwapOption = {
  quote_obj: PreSwapQuote               // Pre-swap quote object
  by_amount_in: boolean                 // Whether it's fixed input mode
  slippage: number                      // Slippage tolerance
  partner?: string                      // Optional: Partner address
} & CoinPairType                        // Inherits coin pair type
```

### PreSwapOption - Pre-swap Option
Parameters required when obtaining a swap quote.

```typescript
type PreSwapOption = {
  pool_id: string                       // Pool ID
  a2b: boolean                          // Swap direction (true: A→B, false: B→A)
  by_amount_in: boolean                 // Whether it's fixed input mode
  in_amount: string                     // Input amount
} & CoinPairType                        // Inherits coin pair type
```

### PreSwapQuote - Pre-swap Quote
Quote information returned from pre-swap calculation.

```typescript
type PreSwapQuote = {
  pool_id: string                       // Pool ID
  a2b: boolean                          // Swap direction
  in_amount: string                     // Input amount
  out_amount: string                    // Output amount
  ref_fee_amount: string                // Recommended fee amount
  fee_amount: string                    // Total fee amount
  partner: string                       // Partner address
  from_coin_type: string                // Source coin type
  to_coin_type: string                  // Target coin type
  bin_swaps: BinSwap[]                  // Bin swap paths
}
```

### BinLiquidityInfo - Bin Liquidity Information
Contains liquidity distribution information across multiple Bins.

```typescript
type BinLiquidityInfo = {
  bins: BinAmount[]                    // Bin amount array
  amount_a: string                     // Total Coin A amount
  amount_b: string                     // Total Coin B amount
}
```

### BinSwap - Bin Swap Information
Swap path information for a single Bin.

```typescript
type BinSwap = {
  bin_id: number                      // Bin ID
  in_amount: string                   // Input amount
  out_amount: string                  // Output amount
  fee_amount: string                  // Fee amount
}
```

## Enumeration Types

### StrategyType - Strategy Type Enumeration
Defines three liquidity provision strategies.

```typescript
enum StrategyType {
  Spot = 0,    // Spot strategy: Provide liquidity near current price
  Curve = 1,   // Curve strategy: Distribute liquidity along a curve
  BidAsk = 2   // Bid-ask strategy: Provide liquidity on both bid and ask sides
}
```

### WithdrawMode - Withdrawal Mode Enumeration (Zap related)
Defines modes when withdrawing liquidity from a position.

```typescript
type WithdrawMode = 'OnlyCoinA' | 'OnlyCoinB' | 'Both'
```

## Configuration and Constant Types

### DlmmConfigs - DLMM Configuration Type
Global configuration for the DLMM system.

```typescript
type DlmmConfigs = {
  registry_id: string                  // Registry ID
  pools_id: string                     // Pools ID
  partners_id: string                  // Partners ID
  global_config_id: string             // Global configuration ID
  versioned_id: string                 // Versioned ID
  admin_cap_id: string                 // Admin capability ID
}
```

### CoinPairType - Coin Pair Type
Generic coin pair type definition.

```typescript
type CoinPairType = {
  coin_type_a: SuiAddressType          // Coin A type
  coin_type_b: SuiAddressType          // Coin B type
}
```

### IlmInputOptions - ILM Input Options (Advanced)
Input options for Concentrated Liquidity Market (ILM).

```typescript
type IlmInputOptions = {
  curvature: number                    // Curvature
  initial_price: number                // Initial price
  max_price: number                    // Maximum price
  bin_step: number                     // Bin step size
  total_supply: number                 // Total supply
  pool_share_percentage: number        // Pool share percentage
  config: {
    price_curve_points_num: number     // Price curve points number
    liquidity_distribution_num: number // Liquidity distribution number
    tokens_table_num: number           // Tokens table number
    price_table_num: number            // Price table number
  }
}
```

## Constant Definitions

The DLMM SDK defines a series of system constants, located in the constants file of the `@cetusprotocol/dlmm-sdk` package.

### Bin-related Constants
```typescript
const MAX_BIN_PER_POSITION = 1000      // Maximum number of Bins per position
const MIN_BIN_ID = -443636             // Minimum Bin ID
const MAX_BIN_ID = 443636              // Maximum Bin ID
const BIN_BOUND = 443636n              // Bin boundary (BigInt format)
```

### Fee-related Constants
```typescript
const MAX_FEE_RATE = 100_000_000       // Maximum fee rate
const FEE_PRECISION = 1_000_000_000    // Fee precision
const BASIS_POINT = 10000              // Basis point (1% = 100 basis points)
const BASIS_POINT_MAX = 10000          // Maximum basis point value
```

### Weight-related Constants
```typescript
const DEFAULT_MAX_WEIGHT = 2000        // Default maximum weight
const DEFAULT_MIN_WEIGHT = 200         // Default minimum weight
```

### Reward-related Constants
```typescript
const REWARD_PERIOD = 7 * 24 * 60 * 60 // Reward period (7 days, in seconds)
const REWARD_PERIOD_START_AT = 1747627200 // Reward period start timestamp
```

## Utility Types

### String Amount Type
All amount fields use string format to avoid JavaScript number precision issues.

```typescript
// Example: Using strings to represent amounts
const amountA: string = '1000000'  // 1 token (assuming 6 decimal places)
const amountB: string = '1200000'  // 1.2 tokens

// Bad example: Do not use number type
// const amountA: number = 1000000  // May cause precision issues
```

### Optional Field Markers
Use TypeScript's optional marker (`?`) to indicate optional fields.

```typescript
// Optional field example
type ExampleType = {
  requiredField: string    // Required field
  optionalField?: string   // Optional field
}
```

### Union Types
Some fields use union types to support multiple formats.

```typescript
// Union type example
type PoolIdType = string | TransactionObjectArgument
```

## Usage Examples

### Type-safe Function Calls
```typescript
import {
  DlmmPool,
  CreatePoolOption,
  StrategyType
} from '@cetusprotocol/dlmm-sdk'

// Type-correct parameters
const createOption: CreatePoolOption = {
  active_id: 1000,
  bin_step: 10,
  base_factor: 10000,
  coin_type_a: '0x...::coin_a::COIN_A',
  coin_type_b: '0x...::coin_b::COIN_B',
  url: 'https://example.com/pool-metadata'
}

// Enum usage
const strategy: StrategyType = StrategyType.Spot

// Type-safe data from API
async function getPoolInfo(poolId: string): Promise<DlmmPool> {
  const pool = await sdk.Pool.getPool(poolId)
  // TypeScript will validate return type
  return pool
}
```

### Type Guards and Checks
```typescript
function isDlmmPool(obj: any): obj is DlmmPool {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.bin_step === 'number' &&
    typeof obj.coin_type_a === 'string' &&
    typeof obj.coin_type_b === 'string'
  )
}

// Using type guards
const data = await getSomeData()
if (isDlmmPool(data)) {
  // TypeScript knows this is DlmmPool type
  console.log(`Pool ID: ${data.id}, Bin step: ${data.bin_step}`)
}
```

### Constant Usage
```typescript
import { MAX_BIN_PER_POSITION } from '@cetusprotocol/dlmm-sdk'

// Check if position exceeds Bin limit
function checkPositionBinCount(lowerBinId: number, upperBinId: number): boolean {
  const binCount = upperBinId - lowerBinId + 1
  return binCount <= MAX_BIN_PER_POSITION
}

// Using fee constants
function calculateFee(amount: string, feeRate: number): string {
  const fee = (parseInt(amount) * feeRate) / 1000000
  return Math.floor(fee).toString()
}
```

## Type Compatibility Notes

### Version Compatibility
DLMM SDK type definitions are bound to specific versions:
- **v1.0.3**: This document is based on this version
- **Major version updates**: May change type definitions
- **Recommendation**: Pin SDK version in production environments

### Backward Compatibility
SDK typically maintains backward compatibility, but:
- **New fields**: May add new fields
- **Optional fields**: New fields are usually optional
- **Deprecated fields**: May be marked as deprecated but not immediately removed

### Type Extension
Users can extend types as needed:

```typescript
// Extending type definitions
interface ExtendedDlmmPool extends DlmmPool {
  customField?: string
  calculatedMetrics?: {
    tvl: string
    apy: number
  }
}

// Type conversion function
function enhancePoolData(pool: DlmmPool): ExtendedDlmmPool {
  return {
    ...pool,
    calculatedMetrics: {
      tvl: calculateTVL(pool),
      apy: calculateAPY(pool)
    }
  }
}
```

## Frequently Asked Questions

### 1. Why use strings for amounts instead of numbers?
**Reason**: To avoid JavaScript number precision issues. Blockchain amounts are often very large, and using strings ensures precision.

### 2. How to import specific types?
```typescript
// Correct: Import from correct path
import { DlmmPool } from '@cetusprotocol/dlmm-sdk'
import { CoinPairType } from '@cetusprotocol/common-sdk/type'

// Incorrect: Do not import from subpaths (unless documented)
// import { DlmmPool } from '@cetusprotocol/dlmm-sdk/types' // Incorrect
```

### 3. How to handle optional fields?
```typescript
// Safely access optional fields
const url = pool.url || 'Not set'  // Provide default value

// Check optional objects
if (pool.reward_manager && pool.reward_manager.rewards) {
  // Safely access nested optional fields
}
```

### 4. Where to view type definitions?
- **TypeScript definition files**: `node_modules/@cetusprotocol/dlmm-sdk/dist/types/*.d.ts`
- **Source code files**: `packages/dlmm/src/types/*.ts`
- **This document**: Provides reference for commonly used types

### 5. How to handle type errors?
```typescript
// Use type assertions (use with caution)
const pool = data as DlmmPool

// Better approach: Use type guards
if (isDlmmPool(data)) {
  // Safe usage
}

// Or catch and handle type errors
try {
  const pool: DlmmPool = JSON.parse(jsonString)
  // Validate required fields
  if (!pool.id || !pool.coin_type_a) {
    throw new Error('Invalid pool data')
  }
} catch (error) {
  console.error('Type parsing error:', error)
}
```

## Best Practices

### 1. Always use type imports
```typescript
// Good: Explicitly import types
import type { DlmmPool } from '@cetusprotocol/dlmm-sdk'

// Better: Use correct import method
import { DlmmPool } from '@cetusprotocol/dlmm-sdk'
```

### 2. Validate external data
```typescript
function validatePoolData(data: any): DlmmPool | null {
  if (!data || typeof data !== 'object') return null

  const requiredFields = ['id', 'bin_step', 'coin_type_a', 'coin_type_b']
  for (const field of requiredFields) {
    if (!(field in data)) return null
  }

  return data as DlmmPool
}
```

### 3. Use constants instead of hardcoding
```typescript
// Good: Use imported constants
import { MAX_BIN_PER_POSITION } from '@cetusprotocol/dlmm-sdk'
const isValid = binCount <= MAX_BIN_PER_POSITION

// Bad: Hardcoding
const isValid = binCount <= 1000  // Magic number
```

### 4. Create type aliases for custom logic
```typescript
// Create descriptive type aliases
type PriceRange = {
  lower: string
  upper: string
  description?: string
}

type LiquidityAllocation = {
  range: PriceRange
  amountA: string
  amountB: string
  strategy: StrategyType
}
```

### 5. Keep types synchronized
- Regularly check SDK changelogs for type changes
- Use TypeScript's strict mode
- Run type checking as part of CI/CD

---

**Note**: This document is based on type definitions from Cetus DLMM SDK v1.0.3. For actual usage, please refer to:
1. Type definition files of the latest SDK version
2. TypeScript compiler's type checking
3. Type inference and error messages in actual usage

The type system is an important part of TypeScript development. Correct use of type definitions can significantly improve code reliability and development efficiency.