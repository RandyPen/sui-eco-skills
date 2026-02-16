# Conditional Orders (Take Profit / Stop Loss)

Automate your trading strategy with conditional orders that execute when price conditions are met. These are executed permissionlessly by keepers when triggered.

## Overview

Conditional orders consist of:
- **Condition**: The price trigger (above or below a target price)
- **Pending Order**: The order to place when triggered (limit or market)

## Order Types

### Take Profit (TP)

Executes when price moves favorably (up for longs, down for shorts):

```typescript
// Long position TP - sell when price goes above target
const tx = new Transaction();
tx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'tp-long-1',  // Unique ID per manager
  triggerBelowPrice: false,          // Trigger when price > triggerPrice
  triggerPrice: 3.0,                // Target price
  pendingOrder: {
    clientOrderId: 'tp-order-1',
    price: 2.95,                    // Limit price (can be 0 for market)
    quantity: 100,
    isBid: false,                   // Sell to close long
    payWithDeep: true
  }
}));
```

### Stop Loss (SL)

Executes when price moves against you (down for longs, up for shorts):

```typescript
// Long position SL - sell when price goes below target
const tx = new Transaction();
tx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'sl-long-1',
  triggerBelowPrice: true,           // Trigger when price < triggerPrice
  triggerPrice: 2.0,                // Stop loss price
  pendingOrder: {
    clientOrderId: 'sl-order-1',
    quantity: 100,
    isBid: false,
    payWithDeep: true
    // No price = market order when triggered
  }
}));
```

### Short Position TP/SL

```typescript
// Short position TP - buy when price goes below target
const tpTx = new Transaction();
tpTx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'tp-short-1',
  triggerBelowPrice: true,
  triggerPrice: 2.0,
  pendingOrder: {
    clientOrderId: 'tp-short-order',
    quantity: 100,
    isBid: true,                    // Buy to close short
    payWithDeep: true
  }
}));

// Short position SL - buy when price goes above target
const slTx = new Transaction();
slTx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'sl-short-1',
  triggerBelowPrice: false,
  triggerPrice: 3.0,
  pendingOrder: {
    clientOrderId: 'sl-short-order',
    quantity: 100,
    isBid: true,
    payWithDeep: true
  }
}));
```

## Managing Conditional Orders

### Cancel All Conditional Orders

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginTPSL.cancelAllConditionalOrders('myManager'));
```

### Cancel Specific Order

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginTPSL.cancelConditionalOrder('myManager', 'tp-long-1'));
```

### Execute Triggered Orders (Permissionless)

Anyone can execute conditional orders that have met their trigger conditions:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginTPSL.executeConditionalOrders(
  managerAddress,    // Margin manager object ID
  'SUI_USDC',        // Pool key
  5                  // Maximum orders to execute
));
```

This is typically called by:
- Automated keeper bots
- Users wanting to ensure their orders execute
- Traders monitoring the market

## Querying Conditional Orders

### Get All Conditional Order IDs

```typescript
const orderIds = await client.deepbook.getConditionalOrderIds('myManager');
// Returns: string[] - Array of conditional order IDs
```

### Get Specific Order Details

```typescript
const order = await client.deepbook.marginTPSL.conditionalOrder(
  'SUI_USDC',
  marginManagerId,
  'tp-long-1'
)(new Transaction());
// Returns: ConditionalOrder details
```

### Get Trigger Prices

```typescript
// Lowest trigger price for trigger_above orders
const lowestAbove = await client.deepbook.getLowestTriggerAbovePrice('myManager');
// Returns: bigint - Max u64 if no orders

// Highest trigger price for trigger_below orders  
const highestBelow = await client.deepbook.getHighestTriggerBelowPrice('myManager');
// Returns: bigint - 0 if no orders
```

## Complete TP/SL Setup Example

```typescript
// Setup complete risk management for a long position
const tx = new Transaction();

// 1. Open position (if not already open)
tx.add(client.deepbook.poolProxy.placeLimitOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: 'entry-1',
  price: 2.5,
  quantity: 1000,
  isBid: true,
  payWithDeep: true
}));

// 2. Set Take Profit at +20%
tx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'tp-1',
  triggerBelowPrice: false,
  triggerPrice: 3.0,  // 20% above entry
  pendingOrder: {
    clientOrderId: 'tp-order-1',
    price: 2.95,
    quantity: 1000,
    isBid: false,
    payWithDeep: true
  }
}));

