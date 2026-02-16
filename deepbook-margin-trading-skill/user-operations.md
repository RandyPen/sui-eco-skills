# Margin Manager User Operations

The MarginManager is the primary interface for users to manage their margin trading accounts. Each MarginManager is tied to a specific DeepBook pool (e.g., SUI_USDC).

## Creating a Margin Manager

### New Margin Manager

Creates and shares a new MarginManager for a specific pool:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.newMarginManager('SUI_USDC'));

// Execute and get the created object ID
const result = await client.signAndExecuteTransaction({ transaction: tx });
// MarginManager object ID will be in result.effects.created
```

### New Margin Manager with Initializer

Use this when you need to deposit funds immediately after creation:

```typescript
const tx = new Transaction();
const { manager, initializer } = tx.add(
  client.deepbook.marginManager.newMarginManagerWithInitializer('SUI_USDC')
);

// Deposit during initialization
tx.add(client.deepbook.marginManager.depositDuringInitialization({
  manager,
  poolKey: 'SUI_USDC',
  coinType: 'SUI',
  amount: 1000
}));

// Share the manager
tx.add(client.deepbook.marginManager.shareMarginManager('SUI_USDC', manager, initializer));
```

## Depositing Collateral

Deposit assets as collateral for margin trading. All deposits increase your collateral ratio.

### Deposit Base Asset

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.depositBase({
  managerKey: 'myManager',
  amount: 1000  // Human-readable amount
}));
```

### Deposit Quote Asset

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.depositQuote({
  managerKey: 'myManager',
  amount: 500
}));
```

### Deposit DEEP Tokens

DEEP tokens are used for trading fees:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.depositDeep({
  managerKey: 'myManager',
  amount: 100
}));
```

### Deposit with Existing Coin Object

If you already have a coin object:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.depositBase({
  managerKey: 'myManager',
  coin: existingCoinObject  // TransactionObjectArgument
}));
```

## Withdrawing Collateral

Withdrawals must maintain the minimum risk ratio. The returned coin can be transferred to the sender.

### Withdraw Base Asset

```typescript
const tx = new Transaction();
const withdrawnCoin = tx.add(
  client.deepbook.marginManager.withdrawBase('myManager', 100)
);

// Transfer to sender
tx.transferObjects([withdrawnCoin], tx.pure.address(sender));
```

### Withdraw Quote Asset

```typescript
const tx = new Transaction();
const withdrawnQuote = tx.add(
  client.deepbook.marginManager.withdrawQuote('myManager', 50)
);
tx.transferObjects([withdrawnQuote], tx.pure.address(sender));
```

### Withdraw DEEP Tokens

```typescript
const tx = new Transaction();
const withdrawnDeep = tx.add(
  client.deepbook.marginManager.withdrawDeep('myManager', 10)
);
tx.transferObjects([withdrawnDeep], tx.pure.address(sender));
```

## Borrowing

Borrow assets from margin pools to increase trading leverage. Borrowing requires maintaining the `minBorrowRiskRatio`.

### Borrow Base Asset

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.borrowBase('myManager', 500));
```

### Borrow Quote Asset

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.borrowQuote('myManager', 1000));
```

### Risk Ratio Calculation

Before borrowing, check your current risk ratio:

```typescript
const state = await client.deepbook.getMarginManagerState('myManager');
console.log(`Current risk ratio: ${state.riskRatio}`);
console.log(`Min borrow ratio: ${await client.deepbook.getMinBorrowRiskRatio('SUI_USDC')}`);
```

## Repaying Loans

Repay borrowed assets to reduce debt and improve your risk ratio.

### Repay Base Debt (Partial)

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.repayBase('myManager', 500));
```

### Repay Base Debt (Full)

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.repayBase('myManager'));  // No amount = full repay
```

### Repay Quote Debt

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.repayQuote('myManager', 1000));
```

## Querying State

### Get Comprehensive State

```typescript
const state = await client.deepbook.getMarginManagerState('myManager');
// Returns:
// {
//   managerId: string;
//   deepbookPoolId: string;
//   riskRatio: number;
//   baseAsset: number;
//   quoteAsset: number;
//   baseDebt: number;
//   quoteDebt: number;
//   basePythPrice: number;
//   basePythDecimals: number;
//   quotePythPrice: number;
//   quotePythDecimals: number;
// }
```

### Get Balances

```typescript
const baseBalance = await client.deepbook.getMarginManagerBaseBalance('myManager');
const quoteBalance = await client.deepbook.getMarginManagerQuoteBalance('myManager');
const deepBalance = await client.deepbook.getMarginManagerDeepBalance('myManager');
```

### Get Debt Information

```typescript
const hasBaseDebt = await client.deepbook.getMarginManagerHasBaseDebt('myManager');
const borrowedShares = await client.deepbook.getMarginManagerBorrowedShares('myManager');
// Returns: { baseShares: string, quoteShares: string }

const debts = await client.deepbook.getMarginManagerDebts('myManager');
// Returns: { baseDebt: number, quoteDebt: number }
```

### Get Multiple Manager States

Efficiently query states for multiple managers in one call:

```typescript
const states = await client.deepbook.getMarginManagerStates({
  '0xabc...': 'SUI_USDC',
  '0xdef...': 'DEEP_USDC'
});
```

## Referral Settings

### Set Referral

Set a DeepBookPoolReferral to receive trading fee discounts:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.setMarginManagerReferral('myManager', referralId));
```

### Unset Referral

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginManager.unsetMarginManagerReferral('myManager', 'SUI_USDC'));
```

## Complete Workflow Example

```typescript
// 1. Create margin manager
const createTx = new Transaction();
createTx.add(client.deepbook.marginManager.newMarginManager('SUI_USDC'));
const createResult = await client.signAndExecuteTransaction({ transaction: createTx });

// 2. Update client config with new manager
client.deepbook.marginManagers['myManager'] = {
  address: createResult.effects.created[0].objectId,
  poolKey: 'SUI_USDC'
};

// 3. Deposit collateral and borrow
const tradeTx = new Transaction();

// Update price feeds first
const priceInfoObjects = await client.deepbook.getPriceInfoObjects(tradeTx, ['SUI', 'USDC']);

// Deposit base collateral
tradeTx.add(client.deepbook.marginManager.depositBase({
  managerKey: 'myManager',
  amount: 1000
}));

// Borrow quote for leverage
tradeTx.add(client.deepbook.marginManager.borrowQuote('myManager', 1500));

// Place a leveraged buy order
tradeTx.add(client.deepbook.poolProxy.placeLimitOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '1',
  price: 2.5,
  quantity: 600,
  isBid: true,
  payWithDeep: true
}));

const tradeResult = await client.signAndExecuteTransaction({ transaction: tradeTx });
```

## Events

The MarginManager emits several events:

- `MarginManagerCreatedEvent`: When a new manager is created
- `DepositCollateralEvent`: When collateral is deposited
- `WithdrawCollateralEvent`: When collateral is withdrawn
- `LoanBorrowedEvent`: When a loan is taken
- `LoanRepaidEvent`: When a loan is repaid
- `LiquidationEvent`: When the manager is liquidated

## Important Considerations

1. **Price Updates**: Always update Pyth price feeds before depositing/withdrawing/borrowing
2. **Risk Ratio**: Monitor your risk ratio to avoid liquidation
3. **Shares vs Amount**: Debt is tracked in shares which accrue interest over time
4. **Gas Costs**: Complex transactions (deposit + borrow + trade) may require higher gas budgets
