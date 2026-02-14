# Complete Examples

This document provides end-to-end usage examples of the Cetus DLMM SDK, showing how to combine multiple functional modules to achieve complete DeFi operation scenarios. All examples are based on real SDK code and test files.

## Example 1: Complete Liquidity Provider Workflow

This example demonstrates a complete liquidity provider lifecycle: create pool, add liquidity, monitor position, collect fees, remove liquidity.

### Scenario Description
As a liquidity provider, you want to:
1. Create a new DLMM pool
2. Add liquidity within a specific price range
3. Monitor position performance
4. Regularly collect transaction fees
5. Eventually remove liquidity and close the position

### Complete Code

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'
import { BinUtils, StrategyType, FeeUtils } from '@cetusprotocol/dlmm-sdk/utils'

class CompleteLiquidityProvider {
  private sdk: CetusDlmmSDK
  private walletAddress: string
  private poolId: string | null = null
  private positionId: string | null = null

  constructor(walletAddress: string) {
    this.sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
    this.walletAddress = walletAddress
    this.sdk.setSenderAddress(walletAddress)
  }

  /**
   * Step 1: Create DLMM Pool
   */
  async createPool() {
    console.log('=== Step 1: Create DLMM Pool ===')

    // Configure pool parameters
    const binStep = 10  // 0.10% fee
    const baseFactor = 10000
    const initialPrice = '1.05'
    const coinTypeA = '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI'
    const coinTypeB = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'

    // Calculate active Bin ID
    const activeId = BinUtils.getBinIdFromPrice(initialPrice, binStep, true, 6, 6)

    // Create transaction
    const tx = new Transaction()
    const poolId = await this.sdk.Pool.createPoolPayload({
      active_id: activeId,
      bin_step: binStep,
      coin_type_a: coinTypeA,
      coin_type_b: coinTypeB,
      base_factor: baseFactor,
      url: 'https://my-pool-metadata.example.com'
    }, tx)

    tx.setGasBudget(10000000000)

    console.log(`Pool creation transaction built successfully`)
    console.log(`Pool ID: ${poolId}`)

    // Simulate transaction verification
    const simResult = await this.sdk.FullClient.sendSimulationTransaction(tx, this.walletAddress)
    if (simResult.effects.status.status !== 'success') {
      throw new Error('Pool creation transaction simulation failed')
    }

    console.log('✅ Pool creation transaction simulation successful')

    // Actual execution (requires wallet signature)
    // const result = await this.sdk.FullClient.executeTx(keyPair, tx, true)
    // console.log('Pool creation execution result:', result)

    this.poolId = poolId
    return poolId
  }

  /**
   * Step 2: Add Liquidity
   */
  async addLiquidity() {
    if (!this.poolId) {
      throw new Error('Please create pool first')
    }

    console.log('=== Step 2: Add Liquidity ===')

    // Get pool information
    const pool = await this.sdk.Pool.getPool(this.poolId)
    const { active_id, bin_step, coin_type_a, coin_type_b } = pool

    // Set liquidity parameters
    const lowerPrice = '1.00'
    const upperPrice = '1.10'
    const amountA = '1000000'  // 1 Coin A
    const amountB = '1100000'  // 1.1 Coin B

    // Calculate Bin ID corresponding to price range
    const lowerBinId = BinUtils.getBinIdFromPrice(lowerPrice, bin_step, true, 6, 6)
    const upperBinId = BinUtils.getBinIdFromPrice(upperPrice, bin_step, true, 6, 6)

    // Check active Bin
    const activeBinInfo = await this.sdk.Position.getActiveBinIfInRange(
      pool.bin_manager.bin_manager_handle,
      lowerBinId,
      upperBinId,
      active_id,
      bin_step
    )

    if (!activeBinInfo) {
      throw new Error('Active Bin is not within target price range')
    }

    // Calculate liquidity distribution (Spot strategy)
    const binInfos = await this.sdk.Position.calculateAddLiquidityInfo({
      pool_id: this.poolId,
      amount_a: amountA,
      amount_b: amountB,
      active_id,
      bin_step,
      lower_bin_id: lowerBinId,
      upper_bin_id: upperBinId,
      active_bin_of_pool: activeBinInfo,
      strategy_type: StrategyType.Spot
    })

    console.log('Liquidity distribution calculation completed:', {
      'Total Coin A': binInfos.amount_a,
      'Total Coin B': binInfos.amount_b,
      'Bin count': binInfos.bins.length
    })

    // Create add liquidity transaction
    const tx = this.sdk.Position.addLiquidityPayload({
      pool_id: this.poolId,
      bin_infos: binInfos,
      coin_type_a,
      coin_type_b,
      active_id,
      strategy_type: StrategyType.Spot,
      use_bin_infos: false,
      max_price_slippage: 0.01,
      bin_step
    })

    tx.setGasBudget(10000000000)

    // Simulate transaction verification
    const simResult = await this.sdk.FullClient.sendSimulationTransaction(tx, this.walletAddress)
    if (simResult.effects.status.status !== 'success') {
      throw new Error('Add liquidity transaction simulation failed')
    }

    console.log('✅ Add liquidity transaction simulation successful')

    // Actual execution (requires wallet signature)
    // const result = await this.sdk.FullClient.executeTx(keyPair, tx, true)

    // Get newly created position ID (parse from transaction result)
    // this.positionId = extractPositionIdFromResult(result)

    console.log('✅ Liquidity addition completed')
    return binInfos
  }