// 3. Set Stop Loss at -10%
tx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'sl-1',
  triggerBelowPrice: true,
  triggerPrice: 2.25,  // 10% below entry
  pendingOrder: {
    clientOrderId: 'sl-order-1',
    quantity: 1000,
    isBid: false,
    payWithDeep: true
    // Market order for guaranteed execution
  }
}));

const result = await client.signAndExecuteTransaction({ transaction: tx });
```

## Advanced Usage

### Trailing Stop Loss

Simulate trailing stops by updating conditional orders:

```typescript
// Periodically update SL as price moves up
async function updateTrailingStop(currentPrice: number) {
  const stopPrice = currentPrice * 0.95;  // 5% trailing stop
  
  const tx = new Transaction();
  // Cancel existing SL
  tx.add(client.deepbook.marginTPSL.cancelConditionalOrder('myManager', 'sl-1'));
  // Set new SL at higher price
  tx.add(client.deepbook.marginTPSL.addConditionalOrder({
    marginManagerKey: 'myManager',
    conditionalOrderId: 'sl-1',
    triggerBelowPrice: true,
    triggerPrice: stopPrice,
    pendingOrder: {
      clientOrderId: 'sl-order-1',
      quantity: 1000,
      isBid: false,
      payWithDeep: true
    }
  }));
  
  await client.signAndExecuteTransaction({ transaction: tx });
}
```

### Scale Out Orders

Multiple TP levels to take profits gradually:

```typescript
const tx = new Transaction();

// TP 1: Sell 25% at +10%
tx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'tp-1',
  triggerBelowPrice: false,
  triggerPrice: 2.75,
  pendingOrder: {
    clientOrderId: 'tp-1-order',
    price: 2.70,
    quantity: 250,
    isBid: false,
    payWithDeep: true
  }
}));

// TP 2: Sell 25% at +20%
tx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'tp-2',
  triggerBelowPrice: false,
  triggerPrice: 3.0,
  pendingOrder: {
    clientOrderId: 'tp-2-order',
    price: 2.95,
    quantity: 250,
    isBid: false,
    payWithDeep: true
  }
}));

// TP 3: Sell 50% at +30%
tx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'tp-3',
  triggerBelowPrice: false,
  triggerPrice: 3.25,
  pendingOrder: {
    clientOrderId: 'tp-3-order',
    price: 3.20,
    quantity: 500,
    isBid: false,
    payWithDeep: true
  }
}));
```

## How Execution Works

1. **Keeper Monitoring**: Keepers monitor price oracles and conditional orders
2. **Trigger Check**: When price crosses a trigger threshold, order becomes eligible
3. **Permissionless Execution**: Anyone can call `executeConditionalOrders` to execute
4. **Order Placement**: The pending order is placed on the order book
5. **Order Matching**: The order executes according to standard order book rules

## Important Notes

1. **Execution Not Guaranteed**: Conditional orders rely on keepers for execution. Extreme volatility may cause missed triggers.

2. **No Guarantee of Fill**: Once triggered, limit orders may not fill if price moves too quickly. Market orders have higher execution certainty but worse price.

3. **Price Feed Dependency**: Uses Pyth Network price feeds. Stale or invalid prices may prevent execution.

4. **Order ID Conflicts**: Conditional order IDs must be unique per manager. Reusing IDs replaces existing orders.

5. **Gas Costs**: Executing orders requires gas. Keepers are incentivized by the value of executed orders.

6. **Multiple Triggers**: If multiple conditions are met, they execute in order of ID (lower IDs first).

7. **Position Changes**: If your position changes (e.g., partial close), update or cancel relevant conditional orders.

## Keeper Implementation

Example keeper logic:

```typescript
async function runKeeper() {
  // Get all margin managers with conditional orders
  const managers = await getManagersWithConditionalOrders();
  
  for (const manager of managers) {
    const lowestAbove = await client.deepbook.getLowestTriggerAbovePrice(manager.id);
    const highestBelow = await client.deepbook.getHighestTriggerBelowPrice(manager.id);
    
    const currentPrice = await getCurrentPrice(manager.poolKey);
    
    // Check if any orders should trigger
    if (currentPrice >= lowestAbove || currentPrice <= highestBelow) {
      const tx = new Transaction();
      tx.add(client.deepbook.marginTPSL.executeConditionalOrders(
        manager.id,
        manager.poolKey,
        10
      ));
      
      try {
        await client.signAndExecuteTransaction({ transaction: tx });
        console.log(`Executed conditional orders for ${manager.id}`);
      } catch (e) {
        console.error(`Failed to execute: ${e}`);
      }
    }
  }
}

// Run keeper every few seconds
setInterval(runKeeper, 5000);
```
