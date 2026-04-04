---
name: cetus-dlmm-sdk-skill
description: Guides users on how to use the Cetus DLMM TypeScript SDK for liquidity management, trading operations, and fee calculations. Use this skill when users need to operate Cetus DLMM liquidity pools, manage positions, execute swaps, or calculate price fees.
---

# Cetus DLMM TypeScript SDK Usage Guide

## Overview
Cetus DLMM (Dynamic Liquidity Market Maker) SDK v2 provides comprehensive tools for interacting with Cetus Protocol's DLMM on Sui blockchain. The SDK supports liquidity management, pool operations, swaps, and position management with multiple strategy types.

## Quick Start

### Installation
```bash
npm install @cetusprotocol/dlmm-sdk
```

### SDK Initialization

**Option 1: Use default mainnet configuration**
```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'

const sdk = CetusDlmmSDK.createSDK()
```

**Option 2: Specify network environment**
```typescript
// For mainnet
const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })

// For testnet
const sdk = CetusDlmmSDK.createSDK({ env: 'testnet' })
```

**Option 3: Use custom gRPC endpoint**
```typescript
const sdk = CetusDlmmSDK.createSDK({ 
  env: 'mainnet',
  full_rpc_url: 'YOUR_GRPC_ENDPOINT' 
})
```

**Option 4: Use custom SuiClient**
```typescript
import { SuiClient } from '@mysten/sui/client'

const suiClient = new SuiClient({ url: 'grpc://fullnode.mainnet.sui.io:443' })
const sdk = CetusDlmmSDK.createSDK({ env: 'mainnet', sui_client: suiClient })
```

**Set Sender Address**
```typescript
const wallet = 'YOUR_WALLET_ADDRESS'
sdk.setSenderAddress(wallet)
```

**Update RPC URL**
```typescript
const new_rpc_url = 'YOUR_NEW_FULL_NODE_URL'
sdk.updateFullRpcUrl(new_rpc_url)
```

## Core Concepts

### Differences between DLMM and Traditional AMM
DLMM (Dynamic Liquidity Market Maker) is Cetus Protocol's next-generation AMM protocol. Compared with traditional CLMM (Concentrated Liquidity Market Maker), it has the following characteristics:

1. **Bin System**: Uses discrete bins instead of continuous ticks
2. **Dynamic Liquidity**: Liquidity automatically rebalances within price ranges
3. **Multi-Strategy Support**: Three strategy types: Spot, BidAsk, and Curve
4. **Fee Optimization**: Variable fee mechanism and protocol fee separation

### Bin System and Bin Step
- **Bin**: Discrete price intervals, each with independent liquidity
- **Bin Step**: Price interval between bins (expressed in basis points)
- **Bin ID**: Unique identifier, the price relationship can be calculated via `BinUtils`

### Three Strategy Types
1. **Spot Strategy**: Spot strategy, suitable for providing liquidity around the current price
2. **BidAsk Strategy**: Bid-ask strategy, suitable for market makers
3. **Curve Strategy**: Curve strategy, automatically adjusts liquidity distribution

### Fee Structure
- **Base Fee**: Fixed fee rate
- **Variable Fee**: Dynamically adjusted based on market volatility
- **Protocol Fee**: Portion of fees collected by the protocol
- **Partner Fee**: Fee sharing for referred partners

## Default Fee Options

The SDK provides predefined fee configurations for different types of trading pairs:

```typescript
const dlmmDefaultFeeOptions = [
  { binStep: 1, baseFactor: 10000, fee: '0.0001' },
  { binStep: 1, baseFactor: 20000, fee: '0.0002' },
  { binStep: 2, baseFactor: 15000, fee: '0.0003' },
  { binStep: 2, baseFactor: 20000, fee: '0.0004' },
  { binStep: 5, baseFactor: 10000, fee: '0.0005' },
  { binStep: 10, baseFactor: 10000, fee: '0.001' },
  { binStep: 15, baseFactor: 10000, fee: '0.0015' },
  { binStep: 20, baseFactor: 10000, fee: '0.002' },
  { binStep: 25, baseFactor: 10000, fee: '0.0025' },
  { binStep: 30, baseFactor: 10000, fee: '0.003' },
  { binStep: 50, baseFactor: 8000, fee: '0.004' },
  { binStep: 80, baseFactor: 7500, fee: '0.006' },
  { binStep: 100, baseFactor: 8000, fee: '0.008' },
  { binStep: 100, baseFactor: 10000, fee: '0.01' },
  { binStep: 200, baseFactor: 10000, fee: '0.02' },
  { binStep: 400, baseFactor: 10000, fee: '0.04' }
]
```

**Fee Tier Recommendations:**
- **Low fees (0.01% - 0.05%)**: Best for stable pairs or low-volatility mainstream assets
- **Medium fees (0.1% - 0.3%)**: Suitable for medium-volatility assets or mainstream trading pairs
- **High fees (0.4% - 4%)**: Recommended for high-volatility assets, altcoins, or small market cap pairs

## Core Operations

### 1. Pool Operations

#### Get Pool Information
```typescript
// Get all pools
const pools = await sdk.Pool.getPools()

// Get specific pool
const pool = await sdk.Pool.getPool(pool_id)

// Get specific pools by their IDs
const assign_pools = await sdk.Pool.getAssignPoolList([
  '0x...',
])

// Get bin information
const bin_info = await sdk.Pool.getBinInfo(pool_id, bin_id, bin_step)

// Get pool bin information
const pool_bin_info = await sdk.Pool.getPoolBinInfo(pool_id)

// Get bin step configurations
const bin_step_configs = await sdk.Pool.getBinStepConfigs()

// Get pool transaction list
const pool_transactions = await sdk.Pool.getPoolTransactionList({
  pool_id: '0x...',
  pagination_args: { limit: 10 }
})
```

#### Create Pool

**Method 1: Create Pool Only**
```typescript
const bin_step = 2
const base_factor = 10000
const price = '1.1'
const active_id = BinUtils.getBinIdFromPrice(price, bin_step, true, 6, 6)

const tx = new Transaction()
await sdk.Pool.createPoolPayload({
  active_id,
  bin_step,
  coin_type_a: '0x...::usdc::USDC',
  coin_type_b: '0x...::usdt::USDT',
  base_factor,
}, tx)
```

**Method 2: Create Pool and Add Liquidity in One Transaction**
```typescript
const bin_infos = sdk.Position.calculateAddLiquidityInfo({
  active_id,
  bin_step,
  lower_bin_id: active_id - 10,
  upper_bin_id: active_id + 10,
  amount_a_in_active_bin: '0',
  amount_b_in_active_bin: '0',
  strategy_type: StrategyType.Spot,
  coin_amount: '10000000',
  fix_amount_a: true,
})

const createAndAddTx = await sdk.Pool.createPoolAndAddLiquidityPayload({
  active_id,
  lower_bin_id: active_id - 10,
  upper_bin_id: active_id + 10,
  bin_step,
  bin_infos,
  coin_type_a: '0x...::usdc::USDC',
  coin_type_b: '0x...::eth::ETH',
  strategy_type: StrategyType.Spot,
  use_bin_infos: false,
  base_factor,
})
```

### 2. Position Operations

#### Get Position Information
```typescript
// Get owner's position list
const positions = await sdk.Position.getOwnerPositionList(wallet)

// Get specific position
const position = await sdk.Position.getPosition(position_id)
```

#### Add Liquidity

**Step 1: Calculate liquidity distribution**
```typescript
const calculateOption = {
  pool_id: '0x...',
  amount_a: '1000000',
  amount_b: '1200000',
  active_id: 100,
  bin_step: 2,
  lower_bin_id: 90,
  upper_bin_id: 110,
  amount_a_in_active_bin: '0',
  amount_b_in_active_bin: '0',
  strategy_type: StrategyType.Spot
}
const bin_infos = await sdk.Position.calculateAddLiquidityInfo(calculateOption)
```