  /**
   * Step 3: Monitor Position Status
   */
  async monitorPosition() {
    if (!this.positionId) {
      throw new Error('Please add liquidity first to get position ID')
    }

    console.log('=== Step 3: Monitor Position Status ===')

    // Get position details
    const position = await this.sdk.Position.getPosition(this.positionId)
    const pool = await this.sdk.Pool.getPool(position.pool_id)

    console.log('Position information:')
    console.log(`  Position ID: ${position.id}`)
    console.log(`  Pool ID: ${position.pool_id}`)
    console.log(`  Price range: Bin ${position.lower_bin_id} - ${position.upper_bin_id}`)
    console.log(`  Coin A type: ${position.coin_type_a}`)
    console.log(`  Coin B type: ${position.coin_type_b}`)

    // Query fees and rewards
    const { feeData, rewardData } = await this.sdk.Position.fetchPositionFeeAndReward([{
      pool_id: position.pool_id,
      position_id: this.positionId,
      reward_coins: [], // Set based on pool configuration
      coin_type_a: position.coin_type_a,
      coin_type_b: position.coin_type_b
    }])

    const fees = feeData[this.positionId]
    const rewards = rewardData[this.positionId]

    console.log('Fee information:')
    if (fees) {
      console.log(`  Coin A fee: ${fees.fee_owned_a}`)
      console.log(`  Coin B fee: ${fees.fee_owned_b}`)
    } else {
      console.log('  No fees accumulated yet')
    }

    console.log('Reward information:')
    if (rewards && rewards.rewards.length > 0) {
      rewards.rewards.forEach((reward, index) => {
        console.log(`  Reward ${index + 1}: ${reward.reward_owned} ${reward.coin_type}`)
      })
    } else {
      console.log('  No rewards accumulated yet')
    }

    // Calculate risk metrics
    const positionCenter = (position.lower_bin_id + position.upper_bin_id) / 2
    const priceOffset = Math.abs(pool.active_id - positionCenter)
    const priceOffsetPercent = (priceOffset / positionCenter) * 100

    console.log('Risk analysis:')
    console.log(`  Price offset: ${priceOffsetPercent.toFixed(2)}%`)
    console.log(`  Active Bin: ${pool.active_id}`)
    console.log(`  Position center: ${positionCenter.toFixed(0)}`)

    if (priceOffsetPercent > 20) {
      console.log('⚠️  Warning: Price offset too large, consider rebalancing')
    }

    return {
      position,
      fees,
      rewards,
      riskAnalysis: {
        priceOffsetPercent,
        activeBin: pool.active_id,
        positionCenter
      }
    }
  }

  /**
   * Step 4: Collect Fees and Rewards
   */
  async collectFeesAndRewards() {
    if (!this.positionId) {
      throw new Error('Please add liquidity first to get position ID')
    }

    console.log('=== Step 4: Collect Fees and Rewards ===')

    const position = await this.sdk.Position.getPosition(this.positionId)
    const pool = await this.sdk.Pool.getPool(position.pool_id)

    // Query current collectible fees and rewards
    const { feeData, rewardData } = await this.sdk.Position.fetchPositionFeeAndReward([{
      pool_id: position.pool_id,
      position_id: this.positionId,
      reward_coins: [], // Need to set based on actual pool rewards
      coin_type_a: position.coin_type_a,
      coin_type_b: position.coin_type_b
    }])

    const fees = feeData[this.positionId]
    const rewards = rewardData[this.positionId]

    // Check if collection threshold is reached
    const feeThreshold = 1000000  // Minimum unit for 1 token
    const hasEnoughFees = fees &&
      (parseInt(fees.fee_owned_a) > feeThreshold ||
       parseInt(fees.fee_owned_b) > feeThreshold)

    const hasRewards = rewards && rewards.rewards.length > 0

    if (!hasEnoughFees && !hasRewards) {
      console.log('⚠️  Collection threshold not reached, skipping collection')
      return null
    }

    console.log('Preparing to collect:')
    if (hasEnoughFees) {
      console.log(`  Coin A fee: ${fees.fee_owned_a}`)
      console.log(`  Coin B fee: ${fees.fee_owned_b}`)
    }
    if (hasRewards) {
      console.log(`  Reward count: ${rewards.rewards.length}`)
    }

    // Create collection transaction
    const rewardCoins = hasRewards ? rewards.rewards.map(r => r.coin_type) : []

    const tx = this.sdk.Position.collectRewardAndFeePayload([{
      pool_id: position.pool_id,
      position_id: this.positionId,
      reward_coins: rewardCoins,
      coin_type_a: position.coin_type_a,
      coin_type_b: position.coin_type_b
    }])

    tx.setGasBudget(10000000000)

    // Simulate transaction verification
    const simResult = await this.sdk.FullClient.sendSimulationTransaction(tx, this.walletAddress)
    if (simResult.effects.status.status !== 'success') {
      throw new Error('Fee collection transaction simulation failed')
    }

    console.log('✅ Fee collection transaction simulation successful')

    // Actual execution (requires wallet signature)
    // const result = await this.sdk.FullClient.executeTx(keyPair, tx, true)

    console.log('✅ Fee collection completed')
    return tx
  }

