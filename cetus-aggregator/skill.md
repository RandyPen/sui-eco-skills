---
name: cetus-aggregator
description: A Claude Code skill for working with the Cetus Aggregator SDK to execute optimized swaps across multiple Sui DEXs. Use this skill when you need to perform token swaps, find optimal routes across 30+ DEXs, execute gas-optimized transactions, or configure overlay fees on Sui blockchain.
---

# Cetus Aggregator SDK Skill

A Claude Code skill for working with the Cetus Aggregator SDK to execute optimized swaps across multiple Sui DEXs. This skill provides comprehensive tools for multi-DEX routing, price discovery, and gas-optimized swap execution using the `@cetusprotocol/aggregator-sdk` library.

## Instructions

Use this skill when you need to execute token swaps on the Sui blockchain. Includes:

1. **SDK Initialization**: Configure environment, wallet, and RPC connection
2. **Multi-DEX Routing**: Find optimal price routes across 30+ DEXs
3. **Swap Execution**: Execute fast swaps or manual route swaps
4. **Slippage Protection**: Configure slippage tolerance to protect transactions
5. **Gas Optimization**: Dynamic gas management and budget settings
6. **Protocol Fees**: Configure overlay fees and recipient addresses
7. **Error Handling**: Comprehensive error handling and market condition validation

## Quick Start

```typescript
// Initialize SDK
import { AggregatorClient, Env } from '@cetusprotocol/aggregator-sdk'
import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

const mnemonics: string = process.env.MNEMONICS!;
const i = 0;
const path = `m/44'/784'/${i}'/0'/0'`;
const keypair = Ed25519Keypair.deriveKeypair(mnemonics, path);
const wallet = keypair.toSuiAddress();

const suiClient = new SuiClient({
    url: process.env.RPC!,
});

const client = new AggregatorClient({
    signer: wallet,
    client: suiClient,
    env: Env.Mainnet,
});
```

## Core Features

### SDK Initialization
- **Environment Configuration**: Mainnet/Testnet support
- **Wallet Management**: Derive keypairs from mnemonics
- **RPC Configuration**: Custom RPC endpoint support

### Multi-DEX Routing
- **30+ DEX Support**: Access major Sui DEXs
- **Optimal Price Discovery**: Best price routing across providers
- **Provider Selection**: Customizable DEX provider list

### Swap Execution
- **Fast Router Swap**: Automatic token management
- **Manual Router Swap**: Advanced token control
- **Slippage Protection**: Configurable slippage tolerance

### Advanced Features
- **Overlay Fees**: Protocol fee integration
- **Pyth Oracle**: Price oracle integration
- **Gas Optimization**: Dynamic gas management

## Usage Examples

### Basic Swap Operations

```typescript
// Find optimal routes
const routers = await client.findRouters({
  from: "0x2::sui::SUI",
  target: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
  amount: new BN(1000000000),
  byAmountIn: true,
  providers: ["CETUS", "KRIYA", "AFTERMATH"]
});

// Execute fast swap
const txb = new Transaction();
await client.fastRouterSwap({
  router: routers,
  txb,
  slippage: 0.01,
  refreshAllCoins: true,
});

const result = await client.signAndExecuteTransaction(txb, keypair);
console.log("Swap executed:", result);
```

### Query Swap Function

```typescript
import { Transaction, coinWithBalance } from '@mysten/sui/transactions'
import BN from 'bn.js'
import { bcs } from '@mysten/sui/bcs'

export const querySwap = async (client: AggregatorClient, keypair: Ed25519Keypair, from: string, target: string, amount: string, amountOut: string) => {
    let router: any = null;
    let txb: any = null;
    let targetCoin: any = null;

    try {
        const wallet = keypair.toSuiAddress();

        const amountIn = new BN(amount);
        router = await client.findRouters({
            from,
            target,
            amount: amountIn,
            byAmountIn: true,
            providers: ["CETUS","SCALLOP","AFTERMATH","FLOWXV3","AFSUI","STEAMM","VOLO","KRIYAV3","KRIYA","ALPHAFI","FLOWX","BLUEMOVE","DEEPBOOKV3","BLUEFIN","HAEDAL","TURBOS","SPRINGSUI","STEAMM","METASTABLE","HAWAL","OBRIC"]
        });

        if (router === null) {
            return;
        }

        const amountOutput = router.amountOut;

        if (amountOutput.lt(new BN(amountOut))) {
            console.log("Trade condition not met");
            return;
        }

        txb = new Transaction();

        targetCoin = await client.routerSwap({
            router,
            txb,
            inputCoin: coinWithBalance({ type: from, balance: BigInt(amount) }),
            slippage: 0.01,
        });

        txb.moveCall({
            package: "0xe450c157978058fc23078941924ad91bfe3022db6243ffa432f7209ad5bc9889",
            module: "utils",
            function: "check_coin_threshold",
            arguments: [
                targetCoin,
                txb.pure(bcs.U64.serialize(BigInt(amountOut))),
            ],
            typeArguments: [
                target,
            ],
        });
        txb.transferObjects([targetCoin], wallet);

        txb.setSender(wallet);
        txb.setGasBudget(1_000000000);

        const result = await client.client.signAndExecuteTransaction({ transaction: txb, signer: keypair });
        console.log("result", result);

    } catch (error) {
        console.log("querySwap error:", error);
    } finally {
        router = null;
        txb = null;
        targetCoin = null;

        if (global.gc) {
            global.gc();
        }
    }
}
```

### Provider Management

```typescript
import { getAllProviders, getProvidersExcluding, getProvidersIncluding } from '@cetusprotocol/aggregator-sdk'

