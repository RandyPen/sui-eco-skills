# Pool Operations

This guide covers CLMM pool operations including creating pools, querying pool information, fetching ticks, and managing pool data.

## Overview

CLMM pools are the foundation of the Cetus protocol. Each pool:
- Contains two tokens (trading pair)
- Has concentrated liquidity with customizable tick ranges
- Earns fees from swaps within active price ranges
- Can have multiple liquidity positions

## Creating CLMM Pools

### Basic Pool Creation

Create a new CLMM pool with initial liquidity:

```typescript
import CetusClmmSDK from '@cetusprotocol/sui-clmm-sdk'
import { TickMath } from '@cetusprotocol/common-sdk'
import BN from 'bn.js'

async function createPool() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Calculate initial sqrt price from desired price
  const initialPrice = 1.0 // 1 SUI = 1 USDC
  const initialSqrtPrice = TickMath.priceToSqrtPriceX64(
    initialPrice,
    9, // SUI decimals
    6  // USDC decimals
  )

  const params = {
    // Token pair
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',

    // Pool configuration
    tick_spacing: '10', // Minimum tick distance between positions
    initialize_sqrt_price: initialSqrtPrice.toString(),

    // Initial liquidity
    amount_a: '1000000000', // 10 SUI (9 decimals)
    amount_b: '10000000',   // 10 USDC (6 decimals)
    fix_amount_a: true,     // true = fixed token A amount

    // Position range for initial liquidity
    tick_lower: '-1000',
    tick_upper: '1000',

    // Pool metadata
    uri: 'https://cetus.zone/pool/metadata.json'
  }

  const payload = await sdk.Pool.createPoolPayload(params)
  return payload
}
```

### Calculate Initialization Parameters

Calculate optimal parameters for pool creation:

```typescript
import { TickMath, TickUtil } from '@cetusprotocol/common-sdk'

function calculatePoolParameters(
  tokenA: string,
  tokenB: string,
  initialPrice: number,
  tokenADecimals: number,
  tokenBDecimals: number,
  tickSpacing: number = 10
) {
  // Convert price to sqrt price
  const sqrtPrice = TickMath.priceToSqrtPriceX64(
    initialPrice,
    tokenADecimals,
    tokenBDecimals
  )

  // Calculate initial tick index
  const tickIndex = TickMath.priceToInitializeTickIndex(
    initialPrice,
    tokenADecimals,
    tokenBDecimals,
    tickSpacing
  )

  // Determine default tick range around initial price
  const rangeTicks = 1000 // ±10% range for initial liquidity
  const lowerTick = TickUtil.getNearestTickByTick(tickIndex - rangeTicks, tickSpacing)
  const upperTick = TickUtil.getNearestTickByTick(tickIndex + rangeTicks, tickSpacing)

  return {
    initialize_sqrt_price: sqrtPrice.toString(),
    tick_spacing: tickSpacing.toString(),
    tick_lower: lowerTick.toString(),
    tick_upper: upperTick.toString(),
    initial_tick_index: tickIndex
  }
}
```

### Create Pool with Custom Configuration

Advanced pool creation with custom parameters:

```typescript
async function createCustomPool() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Get pool configuration from SDK options
  const clmmConfig = await sdk.Pool.getClmmConfig()
  console.log('Available fee tiers:', clmmConfig.fee_tier)

  const params = {
    coin_type_a: '0x2::sui::SUI',
    coin_type_b: '0x...::usdc::USDC',

    // Use specific fee tier (e.g., 0.3% fee)
    tick_spacing: clmmConfig.fee_tier['0.3%'].tick_spacing.toString(),

    // Custom initial price
    initialize_sqrt_price: '79228162514264337593543950336', // sqrt(1.0)

    // Initial liquidity amounts
    amount_a: '5000000000', // 50 SUI
    amount_b: '50000000',   // 50 USDC
    fix_amount_a: true,

    // Wide initial range for bootstrapping
    tick_lower: '-10000',
    tick_upper: '10000',

    uri: ''
  }

  const payload = await sdk.Pool.createPoolPayload(params)

  // Optional: add more liquidity in different ranges
  // const addLiquidityTx = await sdk.Position.createAddLiquidityPayload(...)
  // payload.merge(addLiquidityTx)

  return payload
}
```

## Getting CLMM Pools

### List All Pools

Get paginated list of all pools:

```typescript
async function listAllPools() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Get all pools (paginated)
  const poolsPage = await sdk.Pool.getPoolsWithPage('all')

  console.log(`Total pools: ${poolsPage.data.length}`)
  console.log(`Has next page: ${poolsPage.has_next_page}`)

  poolsPage.data.forEach((pool, index) => {
    console.log(`${index + 1}. ${pool.id}`)
    console.log(`   ${pool.coin_type_a} / ${pool.coin_type_b}`)
    console.log(`   TVL: ${pool.tvl_usd}`)
    console.log(`   Volume 24h: ${pool.volume_usd_24h}`)
  })

  return poolsPage
}
```