  /**
   * Step 5: Remove Liquidity and Close Position
   */
  async removeLiquidityAndClosePosition() {
    if (!this.positionId) {
      throw new Error('Please add liquidity first to get position ID')
    }

    console.log('=== Step 5: Remove Liquidity and Close Position ===')

    const position = await this.sdk.Position.getPosition(this.positionId)
    const pool = await this.sdk.Pool.getPool(position.pool_id)

    // Option 1: Partially remove liquidity (e.g., remove 50%)
    const removePercent = 0.5

    console.log(`Preparing to remove ${removePercent * 100}% liquidity`)

    const removeTx = this.sdk.Position.removeLiquidityPayload({
      pool_id: position.pool_id,
      position_id: this.positionId,
      active_id: pool.active_id,
      bin_step: pool.bin_step,
      bin_infos: { bins: [], amount_a: '0', amount_b: '0' },
      slippage: 0.01,
      reward_coins: [],
      collect_fee: true,  // Collect remaining fees simultaneously
      remove_percent: removePercent,
      coin_type_a: position.coin_type_a,
      coin_type_b: position.coin_type_b
    })

    removeTx.setGasBudget(10000000000)

    // Simulate transaction verification
    const simResult1 = await this.sdk.FullClient.sendSimulationTransaction(removeTx, this.walletAddress)
    if (simResult1.effects.status.status !== 'success') {
      throw new Error('Remove liquidity transaction simulation failed')
    }

    console.log('✅ Remove liquidity transaction simulation successful')

    // Option 2: Completely close position
    console.log('Preparing to completely close position')

    const closeTx = this.sdk.Position.closePositionPayload({
      pool_id: position.pool_id,
      position_id: this.positionId,
      reward_coins: []  // Set based on pool configuration
    })

    closeTx.setGasBudget(10000000000)

    const simResult2 = await this.sdk.FullClient.sendSimulationTransaction(closeTx, this.walletAddress)
    if (simResult2.effects.status.status !== 'success') {
      throw new Error('Close position transaction simulation failed')
    }

    console.log('✅ Close position transaction simulation successful')

    console.log('⚠️  Note: When actually executing, choose either option 1 or option 2, do not execute both')

    return {
      removeTx,
      closeTx,
      recommendation: 'Recommend removing liquidity partially first, then close position completely after confirmation'
    }
  }

  /**
   * Complete Workflow Execution
   */
  async executeFullWorkflow() {
    try {
      console.log('🚀 Starting complete liquidity provider workflow\n')

      // 1. Create pool
      await this.createPool()
      console.log()

      // 2. Add liquidity
      await this.addLiquidity()
      console.log()

      // 3. Monitor position (can be executed periodically)
      console.log('First position monitoring:')
      await this.monitorPosition()
      console.log()

      // 4. Collect fees (can be executed when threshold is reached)
      console.log('Attempting to collect fees:')
      await this.collectFeesAndRewards()
      console.log()

      // 5. Remove liquidity (example, execute based on actual needs)
      console.log('Showing remove liquidity options:')
      await this.removeLiquidityAndClosePosition()
      console.log()

      console.log('✅ Complete workflow demonstration finished')
      console.log('📋 When actually executing, please:')
      console.log('  1. Use real wallet address and private key')
      console.log('  2. Adjust parameters to fit actual needs')
      console.log('  3. First validate complete process on testnet')
      console.log('  4. Monitor transaction status and results')

    } catch (error) {
      console.error('❌ Workflow execution failed:', error)
      throw error
    }
  }
}

// Usage example
async function runCompleteExample() {
  const walletAddress = '0xYourWalletAddressHere'
  const provider = new CompleteLiquidityProvider(walletAddress)

  // Execute complete workflow
  await provider.executeFullWorkflow()
}

