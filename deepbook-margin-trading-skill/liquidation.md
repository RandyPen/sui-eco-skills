# Liquidation

Liquidation occurs when a margin manager's collateral ratio falls below the liquidation threshold. Liquidators can repay debt and seize collateral at a discount, earning profits while protecting the protocol.

## Overview

Liquidation is triggered when:
```
riskRatio < liquidationRiskRatio
```

Where risk ratio is calculated as:
```
riskRatio = collateralValue / debtValue
```

## Liquidation Mechanism

### Process

1. **Monitor**: Track margin managers for undercollateralized positions
2. **Repay**: Pay off a portion or all of the debt
3. **Seize**: Receive collateral at a discount
4. **Profit**: Liquidator keeps the difference

### Rewards

Rewards are split between:
- **User Liquidator**: The address that triggers liquidation
- **Liquidation Pool**: Protocol insurance fund

Reward ratios are configured per pool (e.g., 2% to liquidator, 3% to pool).

## Direct Liquidation

Anyone can liquidate an undercollateralized position directly:

```typescript
// Check if position is liquidatable
const state = await client.deepbook.getMarginManagerState(targetManager);
const liquidationRatio = await client.deepbook.getLiquidationRiskRatio('SUI_USDC');

if (state.riskRatio < liquidationRatio) {
  const tx = new Transaction();
  
  // Get coin for repayment
  const repayCoin = coinWithBalance({
    type: USDC_TYPE,
    balance: 1000 * 1000000
  });
  
  // Liquidate (debtIsBase = false for quote debt)
  const seizedCollateral = tx.add(
    client.deepbook.marginManager.liquidate(
      targetManager,      // Address of manager to liquidate
      'SUI_USDC',         // Pool key
      false,              // debtIsBase (true = base debt, false = quote debt)
      repayCoin           // Coin to repay debt
    )
  );
  
  // Transfer seized collateral to self
  tx.transferObjects([seizedCollateral], tx.pure.address(sender));
  
  await client.signAndExecuteTransaction({ transaction: tx });
}
```

## Liquidation Vault

The Liquidation Vault is a specialized contract for managing liquidations at scale:

### Creating a Liquidation Vault

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginLiquidations.createLiquidationVault(liquidationAdminCapId));

const result = await client.signAndExecuteTransaction({ transaction: tx });
const vaultId = result.effects.created[0].objectId;
```

### Depositing to Vault

Deposit funds that will be used for liquidations:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginLiquidations.deposit(
  vaultId,
  liquidationAdminCapId,
  'SUI',        // Coin type to deposit
  50000         // Amount
));
```

### Withdrawing from Vault

```typescript
const tx = new Transaction();
const withdrawn = tx.add(client.deepbook.marginLiquidations.withdraw(
  vaultId,
  liquidationAdminCapId,
  'SUI',
  10000
));

tx.transferObjects([withdrawn], tx.pure.address(sender));
```

### Liquidating via Vault

```typescript
// Liquidate base debt
const tx = new Transaction();
tx.add(client.deepbook.marginLiquidations.liquidateBase(
  vaultId,
  targetManagerAddress,
  'SUI_USDC',
  1000          // Optional: specific amount to repay
));

// Or liquidate quote debt
const tx = new Transaction();
tx.add(client.deepbook.marginLiquidations.liquidateQuote(
  vaultId,
  targetManagerAddress,
  'SUI_USDC',
  2500
));
```

## Building a Liquidation Bot

### Monitoring for Liquidatable Positions

```typescript
async function findLiquidatablePositions(): Promise<LiquidatablePosition[]> {
  const positions: LiquidatablePosition[] = [];
  
  // Get all margin managers (this would come from indexing)
  const managers = await getAllMarginManagers();
  
  for (const manager of managers) {
    const state = await client.deepbook.getMarginManagerState(manager.id);
    const liquidationRatio = await client.deepbook.getLiquidationRiskRatio(manager.poolKey);
    
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
  }
  
  return positions.sort((a, b) => a.riskRatio - b.riskRatio);  // Most underwater first
}
```

### Executing Liquidations

```typescript
async function executeLiquidation(position: LiquidatablePosition) {
  const tx = new Transaction();
  
  // Determine which debt to repay (usually the larger one)
  const repayBase = position.baseDebt > position.quoteDebt;
  const debtAmount = repayBase ? position.baseDebt : position.quoteDebt;
  // Parse pool key (e.g., 'SUI_USDC' -> base: 'SUI', quote: 'USDC')
  const [baseCoinKey, quoteCoinKey] = position.poolKey.split('_');
  const debtCoinKey = repayBase ? baseCoinKey : quoteCoinKey;
  
  // Get coin for repayment
  const coin = coinWithBalance({
    type: getCoinType(debtCoinKey),
    balance: Math.floor(debtAmount * 1.1 * getCoinScalar(debtCoinKey))  // 10% buffer
  });
  
  // Execute liquidation
  const seized = tx.add(client.deepbook.marginManager.liquidate(
    position.managerId,
    position.poolKey,
    repayBase,
    coin
  ));
  
  // Immediately swap seized collateral to repayment asset
  // (to minimize exposure to volatile assets)
  const swapped = swapToStable(tx, seized, debtCoinKey, position.poolKey);
  
  // Transfer to self
  tx.transferObjects([swapped], tx.pure.address(sender));
  
  try {
    const result = await client.signAndExecuteTransaction({ transaction: tx });
    console.log(`Liquidated ${position.managerId}: ${result.digest}`);
    return result;
  } catch (e) {
    console.error(`Liquidation failed: ${e}`);
    throw e;
  }
}
```

