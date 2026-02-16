# Basic Margin Trading Example

Complete example of opening a leveraged long position with DeepBook margin trading.

## Prerequisites

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { deepbook } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
```

## Setup

```typescript
// Initialize client
const client = new SuiGrpcClient({ 
  network: 'mainnet', 
  baseUrl: 'grpcs://mainnet.sui.io:443'
}).$extend(
  deepbook({
    address: sender,
    marginManagers: {}  // Will populate after creating manager
  })
);
```

## Step 1: Create Margin Manager

```typescript
async function createMarginManager(poolKey: string) {
  const tx = new Transaction();
  tx.add(client.deepbook.marginManager.newMarginManager(poolKey));
  
  const result = await client.signAndExecuteTransaction({ transaction: tx });
  
  // Extract created MarginManager ID
  const managerId = result.effects?.created?.find(
    obj => obj.owner === 'Shared'
  )?.objectId;
  
  // Update client configuration
  client.deepbook.marginManagers['myManager'] = {
    address: managerId,
    poolKey
  };
  
  return managerId;
}

const managerId = await createMarginManager('SUI_USDC');
```

## Step 2: Open Leveraged Long Position

```typescript
async function openLeveragedLong(
  collateralAmount: number,
  borrowAmount: number,
  entryPrice: number,
  tpPrice: number,
  slPrice: number
) {
  const tx = new Transaction();
  
  // 1. Update price feeds
  const priceInfoObjects = await client.deepbook.getPriceInfoObjects(tx, ['SUI', 'USDC']);
  
  // 2. Deposit collateral (SUI)
  tx.add(client.deepbook.marginManager.depositBase({
    managerKey: 'myManager',
    amount: collateralAmount
  }));
  
  // 3. Borrow quote (USDC) for leverage
  tx.add(client.deepbook.marginManager.borrowQuote('myManager', borrowAmount));
  
  // 4. Calculate position size
  const totalBuyingPower = (collateralAmount * entryPrice) + borrowAmount;
  const positionSize = totalBuyingPower / entryPrice;
  
  // 5. Place buy order
  tx.add(client.deepbook.poolProxy.placeLimitOrder({
    poolKey: 'SUI_USDC',
    marginManagerKey: 'myManager',
    clientOrderId: 'entry-1',
    price: entryPrice,
    quantity: positionSize,
    isBid: true,
    payWithDeep: true
  }));
  
  // 6. Set Take Profit
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'tp-1',
    triggerBelowPrice: false,
    triggerPrice: tpPrice,
    pendingOrder: {
      clientOrderId: 'tp-order-1',
      price: tpPrice * 0.995,  // Slightly below trigger
      quantity: positionSize,
      isBid: false,
      payWithDeep: true
    }
  }));
  
  // 7. Set Stop Loss
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'sl-1',
    triggerBelowPrice: true,
    triggerPrice: slPrice,
    pendingOrder: {
      clientOrderId: 'sl-order-1',
      quantity: positionSize,
      isBid: false,
      payWithDeep: true
    }
  }));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}

// Open 4x leveraged long
await openLeveragedLong(
  1000,    // 1000 SUI collateral
  3000,    // Borrow $3000 USDC (at $2.5/SUI = 1200 SUI worth)
  2.5,     // Entry price
  3.0,     // Take profit at $3.00 (+20%)
  2.25     // Stop loss at $2.25 (-10%)
);
```

## Step 3: Monitor Position

```typescript
async function monitorPosition() {
  const state = await client.deepbook.getMarginManagerState('myManager');
  
  console.log('Position Status:');
  console.log(`  Collateral: ${state.baseAsset} SUI`);
  console.log(`  Debt: ${state.quoteDebt} USDC`);
  console.log(`  Risk Ratio: ${state.riskRatio}`);
  console.log(`  Current Price: ${state.quotePythPrice / state.basePythPrice}`);
  
  const leverage = state.quoteDebt / (state.baseAsset * state.basePythPrice / state.quotePythPrice);
  console.log(`  Effective Leverage: ${leverage.toFixed(2)}x`);
  
  // Check liquidation risk
  const liquidationRatio = await client.deepbook.getLiquidationRiskRatio('SUI_USDC');
  const buffer = state.riskRatio - liquidationRatio;
  console.log(`  Liquidation Buffer: ${(buffer * 100).toFixed(2)}%`);
  
  if (buffer < 0.1) {
    console.log('⚠️ WARNING: Position near liquidation!');
  }
}

// Monitor every 30 seconds
setInterval(monitorPosition, 30000);
```

## Step 4: Close Position

```typescript
async function closePosition() {
  const tx = new Transaction();
  
  // 1. Cancel any pending orders
  tx.add(client.deepbook.poolProxy.cancelAllOrders('myManager'));
  
  // 2. Cancel TP/SL orders
  tx.add(client.deepbook.marginTPSL.cancelAllConditionalOrders('myManager'));
  
  // 3. Withdraw settled amounts
  tx.add(client.deepbook.poolProxy.withdrawSettledAmounts('myManager'));
  
  // 4. Check current state
  const state = await client.deepbook.getMarginManagerState('myManager');
  
  // 5. If in profit, sell all base asset
  if (state.baseAsset > 0) {
    tx.add(client.deepbook.poolProxy.placeMarketOrder({
      poolKey: 'SUI_USDC',
      marginManagerKey: 'myManager',
      clientOrderId: 'exit-1',
      quantity: state.baseAsset,
      isBid: false,  // Sell
      payWithDeep: true
    }));
  }
  
  // 6. Withdraw settled amounts again after market order
  tx.add(client.deepbook.poolProxy.withdrawSettledAmounts('myManager'));
  
  // 7. Repay all debt
  tx.add(client.deepbook.marginManager.repayQuote('myManager'));
  
  // 8. Withdraw remaining collateral
  const remainingBase = tx.add(
    client.deepbook.marginManager.withdrawBase('myManager', state.baseAsset)
  );
  tx.transferObjects([remainingBase], tx.pure.address(sender));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}
```

## Complete Trading Bot

```typescript
class MarginTradingBot {
  private targetLeverage = 4;
  private tpPercent = 20;
  private slPercent = 10;
  
  async openPosition(signal: TradeSignal) {
    const collateralUsd = signal.positionSize / this.targetLeverage;
    const borrowUsd = collateralUsd * (this.targetLeverage - 1);
    
    const entryPrice = signal.price;
    const tpPrice = signal.direction === 'long' 
      ? entryPrice * (1 + this.tpPercent / 100)
      : entryPrice * (1 - this.tpPercent / 100);
    const slPrice = signal.direction === 'long'
      ? entryPrice * (1 - this.slPercent / 100)
      : entryPrice * (1 + this.slPercent / 100);
    
    if (signal.direction === 'long') {
      await openLeveragedLong(
        collateralUsd / entryPrice,
        borrowUsd,
        entryPrice,
        tpPrice,
        slPrice
      );
    } else {
      // Similar for short positions
      await openLeveragedShort(/* ... */);
    }
  }
  
  async checkAndCloseIfProfitable() {
    const state = await client.deepbook.getMarginManagerState('myManager');
    const currentPrice = state.quotePythPrice / state.basePythPrice;
    
    // Calculate unrealized P&L
    const entryValue = /* retrieve from order history */;
    const currentValue = state.baseAsset * currentPrice;
    const pnl = currentValue - entryValue;
    
    if (pnl > entryValue * 0.15) {  // Close if 15% profit
      console.log('Taking profit...');
      await closePosition();
    }
  }
}
```