// Get all supported providers
const allProviders = getAllProviders()

// Get providers excluding specific ones
const filteredProviders = getProvidersExcluding(["CETUS", "KRIYA"])

// Get only specific providers
const specificProviders = getProvidersIncluding(["TURBOS", "AFTERMATH"])
```

### Supported DEXs

The aggregator supports 30+ DEXs, including:
- **CETUS**, **KRIYA** (V2/V3), **FLOWX** (V2/V3), **TURBOS**, **AFTERMATH**
- **HAEDAL**, **VOLO**, **AFSUI**, **BLUEMOVE**, **DEEPBOOKV3**
- **SCALLOP**, **SUILEND**, **BLUEFIN**, **HAEDALPMM**, **ALPHAFI**
- **SPRINGSUI**, **STEAMM**, **METASTABLE**, **OBRIC**, **HAWAL**
- **MOMENTUM**, **STEAMM_OMM**, **STEAMM_OMM_V2**, **MAGMA**, **SEVENK**
- **HAEDALHMMV2**, **FULLSAIL**

### Common Token Types

```typescript
// Mainnet token types
const SUI = "0x2::sui::SUI"
const USDC = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
const USDT = "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT"
const CETUS = "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"
const AFSUI = "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI"
const HA_SUI = "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HA_SUI"
```

## Best Practices

### Route Validation
```typescript
// Always check for null routes
const routers = await client.findRouters({
  from: "0x2::sui::SUI",
  target: "0x...::cetus::CETUS",
  amount: new BN(1000000000),
  byAmountIn: true,
});

if (routers) {
  // Execute swap
} else {
  console.log("No routes found");
}
```

### Slippage Management
```typescript
// Use appropriate slippage based on market conditions
const slippage = 0.01; // 1% for stable pairs
const slippage = 0.05; // 5% for volatile pairs
```

### Gas Optimization
```typescript
// Set appropriate gas budget
txb.setGasBudget(1_000000000); // 1 SUI for complex swaps
txb.setGasBudget(500000000);   // 0.5 SUI for simple swaps
```

## Error Handling

```typescript
try {
  const routers = await client.findRouters({
    from: "0x2::sui::SUI",
    target: "0x...::cetus::CETUS",
    amount: new BN(1000000000),
    byAmountIn: true,
  });

  if (routers) {
    const txb = new Transaction();
    await client.fastRouterSwap({
      router: routers,
      txb,
      slippage: 0.01,
      refreshAllCoins: true,
    });

    const result = await client.signAndExecuteTransaction(txb, keypair);
  } else {
    console.log("No routes found");
  }
} catch (error) {
  console.error("Swap execution failed:", error);
}
```

## Complete Workflow Example

```typescript
import { AggregatorClient, Env } from '@cetusprotocol/aggregator-sdk'
import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import BN from 'bn.js'

async function executeOptimizedSwap() {
  // 1. Initialize client
  const mnemonics: string = process.env.MNEMONICS!;
  const keypair = Ed25519Keypair.deriveKeypair(mnemonics, `m/44'/784'/0'/0'/0'`);

  const suiClient = new SuiClient({ url: process.env.RPC! });
  const client = new AggregatorClient({
    signer: keypair.toSuiAddress(),
    client: suiClient,
    env: Env.Mainnet,
  });

  // 2. Find optimal routes
  const routers = await client.findRouters({
    from: "0x2::sui::SUI",
    target: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    amount: new BN(1000000000),
    byAmountIn: true,
    providers: ["CETUS", "KRIYA", "AFTERMATH"]
  });

  if (!routers) {
    console.log("No routes available");
    return;
  }

  // 3. Execute swap
  const txb = new Transaction();
  await client.fastRouterSwap({
    router: routers,
    txb,
    slippage: 0.01,
    refreshAllCoins: true,
  });

  const result = await client.signAndExecuteTransaction(txb, keypair);
  console.log("Swap completed:", result.digest);

  return result;
}
```

## Dependencies

- `@cetusprotocol/aggregator-sdk`: ^1.4.2 (core SDK library)
- `@mysten/sui`: ^1.45.0 (Sui blockchain client)
- `bn.js`: ^5.2.0 (big number processing)
- TypeScript: ^5.0.0 (language support)

## Support

If you encounter issues or have questions:
- Check the official Cetus documentation
- Check SDK error codes and messages
- Test on testnet before deploying to mainnet
- Monitor gas usage and adjust budgets accordingly

---

**Skill Version**: 1.0.0
**Last Updated**: 2025-11-25
**Compatibility**: Cetus Aggregator SDK v1.0+