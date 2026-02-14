# Pool Management Detailed Guide

Pool management is one of the core functionalities of the DLMM protocol, allowing users to create, configure, and monitor liquidity pools. DLMM pools use the Bin system to manage liquidity, supporting dynamic fee adjustments and multiple strategy types.

## Overview

DLMM pool management provides the following core functionalities:

### Pool Lifecycle
1. **Create Pool**: Create new DLMM pool and configure initial parameters
2. **Query Pool Information**: Get pool status, balances, and fee information
3. **Configure Pool Parameters**: Set fee structure and strategy parameters
4. **Monitor Pool Status**: Track pool liquidity, trading volume, and fee accumulation

### Key Pool Attributes
- **Pool ID**: Unique identifier
- **Token Pair**: Types of Coin A and Coin B
- **Bin Step**: Price interval between bins (expressed in basis points)
- **Base Factor**: Factor for calculating base fees
- **Active Bin ID**: Current active Bin index
- **Fee Structure**: Base fee rate, protocol fee rate, etc.
- **Liquidity Balances**: Current liquidity balances of both coins

## Core Concepts

### Pool Structure
Each DLMM pool contains the following information:
```typescript
type DlmmPool = {
  pool_type: string;           // Pool type
  index: number;               // Pool index
  bin_manager: BinManager;     // Bin manager
  variable_parameters: VariableParameters; // Variable parameters
  active_id: number;           // Active Bin ID
  permissions: PoolPermissions; // Permission configuration
  balance_a: string;           // Coin A balance
  balance_b: string;           // Coin B balance
  base_fee_rate: string;       // Base fee rate
  protocol_fee_a: string;      // Coin A protocol fee
  protocol_fee_b: string;      // Coin B protocol fee
  url: string;                 // Metadata URL
  reward_manager: RewardManager; // Reward manager
  position_manager: PositionManager; // Position manager
} & DlmmBasePool
```

### Fee Configuration
DLMM uses predefined fee configuration tables based on Bin step and base factor:

| Base Fee | Bin Step | Base Factor |
| -------- | -------- | -------- |
| 0.01%    | 1        | 10,000   |
| 0.02%    | 1        | 20,000   |
| 0.03%    | 2        | 15,000   |
| 0.04%    | 2        | 20,000   |
| 0.05%    | 5        | 10,000   |
| 0.10%    | 10       | 10,000   |
| 0.15%    | 15       | 10,000   |
| 0.20%    | 20       | 10,000   |
| 0.25%    | 25       | 10,000   |
| 0.30%    | 30       | 10,000   |
| 0.40%    | 50       | 8,000    |
| 0.60%    | 80       | 7,500    |
| 0.80%    | 100      | 8,000    |
| 1.00%    | 100      | 10,000   |
| 2.00%    | 200      | 10,000   |
| 4.00%    | 400      | 10,000   |

### Bin Step and Price Precision
Bin step determines price precision and liquidity distribution:
- **Small Bin step**: Higher price precision, suitable for stablecoin pairs
- **Large Bin step**: Lower price precision, suitable for volatile token pairs

## Pool Management Workflow

### Step 1: Initialize SDK

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'
import { BinUtils } from '@cetusprotocol/dlmm-sdk/utils'

