# Lending and Earning Interest Example

Complete guide to supplying assets to margin pools and earning interest.

## Overview

Supply assets to margin pools to earn interest from borrowers. Interest rates are dynamically adjusted based on pool utilization.

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
  deepbook({ address: sender })
);
```

## Step 1: Create Supplier Cap

```typescript
async function createSupplierCap() {
  const tx = new Transaction();
  const supplierCap = tx.add(client.deepbook.marginPool.mintSupplierCap());
  
  // Transfer to yourself
  tx.moveCall({
    target: '0x2::transfer::public_transfer',
    arguments: [supplierCap, tx.pure.address(sender)],
    typeArguments: [`${MARGIN_PACKAGE_ID}::margin_pool::SupplierCap`]
  });
  
  const result = await client.signAndExecuteTransaction({ transaction: tx });
  
  // Extract SupplierCap ID
  return result.effects?.created?.[0]?.objectId;
}

const supplierCapId = await createSupplierCap();
```

## Step 2: Supply Assets

```typescript
async function supplyAssets(coinKey: string, amount: number) {
  const tx = new Transaction();
  
  tx.add(client.deepbook.marginPool.supplyToMarginPool(
    coinKey,
    supplierCapId,
    amount
  ));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}

// Supply 10,000 SUI
await supplyAssets('SUI', 10000);

// Supply 5,000 USDC
await supplyAssets('USDC', 5000);
```

## Step 3: Monitor Earnings

```typescript
async function trackEarnings() {
  const initialSupply = 10000;
  
  setInterval(async () => {
    // Get current supply amount (including interest)
    const currentAmount = await client.deepbook.getUserSupplyAmount(
      'SUI',
      supplierCapId
    );
    
    // Get supply shares (constant unless adding/withdrawing)
    const shares = await client.deepbook.getUserSupplyShares(
      'SUI',
      supplierCapId
    );
    
    // Calculate earnings
    const earnings = Number(currentAmount) - initialSupply;
    const apy = (earnings / initialSupply) * (365 / daysSinceDeposit) * 100;
    
    console.log('Supply Position:');
    console.log(`  Shares: ${shares}`);
    console.log(`  Current Value: ${currentAmount} SUI`);
    console.log(`  Earnings: ${earnings.toFixed(4)} SUI`);
    console.log(`  Current APY: ${apy.toFixed(2)}%`);
    
    // Get pool metrics
    const totalSupply = await client.deepbook.getMarginPoolTotalSupply('SUI');
    const totalBorrow = await client.deepbook.getMarginPoolTotalBorrow('SUI');
    const interestRate = await client.deepbook.getMarginPoolInterestRate('SUI');
    
    const utilization = Number(totalBorrow) / Number(totalSupply);
    console.log(`\nPool Metrics:`);
    console.log(`  Total Supply: ${totalSupply} SUI`);
    console.log(`  Total Borrowed: ${totalBorrow} SUI`);
    console.log(`  Utilization: ${(utilization * 100).toFixed(2)}%`);
    console.log(`  Borrow Rate: ${(Number(interestRate) * 100).toFixed(2)}%`);
    
  }, 60000);  // Update every minute
}
```

## Step 4: Withdraw Earnings

```typescript
async function withdrawAssets(coinKey: string, amount?: number) {
  const tx = new Transaction();
  
  // If no amount specified, withdraw all
  const withdrawn = tx.add(client.deepbook.marginPool.withdrawFromMarginPool(
    coinKey,
    supplierCapId,
    amount  // Omit for full withdrawal
  ));
  
  // Transfer to yourself
  tx.transferObjects([withdrawn], tx.pure.address(sender));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}

// Withdraw partial amount
await withdrawAssets('SUI', 5000);

// Withdraw all
await withdrawAssets('SUI');
```

## Advanced: Supply Referral Program

### Create Referral Code

```typescript
async function createReferral(coinKey: string) {
  const tx = new Transaction();
  tx.add(client.deepbook.marginPool.mintSupplyReferral(coinKey));
  
  const result = await client.signAndExecuteTransaction({ transaction: tx });
  return result.effects?.created?.[0]?.objectId;
}

