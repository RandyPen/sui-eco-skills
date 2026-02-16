# Lending Operations

Supply assets to margin pools to earn interest from borrowers. Lenders receive shares representing their position in the pool.

## Overview

Margin pools are asset-specific lending pools where:
- Suppliers deposit assets and receive supply shares
- Borrowers pay interest that accrues to suppliers
- Interest rates are dynamically adjusted based on utilization

## Supplying Assets

### 1. Mint Supplier Cap

First, create a SupplierCap (one per user):

```typescript
const tx = new Transaction();
const supplierCap = tx.add(client.deepbook.marginPool.mintSupplierCap());

// Transfer to yourself
tx.moveCall({
  target: '0x2::transfer::public_transfer',
  arguments: [supplierCap, tx.pure.address(sender)],
  typeArguments: [`${MARGIN_PACKAGE_ID}::margin_pool::SupplierCap`]
});

const result = await client.signAndExecuteTransaction({ transaction: tx });
// Save the SupplierCap object ID for future use
```

### 2. Supply Assets

Deposit assets into a margin pool:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginPool.supplyToMarginPool(
  'SUI',              // Coin key (e.g., 'SUI', 'USDC', 'DEEP')
  supplierCapId,      // Your SupplierCap object ID
  1000,               // Amount to supply (human-readable)
  referralId          // Optional: SupplyReferral ID for fee sharing
));

await client.signAndExecuteTransaction({ transaction: tx });
```

### Supply with Referral

If you have a referral code:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginPool.supplyToMarginPool(
  'SUI',
  supplierCapId,
  1000,
  '0x...'  // SupplyReferral object ID
));
```

## Withdrawing Assets

### Partial Withdrawal

```typescript
const tx = new Transaction();
const withdrawnCoin = tx.add(client.deepbook.marginPool.withdrawFromMarginPool(
  'SUI',
  supplierCapId,
  500  // Amount to withdraw
));

// Transfer to yourself
tx.transferObjects([withdrawnCoin], tx.pure.address(sender));
```

### Full Withdrawal

```typescript
const tx = new Transaction();
const withdrawnCoin = tx.add(client.deepbook.marginPool.withdrawFromMarginPool(
  'SUI',
  supplierCapId
  // No amount = withdraw all
));

tx.transferObjects([withdrawnCoin], tx.pure.address(sender));
```

## Supply Referrals

Create and share referral codes to earn a portion of interest fees.

### Mint Supply Referral

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginPool.mintSupplyReferral('SUI'));
// Returns: SupplyReferral object that can be shared
```

### Withdraw Referral Fees

```typescript
const tx = new Transaction();
const fees = tx.add(client.deepbook.marginPool.withdrawReferralFees(
  'SUI',
  referralId  // Your SupplyReferral object ID
));

tx.transferObjects([fees], tx.pure.address(sender));
```

## Querying Pool State

### Pool Metrics

```typescript
// Total supply in pool
const totalSupply = await client.deepbook.getMarginPoolTotalSupply('SUI');

// Total borrowed from pool
const totalBorrow = await client.deepbook.getMarginPoolTotalBorrow('SUI');

// Current interest rate
const interestRate = await client.deepbook.getMarginPoolInterestRate('SUI');

// Pool utilization rate
const utilization = Number(totalBorrow) / Number(totalSupply);

// Supply cap (maximum supply allowed)
const supplyCap = await client.deepbook.getMarginPoolSupplyCap('SUI');

// Maximum utilization rate
const maxUtilization = await client.deepbook.getMarginPoolMaxUtilizationRate('SUI');
```

### User Position

```typescript
// Your supply shares (raw amount)
const userShares = await client.deepbook.getUserSupplyShares(
  'SUI',
  supplierCapId
);

// Your supply amount (including accrued interest)
const userAmount = await client.deepbook.getUserSupplyAmount(
  'SUI',
  supplierCapId
);
```

### Pool Configuration

```typescript
// Protocol spread (portion of interest to protocol)
const protocolSpread = await client.deepbook.getMarginPoolProtocolSpread('SUI');

// Minimum borrow amount
const minBorrow = await client.deepbook.getMarginPoolMinBorrow('SUI');

// Last update timestamp
const lastUpdate = await client.deepbook.getMarginPoolLastUpdateTimestamp('SUI');

