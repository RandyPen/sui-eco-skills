# Take Profit / Stop Loss Example

Complete guide to setting up automated risk management with conditional orders.

## Overview

Take Profit (TP) and Stop Loss (SL) orders automatically close positions when price targets are hit, protecting profits and limiting losses.

## Prerequisites

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { deepbook } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
```

## Setup

```typescript
const client = new SuiGrpcClient({ 
  network: 'mainnet', 
  baseUrl: 'grpcs://mainnet.sui.io:443'
}).$extend(
  deepbook({
    address: sender,
    marginManagers: {
      'myManager': { address: '0x...', poolKey: 'SUI_USDC' }
    }
  })
);
```

## Long Position TP/SL Setup

```typescript
async function setupLongPositionTPSL(
  entryPrice: number,
  positionSize: number
) {
  const tx = new Transaction();
  
  // Take Profit at +20%
  const tpPrice = entryPrice * 1.20;
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'tp-long-1',
    triggerBelowPrice: false,     // Trigger when price >= tpPrice
    triggerPrice: tpPrice,
    pendingOrder: {
      clientOrderId: 'tp-sell-1',
      price: tpPrice * 0.995,     // Limit order slightly below trigger
      quantity: positionSize,
      isBid: false,               // Sell to close
      payWithDeep: true
    }
  }));
  
  // Stop Loss at -10%
  const slPrice = entryPrice * 0.90;
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'sl-long-1',
    triggerBelowPrice: true,      // Trigger when price <= slPrice
    triggerPrice: slPrice,
    pendingOrder: {
      clientOrderId: 'sl-sell-1',
      quantity: positionSize,
      isBid: false,
      payWithDeep: true
      // No price = market order for guaranteed execution
    }
  }));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}

// Usage
await setupLongPositionTPSL(2.5, 1000);  // Entry at $2.50, size 1000 SUI
```

## Short Position TP/SL Setup

```typescript
async function setupShortPositionTPSL(
  entryPrice: number,
  positionSize: number
) {
  const tx = new Transaction();
  
  // Take Profit at -15% (price goes down)
  const tpPrice = entryPrice * 0.85;
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'tp-short-1',
    triggerBelowPrice: true,      // Trigger when price <= tpPrice
    triggerPrice: tpPrice,
    pendingOrder: {
      clientOrderId: 'tp-buy-1',
      price: tpPrice * 1.005,     // Limit slightly above trigger
      quantity: positionSize,
      isBid: true,                // Buy to close
      payWithDeep: true
    }
  }));
  
  // Stop Loss at +8% (price goes up)
  const slPrice = entryPrice * 1.08;
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'sl-short-1',
    triggerBelowPrice: false,     // Trigger when price >= slPrice
    triggerPrice: slPrice,
    pendingOrder: {
      clientOrderId: 'sl-buy-1',
      quantity: positionSize,
      isBid: true,
      payWithDeep: true
    }
  }));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}
```

## Scale-Out Strategy (Multiple TP Levels)

```typescript
async function setupScaleOutTPSL(
  entryPrice: number,
  totalSize: number
) {
  const tx = new Transaction();
  
  // TP 1: Sell 25% at +10%
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'tp-1',
    triggerBelowPrice: false,
    triggerPrice: entryPrice * 1.10,
    pendingOrder: {
      clientOrderId: 'tp1-sell',
      price: entryPrice * 1.095,
      quantity: totalSize * 0.25,
      isBid: false,
      payWithDeep: true
    }
  }));
  
  // TP 2: Sell 25% at +20%
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'tp-2',
    triggerBelowPrice: false,
    triggerPrice: entryPrice * 1.20,
    pendingOrder: {
      clientOrderId: 'tp2-sell',
      price: entryPrice * 1.195,
      quantity: totalSize * 0.25,
      isBid: false,
      payWithDeep: true
    }
  }));
  
  // TP 3: Sell 50% at +30%
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'tp-3',
    triggerBelowPrice: false,
    triggerPrice: entryPrice * 1.30,
    pendingOrder: {
      clientOrderId: 'tp3-sell',
      price: entryPrice * 1.295,
      quantity: totalSize * 0.50,
      isBid: false,
      payWithDeep: true
    }
  }));
  
  // Single SL for remaining position
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'sl-all',
    triggerBelowPrice: true,
    triggerPrice: entryPrice * 0.90,
    pendingOrder: {
      clientOrderId: 'sl-sell-all',
      quantity: totalSize,
      isBid: false,
      payWithDeep: true
    }
  }));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}
