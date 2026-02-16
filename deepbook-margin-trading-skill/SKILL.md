---
name: deepbook-margin-trading-skill
description: Guides developers through using DeepBook V3 Margin Trading SDK for leverage trading, borrowing, lending, liquidation operations, and risk management on Sui blockchain. Use when working with DeepBook margin trading, margin pools, margin managers, take profit/stop loss orders, or liquidation functionality.
---

# DeepBook V3 Margin Trading

DeepBook V3 Margin Trading is a decentralized margin trading protocol built on Sui blockchain. It enables users to trade with leverage, lend assets to earn interest, and participate in liquidations.

## Quick Start

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { deepbook } from '@mysten/deepbook-v3';

const client = new SuiGrpcClient({ network: 'mainnet', baseUrl: '...' })
  .$extend(deepbook({
    address: '0x...',
    marginManagers: {
      'myManager': { address: '0x...', poolKey: 'SUI_USDC' }
    }
  }));

// Deposit and trade with leverage
const tx = new Transaction();
tx.add(client.deepbook.marginManager.depositBase({ managerKey: 'myManager', amount: 1000 }));
tx.add(client.deepbook.marginManager.borrowQuote('myManager', 2000));
tx.add(client.deepbook.poolProxy.placeLimitOrder({
  poolKey: 'SUI_USDC',
  marginManagerKey: 'myManager',
  clientOrderId: '1',
  price: 2.5,
  quantity: 400,
  isBid: true,
  payWithDeep: true
}));
```

## Core Concepts

### Architecture

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| **MarginManager** | User's margin trading account | [User Operations](user-operations.md) |
| **MarginPool** | Lending pool for specific assets | [Lending Operations](lending-operations.md) |
| **MarginRegistry** | Global configuration and risk parameters | [Admin Operations](admin-operations.md) |
| **PoolProxy** | Trading interface through margin | [Trading Operations](trading-operations.md) |

### Risk Management

Margin trading involves several risk ratios (in 9 decimal precision):

- **minWithdrawRiskRatio**: Minimum collateral ratio for withdrawals
- **minBorrowRiskRatio**: Minimum collateral ratio for new borrows  
- **liquidationRiskRatio**: Ratio at which positions become liquidatable
- **targetLiquidationRiskRatio**: Target ratio after liquidation

## Key Features

### For Traders

- **[Margin Trading](trading-operations.md)**: Place limit and market orders with borrowed funds
- **[Take Profit / Stop Loss](conditional-orders.md)**: Automated conditional orders

### For Lenders

- **[Supply Assets](lending-operations.md)**: Deposit assets to margin pools and earn interest
- **[Referral Program](lending-operations.md#supply-referrals)**: Share fees by referring suppliers

### For Liquidators

- **[Liquidation](liquidation.md)**: Earn rewards by liquidating undercollateralized positions

### For Admins

- **[Pool Management](admin-operations.md)**: Configure pools, risk parameters, and oracle settings

## SDK Reference

### Configuration

```typescript
// Package IDs (auto-configured by SDK)
const MARGIN_PACKAGE_ID = {
  mainnet: '0xfbd322126f1452fd4c89aedbaeb9fd0c44df9b5cedbe70d76bf80dc086031377',
  testnet: '0xd6a42f4df4db73d68cbeb52be66698d2fe6a9464f45ad113ca52b0c6ebd918b6'
};

const MARGIN_REGISTRY_ID = {
  mainnet: '0x0e40998b359a9ccbab22a98ed21bd4346abf19158bc7980c8291908086b3a742',
  testnet: '0x48d7640dfae2c6e9ceeada197a7a1643984b5a24c55a0c6c023dac77e0339f75'
};
```

### State Queries

```typescript
// Get margin manager state
const state = await client.deepbook.getMarginManagerState('myManager');

// Get pool metrics
const interestRate = await client.deepbook.getMarginPoolInterestRate('SUI');

// Check risk parameters
const liquidationRatio = await client.deepbook.getLiquidationRiskRatio('SUI_USDC');
```

## Examples

See the [examples](examples/) directory for complete working examples:

- [Basic Margin Trading](examples/basic-margin-trading.md)
- [Lending and Earning Interest](examples/lending-example.md)
- [Setting TP/SL Orders](examples/tpsl-example.md)
- [Liquidation Bot](examples/liquidation-bot.md)

## Error Handling

Common error codes:

| Error | Code | Description |
|-------|------|-------------|
| `EInvalidDeposit` | 1 | Invalid deposit parameters |
| `EBorrowRiskRatioExceeded` | 7 | Borrow would exceed risk ratio |
| `EWithdrawRiskRatioExceeded` | 8 | Withdrawal would exceed risk ratio |
| `ECannotLiquidate` | 9 | Position not eligible for liquidation |
| `EPoolNotEnabledForMarginTrading` | 15 | Pool not enabled for margin |

## Network Support

- **Mainnet**: Full support with production pools
- **Testnet**: Testing environment with test assets

## Additional Resources

- [DeepBook V3 Documentation](https://docs.deepbook.tech)
- [Sui SDK Documentation](https://docs.sui.io)
- [Pyth Network Oracle](https://pyth.network)

---

**Note**: This skill assumes familiarity with Sui blockchain, Move language, and basic DeFi concepts. For TypeScript SDK basics, see the [Sui TypeScript SDK documentation](https://docs.sui.io/build/sdks).