**Step 2: Create transaction payload for new position**
```typescript
const addOption = {
  pool_id,
  bin_infos,
  coin_type_a: '0x...::usdc::USDC',
  coin_type_b: '0x...::usdt::USDT',
  lower_bin_id: 90,
  upper_bin_id: 110,
  active_id: 100,
  strategy_type: StrategyType.Spot,
  use_bin_infos: false,
  max_price_slippage: 0.01,
  bin_step: 2
}
const tx = sdk.Position.addLiquidityPayload(addOption)
```

**Add Liquidity to Existing Position**
```typescript
const addOption = {
  pool_id,
  bin_infos,
  coin_type_a,
  coin_type_b,
  active_id,
  position_id,
  collect_fee: true,
  reward_coins: [],
  strategy_type: StrategyType.Spot,
  use_bin_infos: false,
  max_price_slippage: 0.01,
  bin_step,
}
const tx = sdk.Position.addLiquidityPayload(addOption)
```

#### Add Liquidity with Price
```typescript
const addOption = {
  pool_id,
  bin_infos,
  coin_type_a: pool.coin_type_a,
  coin_type_b: pool.coin_type_b,
  price_base_coin: 'coin_a',
  price: price.toString(),
  lower_price,
  upper_price,
  bin_step,
  amount_a_in_active_bin: amounts_in_active_bin?.amount_a || '0',
  amount_b_in_active_bin: amounts_in_active_bin?.amount_b || '0',
  strategy_type: StrategyType.Spot,
  decimals_a: 6,
  decimals_b: 6,
  max_bin_slippage: 0.01,
  active_id,
  use_bin_infos: false,
}
const tx = sdk.Position.addLiquidityWithPricePayload(addOption)
```

#### Remove Liquidity
```typescript
// Calculate removal amounts
const calculateOption = {
  bins: liquidity_shares_data.bins,
  active_id,
  fix_amount_a: true,
  coin_amount: '100000'
}
const bin_infos = sdk.Position.calculateRemoveLiquidityInfo(calculateOption)

// Build and send transaction
const removeOption = {
  pool_id,
  bin_infos,
  coin_type_a: pool.coin_type_a,
  coin_type_b: pool.coin_type_b,
  position_id,
  active_id,
  slippage: 0.01,
  reward_coins: [],
  collect_fee: true,
  bin_step,
  remove_percent: 0.5,
}
const tx = sdk.Position.removeLiquidityPayload(removeOption)
```

#### Close Position
```typescript
// Close position (This will collect all fees, rewards and remove all liquidity)
const tx = sdk.Position.closePositionPayload({
  pool_id,
  position_id,
  coin_type_a,
  coin_type_b,
  reward_coins: pool.reward_manager.rewards.map(reward => reward.reward_coin)
})

// Simulate or send the transaction
const sim_result = await sdk.FullClient.sendSimulationTransaction(tx, wallet)
```

### 3. Fee Operations

#### Fee and Reward Calculation
```typescript
// First get the pool information
const pool = await sdk.Pool.getPool(pool_id)
const { id, coin_type_a, coin_type_b, reward_manager } = pool

// Fetch fee and reward data
const { feeData, rewardData } = await sdk.Position.fetchPositionFeeAndReward([
  {
    pool_id: id,
    position_id: position_id,
    reward_coins: reward_manager.rewards.map((reward) => reward.reward_coin),
    coin_type_a,
    coin_type_b,
  },
])
```

#### Fee Rate Calculations
```typescript
// Get total fee rate for a pool
const totalFeeRate = await sdk.Pool.getTotalFeeRate({
  pool_id,
  coin_type_a,
  coin_type_b
})

// Get variable fee from pool parameters
const variableFee = FeeUtils.getVariableFee(pool.variable_parameters)
```

#### FeeUtils Utility Methods

