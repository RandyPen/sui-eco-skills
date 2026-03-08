---
name: sui-client
description: Interact with Sui blockchain using @mysten/sui SDK. Use when building transactions, reading chain data, or managing staking positions on Sui.
---

# SuiClient Skill

Use this skill when working with Sui blockchain. JSON-RPC is deprecated - use **gRPC** or **GraphQL**.

## Quick Start

```typescript
// gRPC (recommended) - @mysten/sui/grpc
import { SuiGrpcClient } from "@mysten/sui/grpc";
const client = new SuiGrpcClient({ network: "mainnet" });

// GraphQL - @mysten/sui/graphql
import { SuiGraphQLClient } from "@mysten/sui/graphql";
const client = new SuiGraphQLClient({
  network: "mainnet",
  url: "https://your-graphql-endpoint/graphql",
});
```

## Key Imports

| Feature               | Import Path                    |
| --------------------- | ------------------------------ |
| gRPC Client           | `@mysten/sui/grpc`             |
| GraphQL Client        | `@mysten/sui/graphql`          |
| Transaction           | `@mysten/sui/transactions`     |
| Keypairs              | `@mysten/sui/keypairs/ed25519` |
| JSON-RPC (deprecated) | `@mysten/sui/jsonRpc`          |

## API Methods

### Objects

```typescript
// Get single object
const obj = await client.getObject({
  id: "0x...",
  options: { showType: true, showContent: true },
});

// Get multiple objects
const objs = await client.multiGetObjects({
  ids: ["0x...", "0x..."],
  options: { showType: true },
});

// List owned objects
const owned = await client.listOwnedObjects({
  owner: "0x...",
  filter: { StructType: "0x2::coin::Coin" },
});

// Get dynamic field
const field = await client.getDynamicField({
  parentId: "0x...",
  name: { type: "...", value: "..." },
});

// List dynamic fields
const fields = await client.listDynamicFields({
  parentId: "0x...",
  limit: 50,
});
```

### Coins & Balances

```typescript
// List coins (paginated) - NOTE: NOT getCoins
const coins = await client.listCoins({
  owner: "0x...",
  coinType: "0x2::sui::SUI",
  limit: 100,
  cursor: "...",
});

// Get balance
const balance = await client.getBalance({
  owner: "0x...",
  coinType: "0x2::sui::SUI",
});

// List all balances
const balances = await client.listBalances({ owner: "0x..." });

// Get coin metadata
const meta = await client.getCoinMetadata({
  coinType: "0x2::sui::SUI",
});
```

### Transactions

```typescript
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const keypair = Ed25519Keypair.fromSecretKey("...");
const tx = new Transaction();

// Build transaction...
tx.moveCall({ target: "0x...::module::function" });

// Execute transaction
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  options: { showEffects: true },
});

// Wait for transaction
const confirmed = await client.waitForTransaction({
  digest: result.digest,
  options: { showEffects: true },
});

// Simulate transaction (dry run)
const simulated = await client.simulateTransaction({
  transaction: tx,
  signer: keypair.getPublicKey(),
});

// Get transaction
const txResult = await client.getTransaction({
  digest: "...",
  options: { showEffects: true, showObjectChanges: true },
});
```

### Network Info

```typescript
// Get reference gas price
const gasPrice = await client.getReferenceGasPrice();

// Get current system state (NOT getLatestSuiSystemState)
const state = await client.getCurrentSystemState();

// Get chain identifier
const chainId = await client.getChainIdentifier();

// Get protocol config
const config = await client.getProtocolConfig();

// Get current epoch
const epoch = await client.getCurrentEpoch();
```

### Move Package

```typescript
// Get Move function metadata
const func = await client.getMoveFunction({
  package: "0x...",
  module: "...",
  function: "...",
});
```

### Name Service

```typescript
// Resolve address to .sui name
const name = await client.defaultNameServiceName({
  address: "0x...",
});
```

### zkLogin

```typescript
// Verify zkLogin signature
const result = await client.verifyZkLoginSignature({
  bytes: "...",
  signature: "...",
  intentScope: "TransactionData",
  address: "0x...",
});
```

## gRPC-Specific Features

```typescript
const client = new SuiGrpcClient({ network: "mainnet" });

// Direct service access
client.transactionExecutionService;
client.ledgerService;
client.stateService;
client.subscriptionService;
client.movePackageService;
client.signatureVerificationService;
client.nameService;

// MVR support (transaction simulation)
client.mvr.resolvePackage({ package: "0x..." });
client.mvr.resolveType({ type: "0x..." });
client.mvr.resolve({ packages: ["0x..."] });
```

## GraphQL-Specific Features

```typescript
import { graphql } from '@mysten/sui/graphql/schema';

const client = new SuiGraphQLClient({
  network: 'mainnet',
  url: 'https://.../graphql',
  queries: {
    myQuery: graphql(`
      query getBalance($owner: SuiAddress!) {
        address(owner: $owner) {
          balance { totalBalance }
        }
      }
    `)
  }
});

// Execute predefined query
const result = await client.execute('myQuery', {
  variables: { owner: '0x...' }
});

// Execute inline query
const inline = await client.query({
  query: graphql(`query { ... }`),
  variables: { ... }
});
```

## NOT Available in gRPC/GraphQL (use JSON-RPC for now)

- `getStakes` / `getStakesByIds` - Staking queries
- `queryEvents` / `subscribeEvent` - Event queries
- `getCoins` - Use `listCoins` instead

## Network Endpoints

Contact your RPC provider for current endpoints. JSON-RPC (deprecated):

- mainnet: `https://fullnode.mainnet.sui.io:443`
- testnet: `https://fullnode.testnet.sui.io:443`
- devnet: `https://fullnode.devnet.sui.io:443`

## Dependencies

```bash
bun add @mysten/sui
```