// Initialize SDK
const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
sdk.setSenderAddress(walletAddress)
```

### Step 2: Create DLMM Pool

#### 2.1 Prepare Pool Creation Parameters

```typescript
async function preparePoolCreation() {
  // 1. Select Bin step and base factor (refer to fee configuration table)
  const binStep = 10  // Corresponds to 0.10% base fee
  const baseFactor = 10000

  // 2. Calculate active Bin ID for initial price
  const initialPrice = '1.05'  // Initial price
  const min = true             // Whether to use minimum Bin ID (true means round down)
  const decimals_a = 6         // Coin A decimal places
  const decimals_b = 6         // Coin B decimal places

  const activeId = BinUtils.getBinIdFromPrice(
    initialPrice,
    binStep,
    min,
    decimals_a,
    decimals_b
  )

  // 3. Prepare coin types (must be complete Move type strings)
  const coinTypeA = '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI'
  const coinTypeB = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'

  // 4. Optional: Set pool metadata URL
  const poolUrl = 'https://my-pool-metadata.example.com'

  return {
    binStep,
    baseFactor,
    activeId,
    coinTypeA,
    coinTypeB,
    poolUrl
  }
}
```

#### 2.2 Create Pool Transaction

Based on the example in `pool.test.ts`:

```typescript
async function createDlmmPool() {
  // 1. Prepare parameters
  const {
    binStep,
    baseFactor,
    activeId,
    coinTypeA,
    coinTypeB,
    poolUrl
  } = await preparePoolCreation()

  // 2. Create new transaction
  const tx = new Transaction()

  // 3. Create pool transaction
  const poolId = sdk.Pool.createPoolPayload({
    active_id: activeId,
    bin_step: binStep,
    coin_type_a: coinTypeA,
    coin_type_b: coinTypeB,
    base_factor: baseFactor,
    url: poolUrl
  }, tx)

  console.log('Pool creation transaction built successfully')
  console.log(`Pool ID: ${poolId}`)

  // 4. Set Gas budget
  tx.setGasBudget(10000000000)

  return {
    tx,
    poolId
  }
}
```

#### 2.3 One-time Pool Creation and Liquidity Addition

For scenarios requiring immediate liquidity provision, you can use a combined function:

```typescript
async function createPoolAndAddLiquidity() {
  // 1. Prepare pool creation parameters (same as above)
  const params = await preparePoolCreation()

  // 2. Prepare liquidity addition parameters
  const lowerPrice = '1.00'
  const upperPrice = '1.10'
  const amountA = '1000000'  // 1 Coin A (assuming 6 decimal places)
  const amountB = '1100000'  // 1.1 Coin B

  // 3. Calculate Bin IDs for price range
  const lowerBinId = BinUtils.getBinIdFromPrice(
    lowerPrice,
    params.binStep,
    true,
    6,
    6
  )
  const upperBinId = BinUtils.getBinIdFromPrice(
    upperPrice,
    params.binStep,
    true,
    6,
    6
  )

  // 4. Directly create pool and add liquidity (simplified example)
  // Note: Actual implementation may require calculating liquidity distribution first
  const tx = sdk.Pool.createPoolAndAddLiquidityPayload({
    active_id: params.activeId,
    bin_step: params.binStep,
    base_factor: params.baseFactor,
    coin_type_a: params.coinTypeA,
    coin_type_b: params.coinTypeB,
    url: params.poolUrl,
    // Simplified: directly pass amounts and price range
    amount_a: amountA,
    amount_b: amountB,
    lower_bin_id: lowerBinId,
    upper_bin_id: upperBinId,
    strategy_type: 0  // StrategyType.Spot
  })

  console.log('Pool creation and liquidity addition transaction built successfully')
  return tx
}
```

### Step 3: Query Pool Information

#### 3.1 Get Single Pool Information

```typescript
async function getPoolInfo(poolId: string) {
  try {
    // Get pool information
    const pool = await sdk.Pool.getPool(poolId)

    console.log('Pool information:')
    console.log(`Pool ID: ${poolId}`)
    console.log(`Token pair: ${pool.coin_type_a} / ${pool.coin_type_b}`)
    console.log(`Bin step: ${pool.bin_step}`)
    console.log(`Active Bin ID: ${pool.active_id}`)
    console.log(`Coin A balance: ${pool.balance_a}`)
    console.log(`Coin B balance: ${pool.balance_b}`)
    console.log(`Base fee rate: ${pool.base_fee_rate}`)
    console.log(`Protocol fee rate: ${pool.protocol_fee_rate || 'Not set'}`)
    console.log(`Metadata URL: ${pool.url || 'Not set'}`)

    // Calculate current price
    const currentPrice = BinUtils.getPriceFromBinId(
      pool.active_id,
      pool.bin_step,
      6, // Assuming 6 decimal places
      6
    )
    console.log(`Current price: ${currentPrice}`)

    return pool
  } catch (error) {
    console.error('Failed to get pool information:', error)
    throw error
  }
}
```

#### 3.2 Batch Query Pool Information

```typescript
async function getMultiplePools(poolIds: string[]) {
  const pools = []

  for (const poolId of poolIds) {
    try {
      const pool = await sdk.Pool.getPool(poolId)
      pools.push({
        id: poolId,
        ...pool
      })
    } catch (error) {
      console.warn(`Failed to get pool ${poolId}:`, error)
      pools.push({
        id: poolId,
        error: error.message
      })
    }
  }

  return pools
}
```

#### 3.3 Get Pool Statistics

```typescript
async function getPoolStatistics(poolId: string) {
  const pool = await sdk.Pool.getPool(poolId)

  // Calculate pool's total liquidity value (example)
  const totalLiquidity = {
    coinA: parseInt(pool.balance_a),
    coinB: parseInt(pool.balance_b)
  }

  // Get fee accumulation
  const feeAccumulation = {
    protocolFeeA: pool.protocol_fee_a || '0',
    protocolFeeB: pool.protocol_fee_b || '0'
  }

  // Get Bin manager status
  const binManagerInfo = pool.bin_manager
  const binCount = binManagerInfo.bins ? binManagerInfo.bins.length : 0

  return {
    poolId,
    totalLiquidity,
    feeAccumulation,
    binManager: {
      binCount,
      activeBinId: pool.active_id,
      binStep: pool.bin_step
    },
    timestamp: new Date().toISOString()
  }
}
```

### Step 4: Monitor Pool Status

#### 4.1 Real-time Active Bin Monitoring

```typescript
class PoolMonitor {
  private sdk: CetusDlmmSDK
  private monitoredPools: Map<string, { lastActiveId: number; lastUpdate: Date }> = new Map()