```

## Breakeven Stop Loss

Move SL to breakeven once TP1 hits:

```typescript
class TrailingRiskManager {
  private entryPrice: number;
  private positionSize: number;
  private tp1Hit = false;
  
  async onTP1Executed() {
    this.tp1Hit = true;
    
    // Cancel old SL
    const cancelTx = new Transaction();
    cancelTx.add(client.deepbook.marginTPSL.cancelConditionalOrder(
      'myManager',
      'sl-initial'
    ));
    await client.signAndExecuteTransaction({ transaction: cancelTx });
    
    // Set breakeven SL
    const beTx = new Transaction();
    beTx.add(client.deepbook.marginTPSL.addConditionalOrder({
      marginManagerKey: 'myManager',
      conditionalOrderId: 'sl-breakeven',
      triggerBelowPrice: true,
      triggerPrice: this.entryPrice * 1.01,  // Slight profit
      pendingOrder: {
        clientOrderId: 'sl-be-sell',
        quantity: this.positionSize * 0.75,  // Remaining position
        isBid: false,
        payWithDeep: true
      }
    }));
    await client.signAndExecuteTransaction({ transaction: beTx });
    
    console.log('SL moved to breakeven');
  }
}
```

## Monitoring Conditional Orders

```typescript
async function monitorConditionalOrders() {
  // Get all conditional order IDs
  const orderIds = await client.deepbook.getConditionalOrderIds('myManager');
  console.log(`Active conditional orders: ${orderIds.join(', ')}`);
  
  // Get trigger prices
  const lowestAbove = await client.deepbook.getLowestTriggerAbovePrice('myManager');
  const highestBelow = await client.deepbook.getHighestTriggerBelowPrice('myManager');
  
  console.log(`Lowest TP trigger: $${Number(lowestAbove) / 1e9}`);
  console.log(`Highest SL trigger: $${Number(highestBelow) / 1e9}`);
}
```

## Canceling Orders

```typescript
async function cancelAllTPSL() {
  const tx = new Transaction();
  tx.add(client.deepbook.marginTPSL.cancelAllConditionalOrders('myManager'));
  return await client.signAndExecuteTransaction({ transaction: tx });
}

async function cancelSpecificOrder(orderId: string) {
  const tx = new Transaction();
  tx.add(client.deepbook.marginTPSL.cancelConditionalOrder('myManager', orderId));
  return await client.signAndExecuteTransaction({ transaction: tx });
}
```

## Executing Triggered Orders (Keeper)

Anyone can execute conditional orders that have met their trigger:

```typescript
async function runKeeper() {
  while (true) {
    try {
      // Check for triggered orders
      const lowestAbove = await client.deepbook.getLowestTriggerAbovePrice('myManager');
      const highestBelow = await client.deepbook.getHighestTriggerBelowPrice('myManager');
      
      const currentPrice = await getCurrentPrice('SUI_USDC');
      
      const shouldExecute = 
        currentPrice >= Number(lowestAbove) / 1e9 ||
        currentPrice <= Number(highestBelow) / 1e9;
      
      if (shouldExecute) {
        const tx = new Transaction();
        tx.add(client.deepbook.marginTPSL.executeConditionalOrders(
          client.deepbook.marginManagers['myManager'].address,
          'SUI_USDC',
          5  // Max orders to execute
        ));
        
        await client.signAndExecuteTransaction({ transaction: tx });
        console.log('Executed conditional orders');
      }
    } catch (e) {
      console.error('Keeper error:', e);
    }
    
    await sleep(5000);  // Check every 5 seconds
  }
}
```

## Risk Management Calculator

```typescript
class RiskCalculator {
  calculatePositionSize(
    entryPrice: number,
    stopLossPrice: number,
    accountBalance: number,
    riskPercent: number
  ): number {
    const riskAmount = accountBalance * (riskPercent / 100);
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    const positionSize = riskAmount / priceRisk;
    
    return positionSize;
  }
  
  calculateRRatio(
    entryPrice: number,
    takeProfitPrice: number,
    stopLossPrice: number
  ): number {
    const reward = Math.abs(takeProfitPrice - entryPrice);
    const risk = Math.abs(entryPrice - stopLossPrice);
    return reward / risk;
  }
}

// Usage
const calc = new RiskCalculator();
const positionSize = calc.calculatePositionSize(
  2.5,      // Entry
  2.25,     // SL (-10%)
  10000,    // $10k account
  2         // Risk 2%
);
console.log(`Recommended position size: ${positionSize} SUI`);

const rRatio = calc.calculateRRatio(2.5, 3.0, 2.25);
console.log(`R:R Ratio: 1:${rRatio.toFixed(1)}`);
```
