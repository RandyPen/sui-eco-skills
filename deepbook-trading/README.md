# DeepBook Trading Skill

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Sui](https://img.shields.io/badge/Sui-Blockchain-purple.svg)](https://sui.io/)

A comprehensive TypeScript skill for interacting with DeepBook V3, Sui's decentralized order book exchange (CLOB DEX). This skill provides simplified interfaces for trading operations, market data queries, flash loans, and portfolio management.

## Features

- **Simplified Trading Interface**: Easy-to-use wrappers around DeepBook V3 SDK for limit orders, market orders, and swaps
- **Comprehensive Market Data**: Real-time order book data, pool statistics, and price conversions
- **Flash Loan Support**: Built-in flash loan functionality for arbitrage and liquidation strategies
- **Portfolio Management**: Tools for managing positions across multiple pools
- **Pre-built Templates**: Ready-to-use templates for market making, arbitrage, data monitoring, and more
- **TypeScript First**: Full TypeScript support with comprehensive type definitions
- **Claude Code Integration**: Designed to work seamlessly with Claude Code as a skill

## Installation

```bash
# Clone the repository
git clone https://github.com/mystenlabs/sui-eco-skills.git
cd sui-eco-skills/deepbook-trading

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Quick Start

```typescript
import { DeepBookTradingClient } from './src/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

// Initialize the client
const tradingClient = new DeepBookTradingClient({
  suiClient: new SuiClient({ url: getFullnodeUrl('testnet') }),
  address: '0xYourAddressHere',
  environment: 'testnet',
});

// Query market data
const orderBook = await tradingClient.queries.getOrderBook({
  poolKey: 'SUI_DBUSDC',
  depth: 10,
});

console.log(`Mid price: ${orderBook.midPrice}`);
console.log(`Bid depth: ${orderBook.bids.length} levels`);
console.log(`Ask depth: ${orderBook.asks.length} levels`);
```

## Core Components

### 1. Trading Client (`DeepBookTradingClient`)

The main entry point that provides access to all functionality:

```typescript
const client = new DeepBookTradingClient(config);

// Access different functionality areas
const trading = client.trading;      // Trading operations
const queries = client.queries;      // Market data queries
const flashLoans = client.flashLoans; // Flash loan operations
const balanceManager = client.balanceManager; // Fund management
```

### 2. Trading Operations

Execute various trading operations:

```typescript
// Place a limit order
const limitOrderTx = await client.trading.placeLimitOrder({
  poolKey: 'SUI_DBUSDC',
  balanceManagerKey: 'your-balance-manager',
  price: 1.5,
  quantity: 10,
  isBid: true,
});

// Place a market order
const marketOrderTx = await client.trading.placeMarketOrder({
  poolKey: 'SUI_DBUSDC',
  balanceManagerKey: 'your-balance-manager',
  quantity: 5,
  isBid: false,
});

// Execute a swap
const swapTx = await client.trading.swapExactBaseForQuote({
  poolKey: 'SUI_DBUSDC',
  balanceManagerKey: 'your-balance-manager',
  amount: 10,
  minOut: 14.5,
  deepAmount: 0,
});
```

### 3. Market Data Queries

Get real-time market information:

```typescript
// Get order book data
const orderBook = await client.queries.getOrderBook({
  poolKey: 'SUI_DBUSDC',
  depth: 20,
  includeStats: true,
});

// Get pool statistics
const poolStats = await client.queries.getPoolStats('SUI_DBUSDC');

// Get price conversion
const conversion = await client.queries.getPriceConversion(
  'SUI_DBUSDC',
  10,
  true // SUI to USDC
);

// Get account information
const accountInfo = await client.queries.getAccountInfo({
  poolKey: 'SUI_DBUSDC',
  balanceManagerKey: 'your-balance-manager',
});
```

### 4. Flash Loan Operations

Execute flash loan arbitrage strategies:

```typescript
const arbitrageTx = await client.flashLoans.createFlashLoanArbitrage({
  borrowPoolKey: 'SUI_DBUSDC_A',
  tradePoolKey: 'SUI_DBUSDC_B',
  borrowAmount: 1000,
  tradeAmount: 1000,
  isBaseAsset: false,
});
```

### 5. Balance Management

Manage funds with BalanceManager:

```typescript
// Create a new balance manager
const createTx = await client.balanceManager.createBalanceManager({
  owner: '0xYourAddress',
  referralCode: '',
});

// Deposit funds
const depositTx = await client.balanceManager.deposit({
  managerKey: 'your-balance-manager',
  coinKey: 'SUI',
  amount: 100,
});

// Check balance
const balance = await client.balanceManager.checkBalance({
  managerKey: 'your-balance-manager',
  coinKey: 'SUI',
});

// Withdraw funds
const withdrawTx = await client.balanceManager.withdraw({
  managerKey: 'your-balance-manager',
  coinKey: 'SUI',
  amount: 50,
});
```

## Templates

The skill includes ready-to-use templates for common strategies:

### Market Making Bot
```typescript
import { MarketMakerBot } from './templates/market-maker.js';

const bot = new MarketMakerBot(tradingClient, {
  poolKey: 'SUI_DBUSDC',
  balanceManagerKey: 'your-balance-manager',
  spreadPercent: 0.1,
  orderSize: 10,
  refreshInterval: 30000,
  maxOrdersPerSide: 3,
});

await bot.start();
```

### Arbitrage Bot
```typescript
import { ArbitrageBot } from './templates/arbitrage-bot.js';

const bot = new ArbitrageBot(tradingClient, {
  monitoredPools: ['SUI_DBUSDC_A', 'SUI_DBUSDC_B', 'SUI_USDC'],
  minProfitThreshold: 5,
  maxFlashLoanSize: 10000,
  checkInterval: 10000,
});

await bot.start();
```

### Data Monitor
```typescript
import { DataMonitor } from './templates/data-monitor.js';

const monitor = new DataMonitor(tradingClient, {
  pools: [
    {
      key: 'SUI_DBUSDC',
      name: 'SUI/USDC Pool',
      alertThresholds: {
        spreadPercent: 0.5,
        priceChangePercent: 5,
        liquidityDropPercent: 30,
      },
    },
  ],
  checkInterval: 30000,
  historySize: 2880,
});

await monitor.start();
```

### Portfolio Manager
```typescript
import { PortfolioManager } from './templates/portfolio-manager.js';

const manager = new PortfolioManager(tradingClient, {
  pools: [
    {
      key: 'SUI_DBUSDC',
      name: 'SUI/USDC Pool',
      maxAllocation: 40,
      minAllocation: 20,
      rebalanceThreshold: 5,
    },
  ],
  totalPortfolioValue: 10000,
  rebalanceInterval: 300000,
});

await manager.start();
```

## Examples

The skill includes comprehensive examples:

1. **Basic Setup** (`examples/01-basic-setup.ts`) - Initialization and basic usage
2. **Order Book Queries** (`examples/02-orderbook-queries.ts`) - Market data analysis
3. **Limit Orders** (`examples/03-limit-order.ts`) - Placing and managing limit orders
4. **Market Orders** (`examples/04-market-order.ts`) - Executing market orders
5. **Swap Trading** (`examples/05-swap-trading.ts`) - Asset swapping strategies
6. **Flash Loans** (`examples/06-flash-loan.ts`) - Flash loan arbitrage examples
7. **Balance Manager** (`examples/07-balance-manager.ts`) - Fund management examples
8. **Advanced Trading** (`examples/08-advanced-trading.ts`) - Combined strategies

Run examples:
```bash
pnpm example:basic      # Run basic setup example
pnpm example:trading    # Run trading examples
```

## Configuration

### Client Configuration
```typescript
interface SimplifiedConfig {
  suiClient: SuiClient;           // Sui client instance
  address: string;                // User address
  environment: 'mainnet' | 'testnet' | 'devnet';
  balanceManagers?: Record<string, { address: string; tradeCap?: string }>;
}
```

### Environment Setup

1. **Mainnet**: Production environment with real assets
2. **Testnet**: Test environment with test assets
3. **Devnet**: Development environment

## Testing

Run tests:
```bash
pnpm test              # Run all tests
pnpm test:unit         # Run unit tests only
pnpm test:integration  # Run integration tests only
pnpm test:coverage     # Run tests with coverage report
```

Test structure:
- `tests/client-wrapper.test.ts` - Client wrapper tests
- `tests/transaction-wrapper.test.ts` - Trading operation tests
- `tests/integration.test.ts` - Integration tests

## Building and Development

```bash
# Build the project
pnpm build

# Build in watch mode
pnpm dev

# Lint the code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Architecture

### Directory Structure
```
deepbook-trading/
├── SKILL.md                    # Main skill documentation
├── README.md                   # Project documentation
├── package.json                # Package configuration
├── tsconfig.json               # TypeScript configuration
├── skill.json                  # Skill metadata
├── vitest.config.ts            # Test configuration
├── src/                        # Source code
│   ├── index.ts               # Main exports
│   ├── client-wrapper.ts      # Main client wrapper
│   ├── transaction-wrapper.ts # Trading operations
│   ├── query-wrapper.ts       # Market data queries
│   ├── flash-loan-wrapper.ts  # Flash loan operations
│   ├── balance-manager-wrapper.ts # Fund management
│   ├── types/                 # Type definitions
│   └── utils/                 # Utility functions
├── examples/                   # Usage examples
├── templates/                  # Strategy templates
├── tests/                      # Test files
└── config/                     # Configuration files
```

### Design Principles

1. **Simplicity**: Complex DeepBook operations are simplified through intuitive interfaces
2. **Type Safety**: Full TypeScript support with comprehensive type definitions
3. **Modularity**: Each component is independently usable
4. **Extensibility**: Easy to extend with custom strategies and functionality
5. **Claude Code Integration**: Designed as a Claude Code skill for seamless integration

## Best Practices

### Trading
- Always use appropriate slippage protection
- Monitor gas costs and network conditions
- Implement proper error handling and retry logic
- Test strategies with small amounts first
- Use limit orders for large trades to minimize market impact

### Risk Management
- Set position size limits
- Implement stop-loss mechanisms
- Diversify across multiple pools
- Monitor overall exposure
- Have manual override capabilities

### Performance
- Batch operations when possible
- Use appropriate caching for frequently accessed data
- Monitor RPC endpoint performance
- Implement connection pooling for high-frequency trading

## Troubleshooting

### Common Issues

1. **Transaction Failures**
   - Check account balances and gas fees
   - Verify pool availability and liquidity
   - Ensure proper slippage settings

2. **Connection Issues**
   - Verify RPC endpoint connectivity
   - Check network status
   - Implement retry logic with exponential backoff

3. **Data Inconsistencies**
   - Verify price information object freshness
   - Check for network forks or reorganizations
   - Implement data validation and sanity checks

### Error Handling

```typescript
try {
  const result = await client.trading.placeLimitOrder(params);
  // Handle success
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    // Handle insufficient balance
  } else if (error instanceof NetworkError) {
    // Handle network issues
  } else {
    // Handle other errors
  }
}
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Mysten Labs](https://mystenlabs.com/) for the Sui blockchain and DeepBook
- [Sui Foundation](https://suifoundation.org/) for ecosystem support
- The Sui developer community for feedback and contributions

## Support

- [Documentation](https://docs.sui.io/) - Sui documentation
- [Discord](https://discord.gg/sui) - Sui Discord community
- [GitHub Issues](https://github.com/mystenlabs/sui-eco-skills/issues) - Bug reports and feature requests

---

Built with ❤️ by the Mysten Labs team and the Sui community.