// Check if DeepBook pool is allowed for borrowing
const isAllowed = await client.deepbook.isDeepbookPoolAllowed(
  'SUI',
  deepbookPoolId
);
```

## Interest Rate Model

Interest rates follow a piecewise linear model based on utilization:

```
if utilization <= optimalUtilization:
    rate = baseRate + (utilization * baseSlope)
else:
    rate = baseRate + (optimalUtilization * baseSlope) + 
           ((utilization - optimalUtilization) * excessSlope)
```

### Typical Parameters

```typescript
const interestConfig = {
  baseRate: 0.02,           // 2% base APR
  baseSlope: 0.1,           // Slope before optimal utilization
  optimalUtilization: 0.8,  // 80% - optimal utilization point
  excessSlope: 0.5          // Steeper slope after optimal
};
```

### Example Interest Rates

| Utilization | Interest Rate (approx) |
|-------------|----------------------|
| 0%          | 2%                   |
| 50%         | 7%                   |
| 80%         | 10%                  |
| 90%         | 35%                  |
| 95%         | 60%                  |

## Complete Lending Workflow

```typescript
// 1. Mint supplier cap
const mintTx = new Transaction();
const supplierCap = mintTx.add(client.deepbook.marginPool.mintSupplierCap());
mintTx.moveCall({
  target: '0x2::transfer::public_transfer',
  arguments: [supplierCap, mintTx.pure.address(sender)],
  typeArguments: [`${MARGIN_PACKAGE_ID}::margin_pool::SupplierCap`]
});
const mintResult = await client.signAndExecuteTransaction({ transaction: mintTx });
const supplierCapId = mintResult.effects.created[0].objectId;

// 2. Supply assets
const supplyTx = new Transaction();
supplyTx.add(client.deepbook.marginPool.supplyToMarginPool(
  'SUI',
  supplierCapId,
  10000
));
await client.signAndExecuteTransaction({ transaction: supplyTx });

// 3. Monitor position over time
async function monitorPosition() {
  const shares = await client.deepbook.getUserSupplyShares('SUI', supplierCapId);
  const amount = await client.deepbook.getUserSupplyAmount('SUI', supplierCapId);
  const interestRate = await client.deepbook.getMarginPoolInterestRate('SUI');
  
  console.log(`Supply shares: ${shares}`);
  console.log(`Supply amount: ${amount}`);
  console.log(`Current interest rate: ${interestRate}`);
}

// 4. Withdraw when ready
const withdrawTx = new Transaction();
const withdrawn = withdrawTx.add(client.deepbook.marginPool.withdrawFromMarginPool(
  'SUI',
  supplierCapId  // Withdraw all
));
withdrawTx.transferObjects([withdrawn], withdrawTx.pure.address(sender));
await client.signAndExecuteTransaction({ transaction: withdrawTx });
```

## Earnings Calculation

Your earnings accrue automatically as the exchange rate between shares and assets changes:

```typescript
// Calculate APY from current parameters
const totalSupply = await client.deepbook.getMarginPoolTotalSupply('SUI');
const totalBorrow = await client.deepbook.getMarginPoolTotalBorrow('SUI');
const interestRate = await client.deepbook.getMarginPoolInterestRate('SUI');
const protocolSpread = await client.deepbook.getMarginPoolProtocolSpread('SUI');

const utilization = Number(totalBorrow) / Number(totalSupply);
const protocolFee = Number(protocolSpread);  // e.g., 0.1 = 10% of interest

// Supplier APY = Borrow Rate * Utilization * (1 - Protocol Fee)
const supplierApy = Number(interestRate) * utilization * (1 - protocolFee);
console.log(`Estimated supplier APY: ${supplierApy * 100}%`);
```

## Important Notes

1. **Share Price**: The value of supply shares increases over time as interest accrues.

2. **No Lockup**: Suppliers can withdraw at any time (subject to pool liquidity).

3. **Interest Accrual**: Interest accrues every second and compounds automatically.

4. **Protocol Fees**: A portion of borrower interest goes to the protocol (typically 10%).

5. **Referral Rewards**: Referrers earn a percentage of the interest paid by borrowers they referred.

6. **Utilization Cap**: Pools have a maximum utilization rate to ensure liquidity for withdrawals.

7. **Rate Limiting**: Some pools have rate limiting to prevent sudden large withdrawals.
