# SuiClient Skill

A comprehensive Claude Code skill for interacting with the Sui blockchain using the official `@mysten/sui` SDK.

## Features

- **Client Management**: Connect to mainnet, testnet, devnet, and localnet
- **Data Reading**: Get coins, objects, transactions, and balances
- **Transaction Execution**: Build, sign, and execute transactions
- **Network Information**: Get system state, gas prices, and protocol config
- **Move Package Interactions**: Query normalized Move data
- **Event Handling**: Query and subscribe to blockchain events
- **Staking Operations**: Manage staking positions
- **Error Handling**: Comprehensive error handling patterns

## Installation

```bash
# Install the skill
claude skills install sui-client

# Install dependencies
bun add @mysten/sui
```

## Quick Start

```typescript
import { SuiClient } from '@mysten/sui/client';

// Connect to mainnet
const client = new SuiClient({
  url: 'https://sui-mainnet.nodeinfra.com'
});

// Get account balance
const balance = await client.getBalance({
  owner: '0x123...',
  coinType: '0x2::sui::SUI'
});
```

## Examples

See the `examples/` directory for complete usage examples:

- `basic-usage.ts` - Basic client setup and data reading
- `transactions.ts` - Transaction building and execution
- `advanced.ts` - Advanced patterns and error handling

## API Reference

This skill provides comprehensive coverage of the SuiClient API including:

- **Reading Data**: `getObject()`, `getCoins()`, `getTransactionBlock()`
- **Writing Data**: `signAndExecuteTransaction()`, `executeTransactionBlock()`
- **Network Info**: `getLatestSuiSystemState()`, `getReferenceGasPrice()`
- **Events**: `queryEvents()`, `subscribeEvent()`
- **Staking**: `getStakes()`, `getStakesByIds()`

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for details.

## License

MIT