### Get Pools with Pagination

Get pools with pagination controls:

```typescript
async function getPoolsWithPagination() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // First page
  const page1 = await sdk.Pool.getPoolsWithPage({ limit: 10 })
  console.log(`Page 1: ${page1.data.length} pools`)

  // Next page using cursor
  if (page1.has_next_page) {
    const page2 = await sdk.Pool.getPoolsWithPage({
      cursor: page1.data[page1.data.length - 1].id,
      limit: 10
    })
    console.log(`Page 2: ${page2.data.length} pools`)
  }

  return page1
}
```

### Get Specific Pool

Get detailed information for a specific pool:

```typescript
async function getPoolDetails(poolId: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  try {
    // Get pool with cache bypass
    const pool = await sdk.Pool.getPool(poolId, true) // true = force refresh

    console.log('Pool Details:')
    console.log(`- ID: ${pool.id}`)
    console.log(`- Tokens: ${pool.coin_type_a} / ${pool.coin_type_b}`)
    console.log(`- Current Price: ${pool.current_price}`)
    console.log(`- Liquidity: ${pool.liquidity}`)
    console.log(`- Tick Spacing: ${pool.tick_spacing}`)
    console.log(`- Fee Tier: ${pool.fee_rate}`)
    console.log(`- TVL: $${pool.tvl_usd}`)
    console.log(`- Volume 24h: $${pool.volume_usd_24h}`)

    // Get pool status (active/inactive)
    const poolStatus = await sdk.Pool.getPoolStatus(poolId)
    console.log(`- Status: ${poolStatus || 'active'}`)

    return pool
  } catch (error) {
    console.error('Failed to get pool details:', error)
    throw error
  }
}
```

### Get Multiple Specific Pools

Get multiple pools by their IDs:

```typescript
async function getMultiplePools(poolIds: string[]) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const pools = await sdk.Pool.getAssignPools(poolIds)

  console.log(`Retrieved ${pools.length} pools:`)
  pools.forEach(pool => {
    console.log(`- ${pool.id}: ${pool.current_price} price, ${pool.liquidity} liquidity`)
  })

  return pools
}
```

### Find Pool by Token Pair

Find pools for a specific token pair:

```typescript
async function findPoolByTokens(tokenA: string, tokenB: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const pools = await sdk.Pool.getPoolByCoins([tokenA, tokenB])

  if (pools.length === 0) {
    console.log('No pools found for this token pair')
    return null
  }

  console.log(`Found ${pools.length} pools:`)
  pools.forEach((pool, index) => {
    console.log(`${index + 1}. ${pool.id}`)
    console.log(`   Fee: ${pool.fee_rate}`)
    console.log(`   Liquidity: ${pool.liquidity}`)
    console.log(`   Volume 24h: $${pool.volume_usd_24h}`)
  })

  // Return the pool with highest liquidity
  return pools.sort((a, b) => parseFloat(b.liquidity) - parseFloat(a.liquidity))[0]
}
```

## Getting Ticks

### Fetch Ticks for a Pool

Get tick data for a pool (price points with liquidity):

```typescript
async function getPoolTicks(poolId: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // First get pool to obtain tick handle
  const pool = await sdk.Pool.getPool(poolId)

  const params = {
    pool_id: poolId,
    coin_type_a: pool.coin_type_a,
    coin_type_b: pool.coin_type_b
  }

  try {
    // Fetch ticks using the pool's tick handle
    const ticks = await sdk.Pool.fetchTicks(params)

    console.log(`Found ${ticks.length} ticks for pool ${poolId}`)

    // Analyze tick distribution
    const activeTicks = ticks.filter(tick => tick.liquidity_net !== '0')
    console.log(`${activeTicks.length} active ticks with liquidity`)

    // Show price range
    if (ticks.length > 0) {
      const minTick = Math.min(...ticks.map(t => t.index))
      const maxTick = Math.max(...ticks.map(t => t.index))
      console.log(`Tick range: ${minTick} to ${maxTick}`)
    }

    return ticks
  } catch (error) {
    console.error('Failed to fetch ticks:', error)
    throw error
  }
}
```

### Fetch Ticks by RPC

Alternative method using direct RPC call:

```typescript
async function getTicksByRpc(poolId: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const pool = await sdk.Pool.getPool(poolId)

  // Get tick handle from pool object
  const tickHandle = pool.tick_manager.fields.id.id

  const ticks = await sdk.Pool.fetchTicksByRpc(tickHandle)

  console.log(`Fetched ${ticks.length} ticks via RPC`)
  return ticks
}
```

