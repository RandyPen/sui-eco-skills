# Admin Operations

Admin functions for configuring the margin trading protocol, managing pools, and setting risk parameters.

## Overview

Admin capabilities are tiered:
- **Admin Cap**: Full control over registry configuration
- **Maintainer Cap**: Can create and manage margin pools
- **Pause Cap**: Can pause protocol versions in emergencies

## Admin Cap Operations

### Minting Maintainer Cap

Create maintainer capabilities for pool management:

```typescript
const tx = new Transaction();
const maintainerCap = tx.add(client.deepbook.marginAdmin.mintMaintainerCap());

// Transfer to maintainer
tx.moveCall({
  target: '0x2::transfer::public_transfer',
  arguments: [maintainerCap, tx.pure.address(maintainerAddress)],
  typeArguments: [`${MARGIN_PACKAGE_ID}::margin_registry::MaintainerCap`]
});
```

### Revoking Maintainer Cap

Remove a maintainer's capabilities:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginAdmin.revokeMaintainerCap(maintainerCapId));
```

## Pool Registration

### Register DeepBook Pool

Enable a DeepBook pool for margin trading:

```typescript
const tx = new Transaction();

// 1. Create pool configuration
const poolConfig = tx.add(client.deepbook.marginAdmin.newPoolConfig(
  'SUI_USDC',
  {
    minWithdrawRiskRatio: 1.25,         // 125% - minimum for withdrawals
    minBorrowRiskRatio: 1.25,           // 125% - minimum for new borrows
    liquidationRiskRatio: 1.05,         // 105% - liquidation threshold
    targetLiquidationRiskRatio: 1.25,   // 125% - target after liquidation
    userLiquidationReward: 0.02,        // 2% - reward to liquidator
    poolLiquidationReward: 0.03         // 3% - reward to protocol
  }
));

// 2. Register the pool
tx.add(client.deepbook.marginAdmin.registerDeepbookPool('SUI_USDC', poolConfig));
```

### Create Pool Config with Leverage

Simplified configuration using leverage:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginAdmin.newPoolConfigWithLeverage(
  'SUI_USDC',
  4  // 4x max leverage
));
```

### Enable/Disable Pool

Control pool availability:

```typescript
// Enable pool for trading
const tx = new Transaction();
tx.add(client.deepbook.marginAdmin.enableDeepbookPool('SUI_USDC'));

// Disable pool (only reduce-only orders allowed)
const tx = new Transaction();
tx.add(client.deepbook.marginAdmin.disableDeepbookPool('SUI_USDC'));
```

### Update Risk Parameters

Modify existing pool configuration:

```typescript
const tx = new Transaction();

// Create new config
const newConfig = tx.add(client.deepbook.marginAdmin.newPoolConfig(
  'SUI_USDC',
  {
    minWithdrawRiskRatio: 1.30,  // Increase from 1.25
    minBorrowRiskRatio: 1.30,
    liquidationRiskRatio: 1.05,
    targetLiquidationRiskRatio: 1.30,
    userLiquidationReward: 0.02,
    poolLiquidationReward: 0.03
  }
));

// Apply update
tx.add(client.deepbook.marginAdmin.updateRiskParams('SUI_USDC', newConfig));
```

## Oracle Configuration

### Add Pyth Config

Configure Pyth Network price feeds:

```typescript
const tx = new Transaction();

// Create coin type data for each supported asset
const coinSetups = [
  { coinKey: 'SUI', maxConfBps: 100, maxEwmaDifferenceBps: 500 },
  { coinKey: 'USDC', maxConfBps: 50, maxEwmaDifferenceBps: 300 },
  { coinKey: 'DEEP', maxConfBps: 200, maxEwmaDifferenceBps: 1000 }
];

// Create Pyth config
const pythConfig = tx.add(client.deepbook.marginAdmin.newPythConfig(
  coinSetups,
  60  // maxAgeSeconds - price staleness threshold
));

// Add to registry
tx.add(client.deepbook.marginAdmin.addConfig(pythConfig));
```

### Remove Pyth Config

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginAdmin.removeConfig());
```

## Version Management

### Enable Version

Allow specific package version:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginAdmin.enableVersion(1));
```

### Disable Version

