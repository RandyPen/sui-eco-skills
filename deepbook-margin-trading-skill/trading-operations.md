# Trading Operations

Trade through your MarginManager using the PoolProxy interface. This enables leveraged trading with borrowed funds.

## Order Types

```typescript
enum OrderType {
  NO_RESTRICTION,       // 0 - Standard limit order
  IMMEDIATE_OR_CANCEL,  // 1 - Must fill immediately or cancel
  FILL_OR_KILL,         // 2 - Must fill completely or cancel
  POST_ONLY             // 3 - Must be maker or cancel
}

enum SelfMatchingOptions {
  SELF_MATCHING_ALLOWED,  // 0 - Allow self-matching
  CANCEL_TAKER,           // 1 - Cancel taker order on match
  CANCEL_MAKER            // 2 - Cancel maker order on match
}
```

## Placing Limit Orders

### Standard Limit Order

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.placeLimitOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '12345',     // Unique client order ID
  price: 2.5,                 // Price in quote/base
  quantity: 100,              // Base asset quantity
  isBid: true,                // true = buy, false = sell
  orderType: OrderType.NO_RESTRICTION,
  selfMatchingOption: SelfMatchingOptions.SELF_MATCHING_ALLOWED,
  payWithDeep: true,          // Pay fees in DEEP
  expiration: MAX_TIMESTAMP   // Optional: order expiration
}));
```

### Immediate-or-Cancel (IOC) Order

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.placeLimitOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '12346',
  price: 2.5,
  quantity: 100,
  isBid: true,
  orderType: OrderType.IMMEDIATE_OR_CANCEL,  // Fill immediately or cancel
  payWithDeep: true
}));
```

### Fill-or-Kill (FOK) Order

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.placeLimitOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '12347',
  price: 2.5,
  quantity: 100,
  isBid: true,
  orderType: OrderType.FILL_OR_KILL,  // Fill completely or cancel
  payWithDeep: true
}));
```

### Post-Only Order

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.placeLimitOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '12348',
  price: 2.4,                 // Slightly below market to ensure maker
  quantity: 100,
  isBid: true,
  orderType: OrderType.POST_ONLY,  // Must be maker or cancel
  payWithDeep: true
}));
```

## Placing Market Orders

Market orders execute immediately against the order book:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.placeMarketOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '12349',
  quantity: 50,
  isBid: true,                // true = buy at ask price
  selfMatchingOption: SelfMatchingOptions.SELF_MATCHING_ALLOWED,
  payWithDeep: true
}));
```

## Reduce-Only Orders

Used when margin trading is disabled for a pool but you need to close positions:

### Reduce-Only Limit Order

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.placeReduceOnlyLimitOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '12350',
  price: 2.4,
  quantity: 25,               // Must not increase net position
  isBid: false,               // Selling to reduce long
  payWithDeep: true
}));
```

### Reduce-Only Market Order

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.placeReduceOnlyMarketOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '12351',
  quantity: 25,
  isBid: false,
  payWithDeep: true
}));
```

## Order Management

### Modify Order

Change the quantity of an existing order:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.modifyOrder(
  'myManager',
  orderId,        // Order ID from order book
  75              // New quantity
));
```

### Cancel Single Order

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.cancelOrder('myManager', orderId));
```

### Cancel Multiple Orders

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.cancelOrders('myManager', [orderId1, orderId2, orderId3]));
```

### Cancel All Orders

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.cancelAllOrders('myManager'));
```

### Withdraw Settled Amounts

After orders fill, withdraw settled funds to your margin manager:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.withdrawSettledAmounts('myManager'));
```

## Price Protection

Update the current price oracle before trading (permissionless):

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.updateCurrentPrice('SUI_USDC'));
```

This uses Pyth Network price feeds and includes safety checks for:
- Price staleness
- Confidence intervals
- EWMA (Exponential Weighted Moving Average) deviation

## Governance Operations

### Staking

Stake DEEP tokens to participate in governance:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.stake('myManager', 1000));  // Amount in DEEP
```