// Run example (need to comment out actual transaction execution parts)
// runCompleteExample().catch(console.error)
```

## Example 2: Automated Market Maker Strategy

This example demonstrates a simple automated market maker strategy that dynamically adjusts liquidity positions based on market prices.

### Scenario Description
As a market maker, you want to:
1. Create positions in multiple price ranges
2. Automatically adjust positions based on market volatility
3. Regularly collect fees and optimize returns
4. Implement risk management with automatic alerts

### Complete Code

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'
import { BinUtils, StrategyType } from '@cetusprotocol/dlmm-sdk/utils'

class AutomatedMarketMaker {
  private sdk: CetusDlmmSDK
  private walletAddress: string
  private poolId: string
  private positions: Map<string, any> = new Map()

  // Strategy configuration
  private config = {
    // Position configuration
    positionCount: 3,           // Number of positions
    spreadPercentage: 0.02,     // Price spread between each position (2%)

    // Risk management
    maxPriceOffset: 0.20,       // Maximum price offset (20%)
    rebalanceThreshold: 0.10,   // Rebalance threshold (10%)

    // Fee collection
    feeCollectionThreshold: '1000000',  // Fee collection threshold
    collectionInterval: 3600000,        // Collection interval (1 hour)

    // Monitoring
    monitoringInterval: 300000,         // Monitoring interval (5 minutes)
    alertChannel: 'console'             // Alert channel
  }

  constructor(walletAddress: string, poolId: string) {
    this.sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
    this.walletAddress = walletAddress
    this.poolId = poolId
    this.sdk.setSenderAddress(walletAddress)
  }

  /**
   * Initialize multiple positions
   */
  async initializePositions(totalAmountA: string, totalAmountB: string) {
    console.log('=== Initializing market making positions ===')

    const pool = await this.sdk.Pool.getPool(this.poolId)
    const { active_id, bin_step } = pool

    // Get current price
    const currentPrice = parseFloat(BinUtils.getPriceFromBinId(active_id, bin_step, 6, 6))
    console.log(`Current price: ${currentPrice}`)

    // Calculate position price ranges
    const positionRanges = this.calculatePositionRanges(currentPrice)

    // Evenly distribute funds to each position
    const amountAPerPosition = (parseInt(totalAmountA) / this.config.positionCount).toString()
    const amountBPerPosition = (parseInt(totalAmountB) / this.config.positionCount).toString()

    console.log(`Creating ${this.config.positionCount} positions`)
    console.log(`Funds per position: ${amountAPerPosition} A, ${amountBPerPosition} B`)

    // Create position for each price range
    for (const range of positionRanges) {
      console.log(`\nCreating position - Price range: ${range.lowerPrice} to ${range.upperPrice}`)

      // Calculate Bin ID
      const lowerBinId = BinUtils.getBinIdFromPrice(range.lowerPrice, bin_step, true, 6, 6)
      const upperBinId = BinUtils.getBinIdFromPrice(range.upperPrice, bin_step, true, 6, 6)

      // Check active Bin
      const activeBinInfo = await this.sdk.Position.getActiveBinIfInRange(
        pool.bin_manager.bin_manager_handle,
        lowerBinId,
        upperBinId,
        active_id,
        bin_step
      )

      if (!activeBinInfo) {
        console.log(`⚠️  Price range ${range.lowerPrice}-${range.upperPrice} is not within active Bin, skipping`)
        continue
      }

      // Calculate liquidity distribution
      const binInfos = await this.sdk.Position.calculateAddLiquidityInfo({
        pool_id: this.poolId,
        amount_a: amountAPerPosition,
        amount_b: amountBPerPosition,
        active_id,
        bin_step,
        lower_bin_id: lowerBinId,
        upper_bin_id: upperBinId,
        active_bin_of_pool: activeBinInfo,
        strategy_type: StrategyType.Spot
      })

      // Create add liquidity transaction
      const tx = this.sdk.Position.addLiquidityPayload({
        pool_id: this.poolId,
        bin_infos: binInfos,
        coin_type_a: pool.coin_type_a,
        coin_type_b: pool.coin_type_b,
        lower_bin_id: lowerBinId,
        upper_bin_id: upperBinId,
        active_id,
        strategy_type: StrategyType.Spot,
        use_bin_infos: false,
        max_price_slippage: 0.01,
        bin_step
      })

      tx.setGasBudget(10000000000)

      // Simulate transaction verification
      const simResult = await this.sdk.FullClient.sendSimulationTransaction(tx, this.walletAddress)
      if (simResult.effects.status.status !== 'success') {
        console.log(`❌ Position creation transaction simulation failed: ${range.lowerPrice}-${range.upperPrice}`)
        continue
      }

      console.log(`✅ Position creation transaction simulation successful`)

      // Actual execution (requires wallet signature)
      // const result = await this.sdk.FullClient.executeTx(keyPair, tx, true)
      // const positionId = extractPositionIdFromResult(result)

      // Record position information
      // this.positions.set(positionId, {
      //   range,
      //   lowerBinId,
      //   upperBinId,
      //   amountA: amountAPerPosition,
      //   amountB: amountBPerPosition,
      //   createdAt: new Date()
      // })

      console.log(`✅ Position creation completed`)
    }

    console.log(`\n✅ Total ${this.positions.size} positions created`)
    return this.positions
  }

  /**
   * Calculate multiple position price ranges
   */
  private calculatePositionRanges(currentPrice: number) {
    const ranges = []
    const halfCount = Math.floor(this.config.positionCount / 2)

    // Positions below current price
    for (let i = halfCount; i > 0; i--) {
      const offset = i * this.config.spreadPercentage
      const lowerPrice = currentPrice * (1 - offset - this.config.spreadPercentage/2)
      const upperPrice = currentPrice * (1 - offset + this.config.spreadPercentage/2)

      ranges.push({
        lowerPrice: lowerPrice.toFixed(4),
        upperPrice: upperPrice.toFixed(4),
        direction: 'below',
        index: i
      })
    }

    // Positions around current price
    const centerLower = currentPrice * (1 - this.config.spreadPercentage/2)
    const centerUpper = currentPrice * (1 + this.config.spreadPercentage/2)

    ranges.push({
      lowerPrice: centerLower.toFixed(4),
      upperPrice: centerUpper.toFixed(4),
      direction: 'center',
      index: 0
    })

    // Positions above current price
    for (let i = 1; i <= halfCount; i++) {
      const offset = i * this.config.spreadPercentage
      const lowerPrice = currentPrice * (1 + offset - this.config.spreadPercentage/2)
      const upperPrice = currentPrice * (1 + offset + this.config.spreadPercentage/2)

      ranges.push({
        lowerPrice: lowerPrice.toFixed(4),
        upperPrice: upperPrice.toFixed(4),
        direction: 'above',
        index: i
      })
    }

    return ranges
  }

  /**
   * Monitor position status
   */
  async monitorPositions() {
    console.log('=== Monitor Position Status ===')

    const pool = await this.sdk.Pool.getPool(this.poolId)
    const report = {
      timestamp: new Date().toISOString(),
      poolActiveBin: pool.active_id,
      positions: [],
      alerts: []
    }

    // Check each position
    for (const [positionId, positionInfo] of this.positions) {
      try {
        const position = await this.sdk.Position.getPosition(positionId)
        const positionCenter = (position.lower_bin_id + position.upper_bin_id) / 2
        const priceOffset = Math.abs(pool.active_id - positionCenter) / positionCenter

        const positionStatus = {
          positionId,
          range: positionInfo.range,
          priceOffset: (priceOffset * 100).toFixed(2) + '%',
          isActive: priceOffset < this.config.maxPriceOffset,
          needsRebalance: priceOffset > this.config.rebalanceThreshold
        }

        report.positions.push(positionStatus)

        // Check if alert is needed
        if (positionStatus.needsRebalance) {
          report.alerts.push({
            type: 'REBALANCE_NEEDED',
            positionId,
            priceOffset: positionStatus.priceOffset,
            message: `Position ${positionId} price offset too large, recommend rebalancing`
          })
        }

        if (!positionStatus.isActive) {
          report.alerts.push({
            type: 'POSITION_INACTIVE',
            positionId,
            priceOffset: positionStatus.priceOffset,
            message: `Position ${positionId} is not within active price range`
          })
        }

      } catch (error) {
        console.error(`Monitoring position ${positionId} failed:`, error)
        report.alerts.push({
          type: 'MONITOR_ERROR',
          positionId,
          message: `Position monitoring failed: ${error.message}`
        })
      }
    }

    // Send alerts
    this.sendAlerts(report.alerts)

    return report
  }

  /**
   * Auto collect fees
   */
  async autoCollectFees() {
    console.log('=== Auto Collect Fees ===')

    const collectOptions = []
    const pool = await this.sdk.Pool.getPool(this.poolId)

    // Check fees for each position
    for (const [positionId, positionInfo] of this.positions) {
      try {
        const { feeData, rewardData } = await this.sdk.Position.fetchPositionFeeAndReward([{
          pool_id: this.poolId,
          position_id: positionId,
          reward_coins: [], // Set based on pool configuration
          coin_type_a: pool.coin_type_a,
          coin_type_b: pool.coin_type_b
        }])

        const fees = feeData[positionId]
        const rewards = rewardData[positionId]

        // Check if collection threshold is reached
        let shouldCollect = false
        let rewardCoins = []

        if (fees && (parseInt(fees.fee_owned_a) > parseInt(this.config.feeCollectionThreshold) ||
                     parseInt(fees.fee_owned_b) > parseInt(this.config.feeCollectionThreshold))) {
          shouldCollect = true
        }

        if (rewards && rewards.rewards.length > 0) {
          shouldCollect = true
          rewardCoins = rewards.rewards.map(r => r.coin_type)
        }

        if (shouldCollect) {
          collectOptions.push({
            pool_id: this.poolId,
            position_id: positionId,
            reward_coins: rewardCoins,
            coin_type_a: pool.coin_type_a,
            coin_type_b: pool.coin_type_b
          })

          console.log(`✅ Position ${positionId} reached collection condition`)
        }

      } catch (error) {
        console.error(`Checking position ${positionId} fees failed:`, error)
      }
    }

    // Batch collection
    if (collectOptions.length > 0) {
      console.log(`Batch collecting fees from ${collectOptions.length} positions`)

      const tx = this.sdk.Position.collectRewardAndFeePayload(collectOptions)
      tx.setGasBudget(10000000000)

      // Simulate transaction verification
      const simResult = await this.sdk.FullClient.sendSimulationTransaction(tx, this.walletAddress)
      if (simResult.effects.status.status !== 'success') {
        throw new Error('Batch fee collection transaction simulation failed')
      }

      console.log('✅ Batch fee collection transaction simulation successful')

      // Actual execution (requires wallet signature)
      // const result = await this.sdk.FullClient.executeTx(keyPair, tx, true)

      console.log(`✅ Batch collection completed`)
      return tx
    } else {
      console.log('⚠️  No positions reached collection condition')
      return null
    }
  }

  /**
   * Auto rebalance positions
   */
  async autoRebalance() {
    console.log('=== Auto Rebalance ===')

    const pool = await this.sdk.Pool.getPool(this.poolId)
    const rebalanceActions = []

    // Check positions that need rebalancing
    for (const [positionId, positionInfo] of this.positions) {
      try {
        const position = await this.sdk.Position.getPosition(positionId)
        const positionCenter = (position.lower_bin_id + position.upper_bin_id) / 2
        const priceOffset = Math.abs(pool.active_id - positionCenter) / positionCenter

        if (priceOffset > this.config.rebalanceThreshold) {
          console.log(`Position ${positionId} needs rebalancing, price offset: ${(priceOffset * 100).toFixed(2)}%`)

          // Option 1: Completely close and recreate
          rebalanceActions.push({
            positionId,
            action: 'close_and_recreate',
            currentRange: positionInfo.range,
            priceOffset: (priceOffset * 100).toFixed(2) + '%',
            recommendation: 'Close current position, recreate in new price range'
          })

          // Option 2: Partially remove and adjust (more complex, requires calculating new range)
          // Here implements simple version of option 1

        }
      } catch (error) {
        console.error(`Checking position ${positionId} rebalancing failed:`, error)
      }
    }

    if (rebalanceActions.length > 0) {
      console.log(`Found ${rebalanceActions.length} positions that need rebalancing`)

      // Execute rebalancing (example: close and recreate)
      for (const action of rebalanceActions) {
        console.log(`Executing rebalancing: ${action.positionId}`)

        // 1. Close position
        const closeTx = this.sdk.Position.closePositionPayload({
          pool_id: this.poolId,
          position_id: action.positionId,
          reward_coins: []
        })

        // 2. Recalculate new price range and create position
        // Specific implementation omitted here, needs to recalculate range based on current price

        console.log(`✅ Rebalancing plan generated`)
      }

      return rebalanceActions
    } else {
      console.log('✅ All positions are within reasonable range, no rebalancing needed')
      return []
    }
  }

  /**
   * Start automated strategy
   */
  async startAutomatedStrategy() {
    console.log('🚀 Starting automated market maker strategy\n')

    // Start regular monitoring
    const monitorInterval = setInterval(async () => {
      console.log(`\n📊 Regular monitoring - ${new Date().toISOString()}`)

      try {
        const report = await this.monitorPositions()

        // Log monitoring report
        this.logReport(report)

        // Check if immediate action is needed
        if (report.alerts.length > 0) {
          console.log(`⚠️  Found ${report.alerts.length} alerts`)

          // Take action based on alert type
          const rebalanceAlerts = report.alerts.filter(a => a.type === 'REBALANCE_NEEDED')
          if (rebalanceAlerts.length > 0) {
            console.log('Triggering automatic rebalance check...')
            await this.autoRebalance()
          }
        }

      } catch (error) {
        console.error('Regular monitoring failed:', error)
      }
    }, this.config.monitoringInterval)

    // Start regular fee collection
    const collectionInterval = setInterval(async () => {
      console.log(`\n💰 Regular fee collection - ${new Date().toISOString()}`)

      try {
        await this.autoCollectFees()
      } catch (error) {
        console.error('Regular fee collection failed:', error)
      }
    }, this.config.collectionInterval)

    console.log('✅ Automated strategy started')
    console.log(`Monitoring interval: ${this.config.monitoringInterval / 1000} seconds`)
    console.log(`Fee collection interval: ${this.config.collectionInterval / 1000} seconds`)

    return {
      stop: () => {
        clearInterval(monitorInterval)
        clearInterval(collectionInterval)
        console.log('🛑 Automated strategy stopped')
      }
    }
  }

  /**
   * Send alerts
   */
  private sendAlerts(alerts: any[]) {
    if (alerts.length === 0) return

    if (this.config.alertChannel === 'console') {
      console.log('\n🚨 Alert notification:')
      alerts.forEach(alert => {
        console.log(`  [${alert.type}] ${alert.message}`)
      })
    }
    // Can extend to other alert channels: email, Slack, Telegram, etc.
  }

  /**
   * Log report
   */
  private logReport(report: any) {
    // Here you can implement report logging to database, file, or monitoring system
    console.log(`Monitoring report ${report.timestamp}:`)
    console.log(`  Active Bin: ${report.poolActiveBin}`)
    console.log(`  Position count: ${report.positions.length}`)
    console.log(`  Alert count: ${report.alerts.length}`)

    report.positions.forEach((pos: any) => {
      console.log(`  Position ${pos.positionId.slice(0, 8)}...: ${pos.priceOffset} offset`)
    })
  }
}

// Usage example
async function runAutomatedMarketMaker() {
  const walletAddress = '0xYourWalletAddressHere'
  const poolId = '0xYourPoolIdHere' // Existing pool ID

  const amm = new AutomatedMarketMaker(walletAddress, poolId)

  // 1. Initialize positions
  console.log('Phase 1: Initialize positions')
  await amm.initializePositions('10000000', '11000000') // 10 Coin A, 11 Coin B

  // 2. Start automated strategy
  console.log('\nPhase 2: Start automated strategy')
  const strategy = await amm.startAutomatedStrategy()

  // 3. Stop after running for a while
  setTimeout(() => {
    console.log('\nPhase 3: Stop strategy')
    strategy.stop()
  }, 3600000) // Stop after 1 hour of running
}

// Run example
// runAutomatedMarketMaker().catch(console.error)
```

