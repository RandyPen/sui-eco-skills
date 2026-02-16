# Liquidation Bot Example

Complete guide to building a liquidation bot for DeepBook margin trading.

## Overview

Liquidation bots monitor for undercollateralized positions and profit by repaying debt and seizing collateral at a discount.

## Prerequisites

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { deepbook } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
import { coinWithBalance } from '@mysten/sui/transactions';
```

## Setup

```typescript
const client = new SuiGrpcClient({ 
  network: 'mainnet', 
  baseUrl: 'grpcs://mainnet.sui.io:443'
}).$extend(
  deepbook({ address: sender })
);

// Configuration
const CONFIG = {
  minProfitUsd: 10,           // Minimum profit to execute
  gasBuffer: 0.05,           // SUI for gas
  checkInterval: 5000,       // 5 seconds between scans
  maxSlippage: 0.005         // 0.5% max slippage
};
```

## Find Liquidatable Positions

```typescript
interface Position {
  managerId: string;
  poolKey: string;
  riskRatio: number;
  liquidationRatio: number;
  baseDebt: number;
  quoteDebt: number;
  baseAsset: number;
  quoteAsset: number;
}

async function findLiquidatablePositions(): Promise<Position[]> {
  const positions: Position[] = [];
  
  // In production, get this from indexer/subgraph
  const allManagers = await getAllMarginManagersFromIndexer();
  
  for (const manager of allManagers) {
    try {
      const state = await client.deepbook.getMarginManagerState(manager.id);
      const liquidationRatio = await client.deepbook.getLiquidationRiskRatio(
        manager.poolKey
      );
      
      // Check if liquidatable
      if (state.riskRatio < liquidationRatio) {
        const hasDebt = state.baseDebt > 0 || state.quoteDebt > 0;
        
        if (hasDebt) {
          positions.push({
            managerId: manager.id,
            poolKey: manager.poolKey,
            riskRatio: state.riskRatio,
            liquidationRatio,
            baseDebt: state.baseDebt,
            quoteDebt: state.quoteDebt,
            baseAsset: state.baseAsset,
            quoteAsset: state.quoteAsset
          });
        }
      }
    } catch (e) {
      console.error(`Error checking ${manager.id}:`, e);
    }
  }
  
  // Sort by most underwater first
  return positions.sort((a, b) => a.riskRatio - b.riskRatio);
}
```

## Calculate Profit

```typescript
async function estimateProfit(position: Position): Promise<number> {
  // Determine which debt to repay
  const repayBase = position.baseDebt > position.quoteDebt;
  const debtAmount = repayBase ? position.baseDebt : position.quoteDebt;
  const debtValue = repayBase 
    ? position.baseDebt  // Already in base units
    : position.quoteDebt; // Already in quote units
  
  // Get liquidation rewards
  const userReward = await client.deepbook.getUserLiquidationReward(
    position.poolKey
  );
  
  // Calculate seized collateral value
  const seizedValue = debtValue * (1 + Number(userReward));
  
  // Calculate profit
  const profit = seizedValue - debtValue;
  
  // Account for gas costs
  const gasCost = CONFIG.gasBuffer;
  
  return profit - gasCost;
}
```

## Execute Liquidation

```typescript
async function executeLiquidation(position: Position) {
  const tx = new Transaction();
  
  // Determine debt to repay
  const repayBase = position.baseDebt > position.quoteDebt;
  const debtAmount = repayBase ? position.baseDebt : position.quoteDebt;
  // Parse pool key (e.g., 'SUI_USDC' -> base: 'SUI', quote: 'USDC')
  const [baseCoinKey, quoteCoinKey] = position.poolKey.split('_');
  const debtCoinKey = repayBase ? baseCoinKey : quoteCoinKey;
  
  // Get coin for repayment
  const coin = coinWithBalance({
    type: getCoinType(debtCoinKey),
    balance: Math.ceil(debtAmount * 1.1 * getCoinScalar(debtCoinKey))
  });
  
  // Execute liquidation
  const seizedCollateral = tx.add(
    client.deepbook.marginManager.liquidate(
      position.managerId,
      position.poolKey,
      repayBase,
      coin
    )
  );
  
  // Transfer seized collateral to self
  tx.transferObjects([seizedCollateral], tx.pure.address(sender));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}
```

## Liquidation Bot Class

```typescript
class LiquidationBot {
  private isRunning = false;
  private liquidationCount = 0;
  private totalProfit = 0;
  
  async start() {
    this.isRunning = true;
    console.log('🤖 Liquidation bot started...');
    console.log(`Config: minProfit=$${CONFIG.minProfitUsd}`);
    
    while (this.isRunning) {
      try {
        await this.scanAndLiquidate();
      } catch (e) {
        console.error('Scan error:', e);
      }
      
      await sleep(CONFIG.checkInterval);
    }
  }
  
  stop() {
    this.isRunning = false;
    console.log('🛑 Bot stopped');
    this.printStats();
  }
  