  constructor(sdk: CetusDlmmSDK) {
    this.sdk = sdk
  }

  async startMonitoring(poolId: string, intervalMs = 30000) {
    console.log(`Starting monitoring pool ${poolId}`)

    const monitorInterval = setInterval(async () => {
      try {
        const pool = await this.sdk.Pool.getPool(poolId)
        const previousState = this.monitoredPools.get(poolId)

        if (previousState && previousState.lastActiveId !== pool.active_id) {
          console.log(`Pool ${poolId} active Bin change:`)
          console.log(`  From Bin ${previousState.lastActiveId} to Bin ${pool.active_id}`)
          console.log(`  Time: ${new Date().toISOString()}`)

          // Trigger event handling
          this.onActiveBinChange(poolId, previousState.lastActiveId, pool.active_id)
        }

        // Update status
        this.monitoredPools.set(poolId, {
          lastActiveId: pool.active_id,
          lastUpdate: new Date()
        })

      } catch (error) {
        console.error(`Monitoring pool ${poolId} failed:`, error)
      }
    }, intervalMs)

    return () => clearInterval(monitorInterval)
  }

  private onActiveBinChange(poolId: string, oldBinId: number, newBinId: number) {
    // Handle active Bin change event
    console.log(`Pool ${poolId} active Bin change event processing`)
    // Custom logic can be added here, such as sending notifications, triggering rebalancing, etc.
  }
}
```

#### 4.2 Monitor Fee Accumulation

```typescript
async function monitorFeeAccumulation(poolId: string, threshold: string) {
  const pool = await sdk.Pool.getPool(poolId)

  const protocolFeeA = parseInt(pool.protocol_fee_a || '0')
  const protocolFeeB = parseInt(pool.protocol_fee_b || '0')
  const thresholdValue = parseInt(threshold)

  if (protocolFeeA > thresholdValue || protocolFeeB > thresholdValue) {
    console.log(`Pool ${poolId} protocol fees reached threshold:`)
    console.log(`  Coin A protocol fee: ${protocolFeeA}`)
    console.log(`  Coin B protocol fee: ${protocolFeeB}`)
    console.log(`  Threshold: ${thresholdValue}`)

    // Trigger fee collection or notification
    return true
  }

  return false
}
```

### Step 5: Advanced Pool Management Functions

#### 5.1 Fee Structure Analysis

```typescript
async function analyzeFeeStructure(poolId: string) {
  const pool = await sdk.Pool.getPool(poolId)

  // Parse base fee rate
  const baseFeeRate = parseInt(pool.base_fee_rate)
  const baseFeePercentage = (baseFeeRate / 1000000) * 100 // Convert to percentage

  // Get variable fee parameters
  const variableParams = pool.variable_parameters
  const variableFee = FeeUtils.getVariableFee(variableParams)

  // Calculate total fee rate
  const totalFeeRate = baseFeeRate + parseInt(variableFee)
  const totalFeePercentage = (totalFeeRate / 1000000) * 100

  return {
    baseFee: {
      rate: baseFeeRate.toString(),
      percentage: baseFeePercentage.toFixed(4) + '%'
    },
    variableFee: {
      rate: variableFee,
      percentage: (parseInt(variableFee) / 1000000 * 100).toFixed(4) + '%'
    },
    totalFee: {
      rate: totalFeeRate.toString(),
      percentage: totalFeePercentage.toFixed(4) + '%'
    },
    binStep: pool.bin_step,
    baseFactor: pool.base_factor
  }
}
```

#### 5.2 Pool Performance Analysis

```typescript
async function analyzePoolPerformance(poolId: string, timeRange: { start: Date, end: Date }) {
  // Fetch historical data (requires integration with historical data source)
  const historicalData = await fetchPoolHistoricalData(poolId, timeRange)

  // Calculate key metrics
  const metrics = {
    // Trading volume
    totalVolume: historicalData.reduce((sum, data) => sum + data.volume, 0),

    // Fee revenue
    totalFees: historicalData.reduce((sum, data) => sum + data.fees, 0),

    // Active Bin change frequency
    binChangeCount: historicalData.filter((data, index) => {
      if (index === 0) return false
      return data.activeId !== historicalData[index - 1].activeId
    }).length,

    // Liquidity changes
    liquidityChanges: historicalData.map(data => ({
      timestamp: data.timestamp,
      liquidityA: data.balance_a,
      liquidityB: data.balance_b
    })),

    // Price range analysis
    priceRange: {
      min: Math.min(...historicalData.map(data => data.price)),
      max: Math.max(...historicalData.map(data => data.price)),
      avg: historicalData.reduce((sum, data) => sum + data.price, 0) / historicalData.length
    }
  }

  return metrics
}
```

## Complete Examples

### Example 1: Complete Pool Creation and Management System

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'
import { BinUtils, FeeUtils } from '@cetusprotocol/dlmm-sdk/utils'

class DlmmPoolManager {
  private sdk: CetusDlmmSDK
  private poolCache: Map<string, any> = new Map()

  constructor() {
    this.sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
  }

  // Create DLMM pool
  async createPool(options: {
    coinTypeA: string
    coinTypeB: string
    binStep: number
    baseFactor: number
    initialPrice: string
    url?: string
  }) {
    this.sdk.setSenderAddress(walletAddress)

    // Calculate active Bin ID
    const activeId = BinUtils.getBinIdFromPrice(
      options.initialPrice,
      options.binStep,
      true,
      6, // Assuming 6 decimal places
      6
    )

    // Create transaction
    const tx = new Transaction()

    const poolId = await this.sdk.Pool.createPoolPayload({
      active_id: activeId,
      bin_step: options.binStep,
      coin_type_a: options.coinTypeA,
      coin_type_b: options.coinTypeB,
      base_factor: options.baseFactor,
      url: options.url
    }, tx)

    tx.setGasBudget(10000000000)

    console.log(`Pool creation transaction built successfully, pool ID: ${poolId}`)

    return {
      tx,
      poolId,
      params: {
        activeId,
        binStep: options.binStep,
        baseFactor: options.baseFactor
      }
    }
  }

  // Get pool information (with cache)
  async getPoolWithCache(poolId: string, forceRefresh = false) {
    const cacheKey = `pool_${poolId}`

    if (!forceRefresh && this.poolCache.has(cacheKey)) {
      return this.poolCache.get(cacheKey)
    }

    const pool = await this.sdk.Pool.getPool(poolId)
    this.poolCache.set(cacheKey, pool)

    // Set cache expiration (5 minutes)
    setTimeout(() => this.poolCache.delete(cacheKey), 5 * 60 * 1000)

    return pool
  }

  // Analyze pool health status
  async analyzePoolHealth(poolId: string) {
    const pool = await this.getPoolWithCache(poolId)

    // Check liquidity balance
    const balanceA = parseInt(pool.balance_a)
    const balanceB = parseInt(pool.balance_b)
    const liquidityRatio = balanceA > 0 ? balanceB / balanceA : 0

    // Check active Bin position
    const expectedPrice = BinUtils.getPriceFromBinId(pool.active_id, pool.bin_step, 6, 6)

    // Check fee accumulation
    const protocolFeeA = parseInt(pool.protocol_fee_a || '0')
    const protocolFeeB = parseInt(pool.protocol_fee_b || '0')

    return {
      poolId,
      liquidity: {
        coinA: balanceA,
        coinB: balanceB,
        ratio: liquidityRatio.toFixed(4),
        health: liquidityRatio > 0.5 && liquidityRatio < 2 ? 'Good' : 'Needs attention'
      },
      activeBin: {
        id: pool.active_id,
        expectedPrice,
        health: 'Normal' // Needs to be evaluated based on actual situation
      },
      fees: {
        protocolFeeA,
        protocolFeeB,
        total: protocolFeeA + protocolFeeB,
        health: (protocolFeeA + protocolFeeB) > 1000000 ? 'Collectable' : 'Accumulating'
      },
      timestamp: new Date().toISOString()
    }
  }

  // Batch monitor pools
  async monitorPools(poolIds: string[], checkIntervalMs = 60000) {
    console.log(`Starting monitoring ${poolIds.length} pools`)

    const intervalId = setInterval(async () => {
      console.log(`\n=== Pool monitoring report ${new Date().toISOString()} ===`)

      for (const poolId of poolIds) {
        try {
          const health = await this.analyzePoolHealth(poolId)

          console.log(`Pool ${poolId}:`)
          console.log(`  Liquidity: ${health.liquidity.coinA} A / ${health.liquidity.coinB} B (${health.liquidity.health})`)
          console.log(`  Active Bin: ${health.activeBin.id} (price: ${health.activeBin.expectedPrice})`)
          console.log(`  Protocol fees: ${health.fees.total} (${health.fees.health})`)

          // Trigger alarm conditions
          if (health.liquidity.health === 'Needs attention') {
            console.log(`  ⚠️  Warning: Abnormal liquidity ratio`)
          }

          if (health.fees.health === 'Collectable') {
            console.log(`  💰 Suggestion: Consider collecting protocol fees`)
          }

        } catch (error) {
          console.error(`Monitoring pool ${poolId} failed:`, error)
        }
      }

      console.log('=== Monitoring ended ===\n')
    }, checkIntervalMs)

    return () => clearInterval(intervalId)
  }
}
```