## Example 3: Cross-module Tool Functions Usage

This example demonstrates how to combine different tool functions for complex price and liquidity calculations.

### Scenario Description
As an advanced user, you want to:
1. Use BinUtils for price and Bin ID conversion
2. Use FeeUtils for fee calculation and optimization
3. Build custom analysis and optimization tools

### Complete Code

```typescript
import { CetusDlmmSDK } from '@cetusprotocol/dlmm-sdk'
import { BinUtils, FeeUtils } from '@cetusprotocol/dlmm-sdk/utils'
import Decimal from 'decimal.js'

class AdvancedAnalyticsTool {
  private sdk: CetusDlmmSDK

  constructor() {
    this.sdk = CetusDlmmSDK.createSDK({ env: 'mainnet' })
  }

  /**
   * Comprehensive Price Analysis
   */
  async analyzePriceAndLiquidity(poolId: string, priceRanges: Array<{lower: string, upper: string}>) {
    console.log('=== Comprehensive Price and Liquidity Analysis ===')

    const pool = await this.sdk.Pool.getPool(poolId)
    const { active_id, bin_step, coin_type_a, coin_type_b } = pool

    console.log(`Pool information: ${coin_type_a} / ${coin_type_b}`)
    console.log(`Current active Bin: ${active_id}, Bin step: ${bin_step}`)

    const analyses = []

    for (const range of priceRanges) {
      console.log(`\nAnalyzing price range: ${range.lower} - ${range.upper}`)

      // 1. Calculate Bin IDs using BinUtils
      const lowerBinId = BinUtils.getBinIdFromPrice(range.lower, bin_step, true, 6, 6)
      const upperBinId = BinUtils.getBinIdFromPrice(range.upper, bin_step, true, 6, 6)

      // 2. Check active Bin
      const activeBinInfo = await this.sdk.Position.getActiveBinIfInRange(
        pool.bin_manager.bin_manager_handle,
        lowerBinId,
        upperBinId,
        active_id,
        bin_step
      )

      // 3. Calculate liquidity potential
      const liquidityPotential = await this.calculateLiquidityPotential(
        poolId,
        lowerBinId,
        upperBinId,
        '1000000', // Example amount
        '0',
        activeBinInfo
      )

      // 4. Fee analysis
      const feeAnalysis = this.analyzeFeeStructure(pool, range)

      analyses.push({
        range,
        binRange: { lowerBinId, upperBinId },
        activeBinInRange: !!activeBinInfo,
        liquidityPotential,
        feeAnalysis
      })

      console.log(`  Results:`)
      console.log(`    Bin range: ${lowerBinId} - ${upperBinId}`)
      console.log(`    Active Bin within range: ${activeBinInfo ? 'Yes' : 'No'}`)
      console.log(`    Estimated liquidity: ${liquidityPotential.estimatedLiquidity}`)
      console.log(`    Estimated annualized fee rate: ${feeAnalysis.apyEstimation}`)
    }

    return analyses
  }

  /**
   * Calculate liquidity potential
   */
  private async calculateLiquidityPotential(
    poolId: string,
    lowerBinId: number,
    upperBinId: number,
    amountA: string,
    amountB: string,
    activeBinInfo: any
  ) {
    try {
      const pool = await this.sdk.Pool.getPool(poolId)

      const binInfos = await this.sdk.Position.calculateAddLiquidityInfo({
        pool_id: poolId,
        amount_a: amountA,
        amount_b: amountB,
        active_id: pool.active_id,
        bin_step: pool.bin_step,
        lower_bin_id: lowerBinId,
        upper_bin_id: upperBinId,
        active_bin_of_pool: activeBinInfo,
        strategy_type: 0 // Spot
      })

      // Estimate annualized returns (simplified model)
      const estimatedDailyVolume = 1000000 // Assume daily trading volume
      const feeRate = parseInt(pool.base_fee_rate) / 1000000 // Convert to decimal
      const liquidityShare = 0.1 // Assume 10% liquidity share

      const dailyFees = estimatedDailyVolume * feeRate * liquidityShare
      const apy = (dailyFees * 365 / parseInt(amountA)) * 100

      return {
        binCount: binInfos.bins.length,
        totalAmountA: binInfos.amount_a,
        totalAmountB: binInfos.amount_b,
        estimatedLiquidity: this.estimateTotalLiquidity(binInfos),
        apyEstimation: apy.toFixed(2) + '%'
      }
    } catch (error) {
      return {
        error: error.message,
        binCount: 0,
        totalAmountA: '0',
        totalAmountB: '0',
        estimatedLiquidity: '0',
        apyEstimation: '0%'
      }
    }
  }

  /**
   * Estimate total liquidity
   */
  private estimateTotalLiquidity(binInfos: any) {
    // Simplified liquidity estimation
    const totalAmountA = parseInt(binInfos.amount_a)
    const totalAmountB = parseInt(binInfos.amount_b)

    // Assume average price is approximately 1
    return (totalAmountA + totalAmountB).toString()
  }

  /**
   * Analyze fee structure
   */
  private analyzeFeeStructure(pool: any, priceRange: {lower: string, upper: string}) {
    const baseFeeRate = parseInt(pool.base_fee_rate)
    const variableFee = FeeUtils.getVariableFee(pool.variable_parameters)

    const totalFeeRate = baseFeeRate + parseInt(variableFee)
    const feePercentage = (totalFeeRate / 1000000) * 100

    // Estimate annualized returns
    const priceLower = parseFloat(priceRange.lower)
    const priceUpper = parseFloat(priceRange.upper)
    const priceRangeSize = (priceUpper - priceLower) / ((priceLower + priceUpper) / 2)

    // Simplified APY estimation model
    const estimatedApy = feePercentage * 10 * priceRangeSize * 100

    return {
      baseFee: baseFeeRate.toString(),
      variableFee,
      totalFee: totalFeeRate.toString(),
      feePercentage: feePercentage.toFixed(4) + '%',
      apyEstimation: estimatedApy.toFixed(2) + '%'
    }
  }


  /**
   * Build custom optimization suggestions
   */
  async generateOptimizationSuggestions(poolId: string) {
    const pool = await this.sdk.Pool.getPool(poolId)
    const currentPrice = BinUtils.getPriceFromBinId(pool.active_id, pool.bin_step, 6, 6)

    const suggestions = []

    // Suggestion 1: Range optimization based on current price
    const currentPriceNum = parseFloat(currentPrice)
    const optimizedRanges = [
      {
        lower: (currentPriceNum * 0.95).toFixed(4),
        upper: (currentPriceNum * 1.05).toFixed(4),
        reason: 'Narrow range, high fee density',
        risk: 'Medium'
      },
      {
        lower: (currentPriceNum * 0.90).toFixed(4),
        upper: (currentPriceNum * 1.10).toFixed(4),
        reason: 'Medium range, balanced returns and risk',
        risk: 'Low'
      },
      {
        lower: (currentPriceNum * 0.80).toFixed(4),
        upper: (currentPriceNum * 1.20).toFixed(4),
        reason: 'Wide range, low maintenance requirement',
        risk: 'Very low'
      }
    ]

    suggestions.push({
      type: 'PRICE_RANGE_OPTIMIZATION',
      currentPrice,
      optimizedRanges,
      recommendation: 'Select appropriate range based on risk preference'
    })

    // Suggestion 2: Fee optimization
    const feeAnalysis = this.analyzeFeeStructure(pool, {lower: '1.00', upper: '1.10'})

    if (parseFloat(feeAnalysis.feePercentage) < 0.1) {
      suggestions.push({
        type: 'FEE_OPTIMIZATION',
        currentFee: feeAnalysis.feePercentage,
        recommendation: 'Consider using pools with higher fee configurations or wait for market volatility',
        action: 'Monitor variable fee changes'
      })
    }

    // Suggestion 3: Liquidity distribution optimization
    suggestions.push({
      type: 'LIQUIDITY_DISTRIBUTION',
      recommendation: 'Consider using Curve strategy to automatically adjust liquidity distribution',
      benefits: ['Automatic rebalancing', 'Reduce manual management', 'Optimize capital efficiency']
    })

    return {
      poolId,
      currentPrice,
      suggestions,
      generatedAt: new Date().toISOString()
    }
  }
}

// Usage example
async function runAdvancedAnalytics() {
  const tool = new AdvancedAnalyticsTool()

  const poolId = '0xYourPoolIdHere'

  // 1. Analyze multiple price ranges
  console.log('Task 1: Price range analysis')
  const priceRanges = [
    { lower: '0.95', upper: '1.05' },
    { lower: '0.90', upper: '1.10' },
    { lower: '0.85', upper: '1.15' }
  ]

  const analyses = await tool.analyzePriceAndLiquidity(poolId, priceRanges)
  console.log('Analysis completed:', JSON.stringify(analyses, null, 2))

  // 2. Generate optimization suggestions
  console.log('\nTask 2: Generate optimization suggestions')
  const suggestions = await tool.generateOptimizationSuggestions(poolId)
  console.log('Optimization suggestions:', JSON.stringify(suggestions, null, 2))

  // 3. Comprehensive report
  console.log('\n📋 Comprehensive report:')
  console.log(`Analysis pool: ${poolId}`)
  console.log(`Analysis range count: ${analyses.length}`)
  console.log(`Suggestion count: ${suggestions.suggestions.length}`)

  // Summarize best option
  const bestRange = analyses.reduce((best, current) => {
    if (!best) return current
    const bestAPY = parseFloat(best.liquidityPotential.apyEstimation)
    const currentAPY = parseFloat(current.liquidityPotential.apyEstimation)
    return currentAPY > bestAPY ? current : best
  }, null)

  if (bestRange) {
    console.log(`\n🎯 Recommended price range: ${bestRange.range.lower} - ${bestRange.range.upper}`)
    console.log(`  Estimated APY: ${bestRange.liquidityPotential.apyEstimation}`)
    console.log(`  Active Bin within range: ${bestRange.activeBinInRange ? 'Yes' : 'No'}`)
  }
}

// Run example
// runAdvancedAnalytics().catch(console.error)
```