Prevent specific package version from being used:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginAdmin.disableVersion(1));
```

## Pause Cap Operations

### Mint Pause Cap

Create emergency pause capability:

```typescript
const tx = new Transaction();
const pauseCap = tx.add(client.deepbook.marginAdmin.mintPauseCap());

// Transfer to security team
tx.moveCall({
  target: '0x2::transfer::public_transfer',
  arguments: [pauseCap, tx.pure.address(securityTeamAddress)],
  typeArguments: [`${MARGIN_PACKAGE_ID}::margin_registry::PauseCap`]
});
```

### Revoke Pause Cap

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginAdmin.revokePauseCap(pauseCapId));
```

### Emergency Pause

Pause protocol version using pause cap:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginAdmin.disableVersionPauseCap(1, pauseCapId));
```

## Fee Management

### Withdraw Default Referral Fees

Admin can withdraw fees from default referral (0x0):

```typescript
const tx = new Transaction();
const fees = tx.add(
  client.deepbook.marginAdmin.adminWithdrawDefaultReferralFees('SUI')
);

tx.transferObjects([fees], tx.pure.address(treasuryAddress));
```

## Maintainer Cap Operations

### Create Margin Pool

Create a new lending pool for an asset:

```typescript
const tx = new Transaction();

// 1. Create interest rate configuration
const interestConfig = tx.add(client.deepbook.marginMaintainer.newInterestConfig({
  baseRate: 0.02,           // 2% base APR
  baseSlope: 0.1,           // Slope before optimal utilization
  optimalUtilization: 0.8,  // 80% optimal point
  excessSlope: 0.5          // Steep slope after optimal
}));

// 2. Create margin pool configuration
const poolConfig = tx.add(client.deepbook.marginMaintainer.newMarginPoolConfig(
  'SUI',
  {
    supplyCap: 10000000,      // 10M SUI max supply
    maxUtilizationRate: 0.9,  // 90% max utilization
    referralSpread: 0.1,      // 10% of interest to referrers
    minBorrow: 100            // Minimum 100 SUI borrow
  }
));

// 3. Create the pool
tx.add(client.deepbook.marginMaintainer.createMarginPool(
  'SUI',
  poolConfig,
  interestConfig
));
```

### Create Margin Pool with Rate Limit

For high-value pools, add rate limiting:

```typescript
const tx = new Transaction();

const poolConfig = tx.add(client.deepbook.marginMaintainer.newMarginPoolConfigWithRateLimit(
  'SUI',
  {
    supplyCap: 10000000,
    maxUtilizationRate: 0.9,
    referralSpread: 0.1,
    minBorrow: 100,
    rateLimitCapacity: 1000000,        // 1M SUI capacity
    rateLimitRefillRatePerMs: 100,     // Refill 100 SUI per ms
    rateLimitEnabled: true
  }
));
```

### Enable DeepBook Pool for Borrowing

Allow a DeepBook pool to borrow from margin pool:

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginMaintainer.enableDeepbookPoolForLoan(
  'SUI_USDC',           // DeepBook pool
  'SUI',                // Margin pool coin
  marginPoolCapId       // MarginPoolCap object
));
```

### Disable DeepBook Pool for Borrowing

```typescript
const tx = new Transaction();
tx.add(client.deepbook.marginMaintainer.disableDeepbookPoolForLoan(
  'SUI_USDC',
  'SUI',
  marginPoolCapId
));
```

### Update Interest Parameters

Modify interest rate model:

```typescript
const tx = new Transaction();

const newInterestConfig = tx.add(client.deepbook.marginMaintainer.newInterestConfig({
  baseRate: 0.03,           // Increase to 3%
  baseSlope: 0.12,
  optimalUtilization: 0.75, // Lower optimal point
  excessSlope: 0.6
}));

tx.add(client.deepbook.marginMaintainer.updateInterestParams(
  'SUI',
  marginPoolCapId,
  newInterestConfig
));
```

### Update Pool Configuration

```typescript
const tx = new Transaction();

const newPoolConfig = tx.add(client.deepbook.marginMaintainer.newMarginPoolConfig(
  'SUI',
  {
    supplyCap: 15000000,      // Increase cap
    maxUtilizationRate: 0.92,
    referralSpread: 0.12,
    minBorrow: 50             // Lower minimum
  }
));

tx.add(client.deepbook.marginMaintainer.updateMarginPoolConfig(
  'SUI',
  marginPoolCapId,
  newPoolConfig
));
```