### Example 2: Automated Pool Creation Factory

```typescript
class PoolFactory {
  private sdk: CetusDlmmSDK
  private feeConfigs: Map<number, { binStep: number; baseFactor: number; feePercentage: string }>

  constructor() {
    this.sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })

    // Initialize fee configuration
    this.feeConfigs = new Map([
      [1, { binStep: 1, baseFactor: 10000, feePercentage: '0.01%' }],
      [2, { binStep: 1, baseFactor: 20000, feePercentage: '0.02%' }],
      [3, { binStep: 2, baseFactor: 15000, feePercentage: '0.03%' }],
      [4, { binStep: 2, baseFactor: 20000, feePercentage: '0.04%' }],
      [5, { binStep: 5, baseFactor: 10000, feePercentage: '0.05%' }],
      [10, { binStep: 10, baseFactor: 10000, feePercentage: '0.10%' }],
      [15, { binStep: 15, baseFactor: 10000, feePercentage: '0.15%' }],
      [20, { binStep: 20, baseFactor: 10000, feePercentage: '0.20%' }],
      [25, { binStep: 25, baseFactor: 10000, feePercentage: '0.25%' }],
      [30, { binStep: 30, baseFactor: 10000, feePercentage: '0.30%' }],
      [40, { binStep: 50, baseFactor: 8000, feePercentage: '0.40%' }],
      [60, { binStep: 80, baseFactor: 7500, feePercentage: '0.60%' }],
      [80, { binStep: 100, baseFactor: 8000, feePercentage: '0.80%' }],
      [100, { binStep: 100, baseFactor: 10000, feePercentage: '1.00%' }],
      [200, { binStep: 200, baseFactor: 10000, feePercentage: '2.00%' }],
      [400, { binStep: 400, baseFactor: 10000, feePercentage: '4.00%' }]
    ])
  }

  // Get configuration based on target fee rate
  getConfigForFee(targetFeeBps: number) {
    // Convert basis points to configuration index (e.g., 10bps = 0.10%)
    const configKey = Math.round(targetFeeBps / 10) * 10

    if (this.feeConfigs.has(configKey)) {
      return this.feeConfigs.get(configKey)!
    }

    // Return the closest configuration
    const availableKeys = Array.from(this.feeConfigs.keys())
    const closestKey = availableKeys.reduce((prev, curr) => {
      return Math.abs(curr - configKey) < Math.abs(prev - configKey) ? curr : prev
    })

    return this.feeConfigs.get(closestKey)!
  }

  // Create standardized DLMM pool
  async createStandardPool(options: {
    coinTypeA: string
    coinTypeB: string
    initialPrice: string
    targetFeeBps: number  // Target fee rate (basis points), e.g., 10 means 0.10%
    url?: string
    addInitialLiquidity?: {
      amountA: string
      amountB: string
      priceRange: { lower: string; upper: string }
    }
  }) {
    this.sdk.setSenderAddress(walletAddress)

    // 1. Get fee configuration
    const feeConfig = this.getConfigForFee(options.targetFeeBps)
    console.log(`Using fee configuration: ${feeConfig.feePercentage} (Bin step: ${feeConfig.binStep}, base factor: ${feeConfig.baseFactor})`)

    // 2. Calculate active Bin ID
    const activeId = BinUtils.getBinIdFromPrice(
      options.initialPrice,
      feeConfig.binStep,
      true,
      6, // Assuming 6 decimal places
      6
    )

    // 3. Create transaction
    const tx = new Transaction()

    const poolId = await this.sdk.Pool.createPoolPayload({
      active_id: activeId,
      bin_step: feeConfig.binStep,
      coin_type_a: options.coinTypeA,
      coin_type_b: options.coinTypeB,
      base_factor: feeConfig.baseFactor,
      url: options.url
    }, tx)

    console.log(`Pool creation transaction built successfully, pool ID: ${poolId}`)

    // 4. If initial liquidity needs to be added
    if (options.addInitialLiquidity) {
      const { amountA, amountB, priceRange } = options.addInitialLiquidity

      // Calculate Bin ID corresponding to price range
      const lowerBinId = BinUtils.getBinIdFromPrice(
        priceRange.lower,
        feeConfig.binStep,
        true,
        6,
        6
      )
      const upperBinId = BinUtils.getBinIdFromPrice(
        priceRange.upper,
        feeConfig.binStep,
        true,
        6,
        6
      )

      // Get active Bin information
      const pool = await this.sdk.Pool.getPool(poolId)
      const activeBinInfo = await this.sdk.Position.getActiveBinIfInRange(
        pool.bin_manager.bin_manager_handle,
        lowerBinId,
        upperBinId,
        activeId,
        feeConfig.binStep
      )

      if (!activeBinInfo) {
        throw new Error('Initial liquidity price range is not within active Bin')
      }

      // Calculate liquidity distribution
      const binInfos = await this.sdk.Position.calculateAddLiquidityInfo({
        pool_id: poolId,
        amount_a: amountA,
        amount_b: amountB,
        active_id: activeId,
        bin_step: feeConfig.binStep,
        lower_bin_id: lowerBinId,
        upper_bin_id: upperBinId,
        active_bin_of_pool: activeBinInfo,
        strategy_type: 0  // Spot strategy
      })

      // Add liquidity
      this.sdk.Position.addLiquidityPayload({
        pool_id: poolId,
        bin_infos: binInfos,
        coin_type_a: options.coinTypeA,
        coin_type_b: options.coinTypeB,
        active_id: activeId,
        strategy_type: 0,
        use_bin_infos: false,
        max_price_slippage: 0.01,
        bin_step: feeConfig.binStep
      }, tx)

      console.log('Initial liquidity addition completed')
    }

    // 5. Set Gas budget
    tx.setGasBudget(15000000000) // Higher budget for combined transaction

    return {
      tx,
      poolId,
      config: {
        feePercentage: feeConfig.feePercentage,
        binStep: feeConfig.binStep,
        baseFactor: feeConfig.baseFactor,
        activeId
      }
    }
  }
}
```