### Complete Liquidation Bot

```typescript
class LiquidationBot {
  private readonly minProfitThreshold: number;
  private isRunning = false;
  
  constructor(minProfitUsd: number = 10) {
    this.minProfitThreshold = minProfitUsd;
  }
  
  async start() {
    this.isRunning = true;
    console.log('Liquidation bot started...');
    
    while (this.isRunning) {
      try {
        await this.scanAndLiquidate();
      } catch (e) {
        console.error('Scan error:', e);
      }
      
      // Wait before next scan
      await sleep(5000);
    }
  }
  
  stop() {
    this.isRunning = false;
  }
  
  private async scanAndLiquidate() {
    const positions = await findLiquidatablePositions();
    
    for (const position of positions) {
      const profitEstimate = await this.estimateProfit(position);
      
      if (profitEstimate >= this.minProfitThreshold) {
        console.log(`Liquidating ${position.managerId}, estimated profit: $${profitEstimate}`);
        
        try {
          await executeLiquidation(position);
        } catch (e) {
          console.error(`Failed to liquidate ${position.managerId}:`, e);
        }
      }
    }
  }
  
  private async estimateProfit(position: LiquidatablePosition): Promise<number> {
    // Calculate expected profit from liquidation
    const debtValue = position.baseDebt + position.quoteDebt;
    const collateralValue = position.baseAsset + position.quoteAsset;
    const userReward = await client.deepbook.getUserLiquidationReward(position.poolKey);
    
    // Profit = (collateral seized) - (debt repaid)
    // Collateral seized = debtValue * (1 + userReward)
    const seizedValue = debtValue * (1 + userReward);
    const profit = seizedValue - debtValue;
    
    return profit;
  }
}

// Usage
const bot = new LiquidationBot(10);  // Minimum $10 profit
bot.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  bot.stop();
  process.exit(0);
});
```

## Querying Liquidation Data

### Get Risk Parameters

```typescript
// Get liquidation threshold
const liquidationRatio = await client.deepbook.getLiquidationRiskRatio('SUI_USDC');

// Get target ratio after liquidation
const targetRatio = await client.deepbook.getTargetLiquidationRiskRatio('SUI_USDC');

// Get rewards
const userReward = await client.deepbook.getUserLiquidationReward('SUI_USDC');
const poolReward = await client.deepbook.getPoolLiquidationReward('SUI_USDC');
```

### Check Liquidation Vault Balance

```typescript
const balance = await client.deepbook.marginLiquidations.balance(
  vaultId,
  'SUI'
)(new Transaction());
```

## Important Considerations

### Gas Costs

Liquidation transactions are complex:
- Simple liquidation: ~0.02-0.03 SUI
- With swaps: ~0.05-0.1 SUI
- Account for gas costs in profit calculations

### Competition

Liquidation is competitive:
- Multiple bots may target the same position
- First to execute gets the reward
- Consider using priority fees in high competition

### Price Impact

Seized collateral may need to be swapped:
- Large liquidations can move markets
- Use DEX aggregators for better execution
- Consider splitting large liquidations

### MEV Protection

Liquidation transactions are MEV-extractable:
- Use private mempools when available
- Set appropriate slippage limits
- Monitor for sandwich attacks

## Safety Checks

Always verify before liquidating:

```typescript
async function safeLiquidationCheck(position: LiquidatablePosition): Promise<boolean> {
  // 1. Verify position is still underwater
  const currentState = await client.deepbook.getMarginManagerState(position.managerId);
  const liquidationRatio = await client.deepbook.getLiquidationRiskRatio(position.poolKey);
  
  if (currentState.riskRatio >= liquidationRatio) {
    console.log('Position no longer liquidatable');
    return false;
  }
  
  // 2. Verify debt exists
  const hasDebt = currentState.baseDebt > 0 || currentState.quoteDebt > 0;
  if (!hasDebt) {
    console.log('Position has no debt');
    return false;
  }
  
  // 3. Estimate profit
  const profit = await estimateProfit(position);
  if (profit < minProfitThreshold) {
    console.log(`Profit ${profit} below threshold`);
    return false;
  }
  
  return true;
}
```