## Best Practices Summary

### 1. Testnet Validation
Always validate the complete process on testnet first:
```typescript
const testSdk = CetusDlmmSDK.createSDK({ env: 'testnet' })
// Execute all operations on testnet
```

### 2. Progressive Implementation
Start with small amounts and gradually increase:
1. Test single transaction with minimum amount
2. Verify transaction success and results
3. Gradually increase amount and complexity
4. Implement monitoring and alert mechanisms

### 3. Error Handling
Implement comprehensive error handling:
```typescript
try {
  // Execute operation
} catch (error) {
  console.error('Operation failed:', error)
  // Record error
  // Send alert
  // Attempt recovery or rollback
}
```

### 4. Monitoring and Logging
Establish a comprehensive monitoring system:
- Record all transactions and state changes
- Monitor key metrics (liquidity, fees, price offset)
- Set threshold alerts
- Generate regular reports

### 5. Security Considerations
- Use secure key management
- Implement transaction verification and simulation
- Set operation limits and permission controls
- Prepare emergency response plans

## Next Steps

### Integrate into Your Application
1. **Frontend Integration**: Use wallet SDKs like Suiet, Ethos
2. **Backend Services**: Build automated strategy services
3. **Monitoring Dashboard**: Create custom monitoring and alert panels
4. **Data Analysis**: Integrate data analysis and optimization tools

### Extended Features
1. **Multi-pool Management**: Simultaneously manage multiple DLMM pools
2. **Cross-chain Integration**: Combine with other DeFi protocols
3. **Strategy Optimization**: Implement machine learning optimized strategies
4. **Risk Management**: Integrate advanced risk management tools

### Community Resources
- [Cetus Protocol Official Documentation](https://docs.cetus.xyz/)
- [GitHub Repository](https://github.com/CetusProtocol)
- [Discord Community](https://discord.gg/cetus)
- [Developer Forum](https://forum.cetus.xyz/)

---

**Note**: This documentation examples are based on Cetus DLMM SDK v1.0.3 version. When actually using, please:
1. Refer to the latest SDK documentation and type definitions
2. Thoroughly validate on testnet
3. Adjust parameters and strategies based on actual requirements
4. Implement appropriate security measures and risk management