## Best Practices

### 1. Fee Configuration Selection
- **Stablecoin pairs**: Use low fee configuration (0.01%-0.10%), smaller Bin step
- **Volatile tokens**: Use moderate fee configuration (0.10%-1.00%), medium Bin step
- **Highly volatile tokens**: Use high fee configuration (1.00%-4.00%), larger Bin step

### 2. Initial Price Setting
- Set initial price based on current market price
- Use `BinUtils.getBinIdFromPrice()` to ensure price aligns with Bin step
- Consider market volatility, set reasonable price range

### 3. Liquidity Management
- Consider adding initial liquidity when creating pool
- Monitor liquidity balance to avoid excessive unilateral liquidity
- Regularly evaluate and adjust liquidity strategy

### 4. Monitoring and Alerts
- Set key metric thresholds (e.g., liquidity ratio, fee accumulation)
- Implement automated monitoring and notification mechanisms
- Generate regular pool health reports

### 5. Gas Optimization
- Use batch operations to reduce transaction count
- Set reasonable Gas budget
- Execute pool creation operations during network off-peak hours

## Troubleshooting

### Common Issues

**1. "Pool creation failed: Invalid parameters"**
- **Cause**: Bin step, base factor, or active Bin ID calculation error
- **Solution**:
  - Verify that the combination of Bin step and base factor matches the fee configuration table
  - Recalculate active Bin ID using `BinUtils.getBinIdFromPrice()`
  - Check coin type format is correct