### Get Tick Data by Index

Get specific tick information:

```typescript
async function getTickData(poolId: string, tickIndex: number) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const pool = await sdk.Pool.getPool(poolId)

  // Get tick data by index
  const tickData = await sdk.Pool.getTickDataByIndex(
    poolId,
    pool.coin_type_a,
    pool.coin_type_b,
    tickIndex
  )

  if (tickData) {
    console.log(`Tick ${tickIndex}:`)
    console.log(`- Liquidity Gross: ${tickData.liquidity_gross}`)
    console.log(`- Liquidity Net: ${tickData.liquidity_net}`)
    console.log(`- Fee Growth Outside: ${tickData.fee_growth_outside_a}`)
  }

  return tickData
}
```

### Analyze Tick Liquidity

Analyze liquidity distribution across ticks:

```typescript
import { TickMath } from '@cetusprotocol/common-sdk'

async function analyzeTickLiquidity(poolId: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })
  const pool = await sdk.Pool.getPool(poolId)
  const ticks = await sdk.Pool.fetchTicks({ pool_id: poolId, coin_type_a: pool.coin_type_a, coin_type_b: pool.coin_type_b })

  let totalLiquidity = new BN(0)
  const liquidityByRange: Array<{ range: string; liquidity: BN; percentage: number }> = []

  // Group ticks by price ranges
  const ranges = [
    { name: 'Very Low', min: -Infinity, max: -10000 },
    { name: 'Low', min: -10000, max: -1000 },
    { name: 'Medium', min: -1000, max: 1000 },
    { name: 'High', min: 1000, max: 10000 },
    { name: 'Very High', min: 10000, max: Infinity }
  ]

  ticks.forEach(tick => {
    const liquidity = new BN(tick.liquidity_gross)
    totalLiquidity = totalLiquidity.add(liquidity)

    // Convert tick to price for analysis
    const price = TickMath.tickIndexToPrice(
      tick.index,
      9, // Adjust based on token decimals
      6
    )

    // Find range
    const range = ranges.find(r => tick.index >= r.min && tick.index < r.max)
    if (range) {
      const existing = liquidityByRange.find(r => r.range === range.name)
      if (existing) {
        existing.liquidity = existing.liquidity.add(liquidity)
      } else {
        liquidityByRange.push({
          range: range.name,
          liquidity,
          percentage: 0
        })
      }
    }
  })

  // Calculate percentages
  liquidityByRange.forEach(range => {
    range.percentage = totalLiquidity.gt(new BN(0))
      ? range.liquidity.muln(100).div(totalLiquidity).toNumber()
      : 0
  })

  console.log('Liquidity Distribution:')
  liquidityByRange.forEach(range => {
    console.log(`${range.range}: ${range.percentage.toFixed(2)}%`)
  })

  return { totalLiquidity, distribution: liquidityByRange }
}
```

## Pool Information and Statistics

### Get Pool Liquidity Snapshot

Get detailed liquidity snapshot:

```typescript
async function getPoolSnapshot(poolId: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const snapshot = await sdk.Pool.getPoolLiquiditySnapshot(poolId, true)

  console.log('Pool Liquidity Snapshot:')
  console.log(`- Total Liquidity: ${snapshot.liquidity}`)
  console.log(`- Sqrt Price: ${snapshot.sqrt_price}`)
  console.log(`- Fee Growth Global A: ${snapshot.fee_growth_global_a}`)
  console.log(`- Fee Growth Global B: ${snapshot.fee_growth_global_b}`)
  console.log(`- Rewarders: ${snapshot.rewarder_infos?.length || 0}`)

  return snapshot
}
```

### Get Pool Transaction History

Get transaction history for a pool:

```typescript
async function getPoolTransactions(poolId: string, limit: number = 50) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const transactions = await sdk.Pool.getPoolTransactionList({
    pool_id: poolId,
    pagination_args: { limit },
    order: 'descending' // Most recent first
  })

  console.log(`Last ${transactions.length} transactions:`)
  transactions.data.forEach((tx, index) => {
    console.log(`${index + 1}. ${tx.digest}`)
    console.log(`   Type: ${tx.type}`)
    console.log(`   Timestamp: ${new Date(tx.timestamp).toLocaleString()}`)
    if (tx.amounts) {
      console.log(`   Amounts: ${JSON.stringify(tx.amounts)}`)
    }
  })

  return transactions
}
```

### Get Pool Position List

Get all positions in a pool:

```typescript
async function getPoolPositions(poolId: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const positions = await sdk.Pool.fetchPoolPositionInfoList(poolId)

  console.log(`Pool ${poolId} has ${positions.length} positions:`)

  // Group by position status
  const activePositions = positions.filter(p => p.status === 'Active')
  const closedPositions = positions.filter(p => p.status === 'Closed')

  console.log(`- Active: ${activePositions.length}`)
  console.log(`- Closed: ${closedPositions.length}`)

  // Show largest positions
  const topPositions = positions
    .sort((a, b) => parseFloat(b.liquidity) - parseFloat(a.liquidity))
    .slice(0, 5)

  console.log('Top 5 positions by liquidity:')
  topPositions.forEach((pos, index) => {
    console.log(`${index + 1}. ${pos.position_id}: ${pos.liquidity} liquidity`)
  })

  return positions
}
```

## Pool Configuration

### Get CLMM Configuration

Get protocol-wide configuration:

```typescript
async function getClmmConfig() {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const config = await sdk.Pool.getClmmConfig()

  console.log('CLMM Configuration:')
  console.log(`- Protocol Fee Rate: ${config.protocol_fee_rate}`)
  console.log(`- Fee Tiers:`, config.fee_tier)

  // Available fee tiers
  Object.entries(config.fee_tier).forEach(([feeRate, tier]) => {
    console.log(`  ${feeRate}: tick spacing ${tier.tick_spacing}`)
  })

  return config
}
```

## Best Practices

### 1. Cache Management
- Use caching for frequently accessed pool data
- Force refresh when you need latest state
- Cache pool lists for 24 hours, individual pools for shorter periods

```typescript
// Use cache appropriately
const pool = await sdk.Pool.getPool(poolId, false) // Use cache
const freshPool = await sdk.Pool.getPool(poolId, true) // Force refresh
```

### 2. Batch Operations
Batch related operations for efficiency:

```typescript
async function batchGetPools(poolIds: string[]) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  // Batch get objects for efficiency
  const pools = await sdk.Pool.getAssignPools(poolIds)

  // Then fetch additional data as needed
  const snapshots = await Promise.all(
    pools.map(pool => sdk.Pool.getPoolLiquiditySnapshot(pool.id))
  )

  return { pools, snapshots }
}
```

### 3. Error Handling
Handle common pool errors:

```typescript
async function safePoolOperation(operation: () => Promise<any>) {
  try {
    return await operation()
  } catch (error: any) {
    if (error.message?.includes('Pool not found')) {
      console.error('Pool does not exist or is inaccessible')
    } else if (error.message?.includes('Invalid pool object')) {
      console.error('Pool object corrupted or invalid')
    } else if (error.message?.includes('Fetch error')) {
      console.error('Network error fetching pool data')
    } else {
      console.error('Pool operation failed:', error)
    }
    throw error
  }
}
```

### 4. Monitoring Pool Health
Monitor pool metrics for health checks:

```typescript
async function checkPoolHealth(poolId: string) {
  const sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })

  const pool = await sdk.Pool.getPool(poolId)
  const snapshot = await sdk.Pool.getPoolLiquiditySnapshot(poolId)

  const health = {
    liquidity: parseFloat(pool.liquidity),
    volume24h: parseFloat(pool.volume_usd_24h || '0'),
    fee24h: parseFloat(pool.fees_usd_24h || '0'),
    activePositions: (await sdk.Pool.fetchPoolPositionInfoList(poolId)).length,
    tickCoverage: 0 // Calculate based on tick data
  }

  // Health indicators
  const isHealthy = health.liquidity > 1000 // Minimum liquidity threshold
  const isActive = health.volume24h > 100 // Minimum volume threshold

  return {
    ...health,
    isHealthy,
    isActive,
    recommendation: isHealthy && isActive ? 'Pool is healthy' : 'Consider alternative pools'
  }
}
```

## Common Issues and Solutions

### Pool Not Found
**Problem**: `getPool` returns "Pool not found" error.
**Solution**:
- Verify pool ID format and network
- Check if pool exists on current network (mainnet/testnet)
- Ensure you have proper permissions to access the pool

### Insufficient Tick Data
**Problem**: `fetchTicks` returns empty or incomplete data.
**Solution**:
- Check if pool has active liquidity positions
- Verify tick handle from pool object
- Try `fetchTicksByRpc` as alternative method

### Creation Failed
**Problem**: `createPoolPayload` fails or transaction reverts.
**Solution**:
- Verify token pair is supported
- Check tick spacing matches fee tier
- Ensure sufficient balance for initial liquidity
- Validate sqrt price calculation

### Performance Issues
**Problem**: Pool queries are slow or timing out.
**Solution**:
- Use pagination for large pool lists
- Cache frequently accessed data
- Batch related operations
- Consider using indexed RPC endpoints

## Next Steps

After working with pools, you may want to:
- **Add liquidity**: See [Liquidity Management](liquidity-management.md)
- **Execute swaps**: Check [Swap Operations](swap-operations.md)
- **Monitor positions**: Implement position tracking
- **Analyze data**: Build analytics on pool performance