  private async scanAndLiquidate() {
    const positions = await findLiquidatablePositions();
    
    if (positions.length > 0) {
      console.log(`Found ${positions.length} liquidatable positions`);
    }
    
    for (const position of positions) {
      try {
        const profit = await estimateProfit(position);
        
        if (profit >= CONFIG.minProfitUsd) {
          console.log(`💰 Liquidating ${position.managerId}`);
          console.log(`   Estimated profit: $${profit.toFixed(2)}`);
          
          const result = await executeLiquidation(position);
          
          this.liquidationCount++;
          this.totalProfit += profit;
          
          console.log(`✅ Liquidation successful!`);
          console.log(`   Tx: ${result.digest}`);
        }
      } catch (e) {
        console.error(`❌ Failed to liquidate ${position.managerId}:`, e);
      }
    }
  }
  
  private printStats() {
    console.log('\n📊 Bot Statistics:');
    console.log(`   Total liquidations: ${this.liquidationCount}`);
    console.log(`   Total profit: $${this.totalProfit.toFixed(2)}`);
  }
}
```

## Safety Checks

```typescript
async function safetyCheck(position: Position): Promise<boolean> {
  // Re-fetch current state
  const currentState = await client.deepbook.getMarginManagerState(
    position.managerId
  );
  const liquidationRatio = await client.deepbook.getLiquidationRiskRatio(
    position.poolKey
  );
  
  // Verify still liquidatable
  if (currentState.riskRatio >= liquidationRatio) {
    console.log('Position no longer liquidatable');
    return false;
  }
  
  // Verify debt still exists
  const hasDebt = currentState.baseDebt > 0 || currentState.quoteDebt > 0;
  if (!hasDebt) {
    console.log('Position has no debt');
    return false;
  }
  
  // Verify profit still positive
  const profit = await estimateProfit({
    ...position,
    baseDebt: currentState.baseDebt,
    quoteDebt: currentState.quoteDebt,
    baseAsset: currentState.baseAsset,
    quoteAsset: currentState.quoteAsset
  });
  
  if (profit < CONFIG.minProfitUsd) {
    console.log(`Profit ${profit} below threshold`);
    return false;
  }
  
  return true;
}
```

## Using Liquidation Vault

```typescript
async function liquidateViaVault(
  vaultId: string,
  position: Position
) {
  const tx = new Transaction();
  
  const repayBase = position.baseDebt > position.quoteDebt;
  
  if (repayBase) {
    tx.add(client.deepbook.marginLiquidations.liquidateBase(
      vaultId,
      position.managerId,
      position.poolKey,
      position.baseDebt
    ));
  } else {
    tx.add(client.deepbook.marginLiquidations.liquidateQuote(
      vaultId,
      position.managerId,
      position.poolKey,
      position.quoteDebt
    ));
  }
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}
```

## Event Monitoring

```typescript
async function monitorLiquidationEvents() {
  // Subscribe to liquidation events
  const unsubscribe = await client.core.subscribeEvent({
    filter: {
      MoveEventType: `${MARGIN_PACKAGE_ID}::margin_manager::LiquidationEvent`
    },
    onMessage: (event) => {
      console.log('Liquidation detected:', event);
      
      const data = event.parsedJson as {
        margin_manager_id: string;
        liquidation_amount: string;
        pool_reward: string;
        risk_ratio: string;
      };
      
      console.log(`Manager: ${data.margin_manager_id}`);
      console.log(`Amount: ${data.liquidation_amount}`);
      console.log(`Pool reward: ${data.pool_reward}`);
    }
  });
  
  return unsubscribe;
}
```

## Production Considerations

```typescript
class ProductionLiquidationBot extends LiquidationBot {
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES = 5;
  private readonly COOLDOWN_MS = 60000;
  
  async scanAndLiquidate() {
    // Circuit breaker
    if (this.consecutiveFailures >= this.MAX_FAILURES) {
      console.log('🔴 Circuit breaker active, cooling down...');
      await sleep(this.COOLDOWN_MS);
      this.consecutiveFailures = 0;
    }
    
    try {
      await super.scanAndLiquidate();
      this.consecutiveFailures = 0;
    } catch (e) {
      this.consecutiveFailures++;
      throw e;
    }
  }
  
  async executeWithRetry(position: Position, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Double-check before executing
        const stillValid = await safetyCheck(position);
        if (!stillValid) {
          console.log('Position no longer valid, skipping');
          return null;
        }
        
        return await executeLiquidation(position);
      } catch (e) {
        if (i === maxRetries - 1) throw e;
        console.log(`Retry ${i + 1}/${maxRetries}...`);
        await sleep(1000);
      }
    }
  }
}
```

## Usage

```typescript
async function main() {
  const bot = new ProductionLiquidationBot();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nGraceful shutdown...');
    bot.stop();
  });
  
  process.on('SIGTERM', () => {
    bot.stop();
  });
  
  // Start bot
  await bot.start();
}

main().catch(console.error);
```