**2. "Insufficient Gas budget"**
- **Cause**: Combined pool creation and liquidity addition operations require more Gas
- **Solution**:
  - Increase Gas budget: `tx.setGasBudget(15000000000)`
  - Execute step by step: first create pool, then add liquidity separately
  - Execute during network off-peak hours

**3. "Initial liquidity price range invalid"**
- **Cause**: Price range is not within active Bin or exceeds limits
- **Solution**:
  - Use `getActiveBinIfInRange()` to verify active Bin
  - Adjust price range to ensure it includes current price
  - Consider using a wider price range

**4. "Pool query returns empty or error"**
- **Cause**: Pool ID is incorrect or pool does not exist
- **Solution**:
  - Verify pool ID format and correctness
  - Check if pool was successfully created
  - Add error handling using `getPoolWithCache()`

### Debugging Suggestions

```typescript
async function debugPoolCreation() {
  try {
    // 1. Validate parameters
    const params = await preparePoolCreation()
    console.log('Pool creation parameters:', params)

    // 2. Validate Bin ID calculation
    const price = BinUtils.getPriceFromBinId(params.activeId, params.binStep, 6, 6)
    console.log(`Price corresponding to active Bin ID ${params.activeId}: ${price}`)

    // 3. Simulate transaction
    const { tx } = await createDlmmPool()
    const simResult = await sdk.FullClient.sendSimulationTransaction(tx, walletAddress)

    if (simResult.effects.status.status === 'success') {
      console.log('Pool creation transaction simulation successful')
    } else {
      console.error('Pool creation transaction simulation failed:', simResult)
    }

  } catch (error) {
    console.error('Pool creation debugging error:', error)
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
  }
}
```