```typescript
import { FeeUtils, d, FEE_PRECISION } from '@cetusprotocol/dlmm-sdk'

// Get variable fee
const variableFee = FeeUtils.getVariableFee(pool.variable_parameters)
const variableFeePercentage = d(variableFee).div(d(FEE_PRECISION)).toString()

// Calculate composition fee
const compositionFee = FeeUtils.calculateCompositionFee(amount, total_fee_rate)

// Calculate protocol fee
const protocolFee = FeeUtils.calculateProtocolFee(fee_amount, protocol_fee_rate)

// Get protocol fees for both tokens
const { protocol_fee_a, protocol_fee_b } = FeeUtils.getProtocolFees(fee_a, fee_b, protocol_fee_rate)

// Get composition fees
const { fees_a, fees_b } = FeeUtils.getCompositionFees(active_bin, used_bin, variableParameters)
```

#### Fee and Reward Collection
```typescript
// Build collect fee and reward transaction
const tx = await sdk.Position.collectRewardAndFeePayload([{
  pool_id,
  position_id,
  reward_coins: reward_manager.rewards.map((reward) => reward.reward_coin),
  coin_type_a,
  coin_type_b
}])

// Simulate or send the transaction
const sim_result = await sdk.FullClient.sendSimulationTransaction(tx, wallet)
```

### 4. Swap Operations
```typescript
// Get pool information
const pool = await sdk.Pool.getPool(pool_id)
const { coin_type_a, coin_type_b } = pool

// Get swap quote
const quote_obj = await sdk.Swap.preSwapQuote({
  pool_id,
  a2b: true, // true for A to B, false for B to A
  by_amount_in: true, // true for exact input, false for exact output
  in_amount: '2000000',
  coin_type_a,
  coin_type_b
})

// Build and send swap transaction
const tx = sdk.Swap.swapPayload({
  coin_type_a,
  coin_type_b,
  quote_obj,
  by_amount_in: true,
  slippage: 0.01
})
```

### 5. Partner Operations
```typescript
// Get partner list
const partnerList = await sdk.Partner.getPartnerList()

// Get specific partner
const partner = await sdk.Partner.getPartner(partner_id)

// Create partner
const start_time = Math.floor(Date.now() / 1000) + 5000
const tx = sdk.Partner.createPartnerPayload({
  name: 'test partner',
  ref_fee_rate: 0.01,
  start_time,
  end_time: start_time + 9 * 24 * 3600,
  recipient: account,
})

// Update referral fee rate
const updateFeeTx = await sdk.Partner.updateRefFeeRatePayload({
  partner_id: '0x..',
  ref_fee_rate: 0.02,
})

// Claim ref fee
const tx = await sdk.Position.claimRefFeePayload({
  partner_id: "0x..",
  partner_cap_id: "0x..",
  fee_coin_types: [coin_type]
})
```

### 6. Reward Operations
```typescript
// Initialize rewards for a pool
const initTx = sdk.Reward.initRewardPayload({
  pool_id,
  reward_coin_types: ['0x2::sui::SUI', '0x5::usdc::USDC']
})

// Add reward to a pool
const addRewardTx = sdk.Reward.addRewardPayload({
  pool_id,
  reward_coin_type: '0x2::sui::SUI',
  reward_amount: '1000000',
  end_time_seconds: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
  start_time_seconds: Math.floor(Date.now() / 1000) + 3600,
})

// Update reward access (public/private)
const accessTx = sdk.Reward.updateRewardAccessPayload({
  pool_id,
  type: 'to_public',
})
```

### 7. Configuration Management
```typescript
// Get global DLMM configuration
const globalConfig = await sdk.Config.getDlmmGlobalConfig()

// Get bin step configuration list
const binStepConfigs = await sdk.Config.getBinStepConfigList(pool_id)

// Fetch all SDK configurations
const sdkConfigs = await sdk.Config.fetchDlmmSdkConfigs()

// Get reward period emission data
const rewardEmission = await sdk.Reward.getRewardPeriodEmission(
  reward_manager_id,
  reward_period,
  current_time
)
```