### Unstaking

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.unstake('myManager'));
```

### Submitting Proposals

Submit fee structure proposals:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.submitProposal('myManager', {
  takerFee: 0.001,      // 0.1% taker fee
  makerFee: 0.0005,     // 0.05% maker fee
  stakeRequired: 10000  // DEEP stake required
}));
```

### Voting

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.vote('myManager', proposalId));
```

### Claiming Rebates

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.claimRebate('myManager'));
```

## Permissionless Operations

Anyone can perform these operations:

### Withdraw Settled Amounts (Permissionless)

```typescript
const tx = new Transaction();
tx.add(client.deepbook.poolProxy.withdrawMarginSettledAmounts(
  'SUI_USDC',
  marginManagerId  // Can be any margin manager
));
```

## Complete Trading Workflow

```typescript
// Complete example: Deposit, borrow, and trade
const tx = new Transaction();

// 1. Update prices first
const priceInfoObjects = await client.deepbook.getPriceInfoObjects(tx, ['SUI', 'USDC']);

// 2. Deposit collateral
tx.add(client.deepbook.marginManager.depositBase({
  managerKey: 'myManager',
  amount: 1000
}));

// 3. Borrow for leverage
tx.add(client.deepbook.marginManager.borrowQuote('myManager', 2000));

// 4. Place buy order with borrowed funds
tx.add(client.deepbook.poolProxy.placeLimitOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '1',
  price: 2.5,
  quantity: 800,
  isBid: true,
  orderType: OrderType.NO_RESTRICTION,
  payWithDeep: true
}));

// 5. Place a TP order (above entry)
tx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'tp-1',
  triggerBelowPrice: false,
  triggerPrice: 3.0,
  pendingOrder: {
    clientOrderId: 'tp-order-1',
    price: 2.95,
    quantity: 800,
    isBid: false,
    payWithDeep: true
  }
}));

// 6. Place a SL order (below entry)
tx.add(client.deepbook.marginTPSL.addConditionalOrder({
  marginManagerKey: 'myManager',
  conditionalOrderId: 'sl-1',
  triggerBelowPrice: true,
  triggerPrice: 2.0,
  pendingOrder: {
    clientOrderId: 'sl-order-1',
    quantity: 800,
    isBid: false,
    payWithDeep: true
  }
}));

const result = await client.signAndExecuteTransaction({ transaction: tx });
```

## Querying Orders

### Get Account Open Orders

```typescript
const openOrders = await client.deepbook.accountOpenOrders('SUI_USDC', 'myManager');
// Returns: string[] - Array of order IDs
```

### Get Order Details

```typescript
const order = await client.deepbook.getOrder('SUI_USDC', orderId);
// Returns: Order object with quantity, filled_quantity, price, etc.

const normalizedOrder = await client.deepbook.getOrderNormalized('SUI_USDC', orderId);
// Returns: Order with normalized price and quantities
```

### Get Multiple Orders

```typescript
const orders = await client.deepbook.getOrders('SUI_USDC', [orderId1, orderId2]);
```

### Get Order Book (Level 2)

```typescript
// Get bids in price range
const bids = await client.deepbook.getLevel2Range(
  'SUI_USDC',
  2.0,     // priceLow
  2.5,     // priceHigh
  true     // isBid = true
);

// Get asks in price range
const asks = await client.deepbook.getLevel2Range(
  'SUI_USDC',
  2.5,     // priceLow
  3.0,     // priceHigh
  false    // isBid = false
);
```

## Important Notes

1. **Client Order IDs**: Must be unique per manager. Reusing IDs will replace existing orders.

2. **Price Format**: Prices are in quote/base format (e.g., USDC/SUI for SUI_USDC pool).

3. **Quantity**: Always in base asset units (e.g., SUI quantity for SUI_USDC pool).

4. **Fees**: Trading fees are deducted from your DEEP balance. Ensure sufficient DEEP is deposited.

5. **Order Expiration**: Orders expire after the specified timestamp. Use `MAX_TIMESTAMP` for no expiration.

6. **Self-Matching**: Configure how the system handles orders that would match against your own orders.

7. **Reduce-Only**: When a pool is disabled, only reduce-only orders are allowed to close positions.