## Performance Optimization

### 1. Cache Optimization
```typescript
class OptimizedPoolManager {
  private poolCache = new Map()
  private cacheDuration = 5 * 60 * 1000 // 5 minutes

  async getPoolOptimized(poolId: string) {
    const cacheKey = `pool_${poolId}`

    if (this.poolCache.has(cacheKey)) {
      const { data, timestamp } = this.poolCache.get(cacheKey)
      if (Date.now() - timestamp < this.cacheDuration) {
        return data
      }
    }

    const pool = await sdk.Pool.getPool(poolId)
    this.poolCache.set(cacheKey, {
      data: pool,
      timestamp: Date.now()
    })

    return pool
  }
}
```

### 2. Batch Query Optimization
```typescript
async function batchGetPools(poolIds: string[]) {
  const promises = poolIds.map(poolId =>
    sdk.Pool.getPool(poolId).catch(error => ({
      id: poolId,
      error: error.message
    }))
  )

  return Promise.all(promises)
}
```

### 3. Pre-computation Optimization
For frequent identical pool operations, pre-compute and cache results:
```typescript
const poolCreationCache = new Map()

async function getCachedPoolCreationParams(coinTypeA: string, coinTypeB: string, binStep: number, price: string) {
  const cacheKey = `${coinTypeA}-${coinTypeB}-${binStep}-${price}`

  if (!poolCreationCache.has(cacheKey)) {
    const activeId = BinUtils.getBinIdFromPrice(price, binStep, true, 6, 6)
    poolCreationCache.set(cacheKey, { activeId, binStep })

    // Short-term cache (price may change)
    setTimeout(() => poolCreationCache.delete(cacheKey), 30 * 1000)
  }

  return poolCreationCache.get(cacheKey)
}
```

## Security Considerations

### 1. Parameter Validation
- Validate the validity of all input parameters
- Check coin type format and existence
- Verify fee configuration reasonableness

### 2. Transaction Security
- Always simulate before executing actual transactions
- Verify transaction results and status
- Monitor Gas fees and confirmation times

### 3. Permission Management
- Limit pool creation and management permissions
- Implement multi-signature approval mechanisms
- Log all management operations

### 4. Risk Control
- Set pool creation quantity limits
- Monitor abnormal behaviors and attack patterns
- Prepare emergency response plans

---

**Note**: This document is based on Cetus DLMM SDK v1.0.3 and the test file `pool.test.ts`. For actual use, please refer to the latest SDK documentation and test cases.

Pool management is the core of the DLMM ecosystem. Proper configuration and management of pools can ensure the best experience for liquidity providers and traders. It is recommended to thoroughly test in production environments and establish a comprehensive monitoring system.