const referralId = await createReferral('SUI');
console.log(`Share this referral ID: ${referralId}`);
```

### Supply with Referral

```typescript
async function supplyWithReferral(
  coinKey: string, 
  amount: number, 
  referralId: string
) {
  const tx = new Transaction();
  
  tx.add(client.deepbook.marginPool.supplyToMarginPool(
    coinKey,
    supplierCapId,
    amount,
    referralId  // Include referral for fee sharing
  ));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}
```

### Withdraw Referral Fees

```typescript
async function withdrawReferralFees(coinKey: string, referralId: string) {
  const tx = new Transaction();
  
  const fees = tx.add(client.deepbook.marginPool.withdrawReferralFees(
    coinKey,
    referralId
  ));
  
  tx.transferObjects([fees], tx.pure.address(sender));
  
  return await client.signAndExecuteTransaction({ transaction: tx });
}
```

## Yield Farming Strategy

```typescript
class YieldFarmingStrategy {
  private pools = ['SUI', 'USDC', 'DEEP'];
  private allocations = new Map<string, number>();
  
  async rebalance() {
    // Get current rates for all pools
    const rates = await Promise.all(
      this.pools.map(async pool => ({
        pool,
        rate: await client.deepbook.getMarginPoolInterestRate(pool),
        utilization: await this.getUtilization(pool)
      }))
    );
    
    // Calculate optimal allocations
    const totalRate = rates.reduce((sum, r) => sum + Number(r.rate), 0);
    
    for (const { pool, rate } of rates) {
      // Allocate more to higher rates
      const weight = Number(rate) / totalRate;
      this.allocations.set(pool, weight);
    }
    
    console.log('Optimal Allocations:');
    for (const [pool, weight] of this.allocations) {
      console.log(`  ${pool}: ${(weight * 100).toFixed(1)}%`);
    }
  }
  
  private async getUtilization(coinKey: string): Promise<number> {
    const totalSupply = await client.deepbook.getMarginPoolTotalSupply(coinKey);
    const totalBorrow = await client.deepbook.getMarginPoolTotalBorrow(coinKey);
    return Number(totalBorrow) / Number(totalSupply);
  }
}
```

## Historical Yield Tracking

```typescript
class YieldTracker {
  private history: Array<{ timestamp: number; apy: number }> = [];
  
  async recordYield() {
    const interestRate = await client.deepbook.getMarginPoolInterestRate('SUI');
    const totalSupply = await client.deepbook.getMarginPoolTotalSupply('SUI');
    const totalBorrow = await client.deepbook.getMarginPoolTotalBorrow('SUI');
    
    const utilization = Number(totalBorrow) / Number(totalSupply);
    const protocolSpread = await client.deepbook.getMarginPoolProtocolSpread('SUI');
    
    // Supplier APY = Borrow Rate * Utilization * (1 - Protocol Fee)
    const supplierApy = Number(interestRate) * utilization * (1 - Number(protocolSpread));
    
    this.history.push({
      timestamp: Date.now(),
      apy: supplierApy
    });
    
    // Keep last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.history = this.history.filter(h => h.timestamp > thirtyDaysAgo);
  }
  
  getAverageApy(): number {
    if (this.history.length === 0) return 0;
    const sum = this.history.reduce((acc, h) => acc + h.apy, 0);
    return sum / this.history.length;
  }
}
```

## Complete Supply Bot

```typescript
class SupplyBot {
  private readonly targetApy = 0.05;  // 5% minimum APY
  private readonly rebalanceThreshold = 0.02;  // 2% drift
  
  async run() {
    // Initial supply
    await this.initialSupply();
    
    // Monitor and rebalance
    while (true) {
      await this.monitorAndRebalance();
      await sleep(3600000);  // Check every hour
    }
  }
  
  private async initialSupply() {
    const pools = ['SUI', 'USDC'];
    
    for (const pool of pools) {
      const rate = await client.deepbook.getMarginPoolInterestRate(pool);
      
      if (Number(rate) >= this.targetApy) {
        console.log(`Supplying to ${pool} at ${(Number(rate) * 100).toFixed(2)}% APY`);
        await supplyAssets(pool, 10000);
      }
    }
  }
  
  private async monitorAndRebalance() {
    // Check if current yields meet targets
    // Rebalance if better opportunities exist
    // Withdraw if rates drop below threshold
  }
}
```