### 8. BinUtils Operations
```typescript
import { BinUtils } from '@cetusprotocol/dlmm-sdk'

// Convert price to bin ID
const binId = BinUtils.getBinIdFromPrice('1040.07', 2, true, 6, 9)

// Convert bin ID to price
const price = BinUtils.getPriceFromBinId(-4787, 2, 6, 9)

// Get Q price from bin ID
const q_price = BinUtils.getQPriceFromId(-4400, 100)

// Get price per lamport from Q price
const price_per_lamport = BinUtils.getPricePerLamportFromQPrice(q_price)

// Get liquidity from amounts
const liquidity = BinUtils.getLiquidity('0', '266666', '18431994054197767090')

// Get amount A from liquidity
const amountA = BinUtils.getAmountAFromLiquidity('4101094304427826916657468', '18461505896777422276')

// Get amount B from liquidity
const amountB = BinUtils.getAmountBFromLiquidity('4919119455159831291232256')

// Split bin liquidity info
const split_bin_infos = BinUtils.splitBinLiquidityInfo(bin_infos, 0, 70)

// Get position count between bin ranges
const positionCount = BinUtils.getPositionCount(-750, 845)

// Find min/max bin ID for a given bin step
const { minBinId, maxBinId } = BinUtils.findMinMaxBinId(10)
```

### 9. Advanced Operations

#### Validate Active ID Slippage
```typescript
const isValid = await sdk.Position.validateActiveIdSlippage({
  pool_id,
  active_id,
  max_bin_slippage: 0.01
})
```

#### Update Position Fee and Rewards
```typescript
await sdk.Position.updatePositionFeeAndRewards({
  pool_id,
  position_id,
  coin_type_a,
  coin_type_b
})
```

## Usage Workflow

```
Cetus DLMM SDK Usage Progress:
- [ ] Step 1: Install SDK and initialize
- [ ] Step 2: Understand core concepts (Bin, strategy types, fee structure)
- [ ] Step 3: Select operation type (add liquidity, swap, position management, etc.)
- [ ] Step 4: Prepare parameters (amount, price range, strategy type configuration)
- [ ] Step 5: Call SDK functions to get transaction data
- [ ] Step 6: Simulate transaction to verify feasibility
- [ ] Step 7: Execute transaction and monitor status
- [ ] Step 8: Verify results and handle exceptions
```

## Troubleshooting

### Common Issues

**1. Transaction Simulation Failures**
```typescript
// Always simulate transactions before sending
const simResult = await sdk.FullClient.sendSimulationTransaction(tx, wallet)
if (simResult.effects.status.status === 'failure') {
  console.error('Transaction simulation failed:', simResult.effects.status.error)
}
```

**2. Insufficient Gas Budget**
```typescript
// Set appropriate gas budget for complex operations
tx.setGasBudget(10000000000) // 10 SUI
```

**3. Active Bin Range Validation**
```typescript
const amounts_in_active_bin = await sdk.Position.getActiveBinIfInRange(
  pool.bin_manager.bin_manager_handle,
  lower_bin_id,
  upper_bin_id,
  active_id,
  bin_step
)
```

**4. Price Slippage Protection**
```typescript
const isValid = await sdk.Position.validateActiveIdSlippage({
  pool_id,
  active_id,
  max_bin_slippage: 0.01
})
```

### Debugging Tips
1. Use `printTransaction` to debug transaction details
2. Always verify pool state before operations
3. Parse and validate position liquidity shares
4. Test with small amounts first

## Resources
- [Cetus Protocol Documentation](https://cetus-1.gitbook.io/cetus-developer-docs)
- [GitHub Repository](https://github.com/CetusProtocol/cetus-sdk-v2)
- [@cetusprotocol/dlmm-sdk on npm](https://www.npmjs.com/package/@cetusprotocol/dlmm-sdk)

---

**Note**: This guide is based on Cetus DLMM SDK v2. SDK updates may cause API changes; please refer to the latest official documentation.