## Querying Admin State

### Get Allowed Maintainers

```typescript
const maintainers = await client.deepbook.marginRegistry.allowedMaintainers()(
  new Transaction()
);
```

### Get Allowed Pause Caps

```typescript
const pauseCaps = await client.deepbook.marginRegistry.allowedPauseCaps()(
  new Transaction()
);
```

### Check Pool Registration

```typescript
const enabled = await client.deepbook.isPoolEnabledForMargin('SUI_USDC');
```

## Risk Parameters Reference

### Risk Ratio Formulas

| Parameter | Formula | Example |
|-----------|---------|---------|
| Risk Ratio | `collateralValue / debtValue` | 1.25 = 125% collateralized |
| Max Leverage | `1 / (minBorrowRiskRatio - 1)` | 1.25 ratio = 4x max leverage |
| Liquidation Price | `entryPrice * (liquidationRiskRatio / currentRatio)` | - |

### Recommended Configurations

| Market Type | Min Borrow | Liquidation | Target | Max Leverage |
|-------------|------------|-------------|--------|--------------|
| Conservative | 1.50 | 1.10 | 1.50 | 2x |
| Moderate | 1.25 | 1.05 | 1.25 | 4x |
| Aggressive | 1.10 | 1.02 | 1.10 | 10x |

### Interest Rate Parameters

| Utilization | Conservative | Moderate | Aggressive |
|-------------|--------------|----------|------------|
| 0% | 3% | 2% | 5% |
| 50% | 6% | 7% | 15% |
| 80% | 10% | 10% | 25% |
| 90% | 25% | 35% | 60% |

## Important Considerations

1. **Risk Ratio Safety**: Always maintain buffer between minBorrow and liquidation ratios

2. **Interest Rate Stability**: Avoid sudden large changes to prevent user disruption

3. **Supply Caps**: Set caps based on market depth and liquidity

4. **Gradual Changes**: When adjusting risk parameters, consider phased rollouts

5. **Emergency Procedures**: 
   - Disable pool if oracle issues detected
   - Pause protocol if critical vulnerability found
   - Have multisig ready for emergency actions

6. **Monitoring**:
   - Track total borrows vs supply
   - Monitor liquidation frequency
   - Watch for oracle price deviations

## Complete Setup Example

```typescript
// Setup a new pool for margin trading
const tx = new Transaction();

// 1. Register DeepBook pool with moderate risk settings
const poolConfig = tx.add(client.deepbook.marginAdmin.newPoolConfig(
  'SUI_USDC',
  {
    minWithdrawRiskRatio: 1.25,
    minBorrowRiskRatio: 1.25,
    liquidationRiskRatio: 1.05,
    targetLiquidationRiskRatio: 1.25,
    userLiquidationReward: 0.02,
    poolLiquidationReward: 0.03
  }
));
tx.add(client.deepbook.marginAdmin.registerDeepbookPool('SUI_USDC', poolConfig));

// 2. Enable pool
tx.add(client.deepbook.marginAdmin.enableDeepbookPool('SUI_USDC'));

// 3. Create margin pools for both assets (requires maintainer cap)
const suiInterestConfig = tx.add(client.deepbook.marginMaintainer.newInterestConfig({
  baseRate: 0.02,
  baseSlope: 0.1,
  optimalUtilization: 0.8,
  excessSlope: 0.5
}));

const suiPoolConfig = tx.add(client.deepbook.marginMaintainer.newMarginPoolConfig(
  'SUI',
  {
    supplyCap: 10000000,
    maxUtilizationRate: 0.9,
    referralSpread: 0.1,
    minBorrow: 100
  }
));

tx.add(client.deepbook.marginMaintainer.createMarginPool(
  'SUI',
  suiPoolConfig,
  suiInterestConfig
));

// 4. Enable borrowing from SUI margin pool
tx.add(client.deepbook.marginMaintainer.enableDeepbookPoolForLoan(
  'SUI_USDC',
  'SUI',
  suiMarginPoolCapId
));

await client.signAndExecuteTransaction({ transaction: tx });
```
