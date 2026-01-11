---
name: working-with-ferra-dlmm
description: "Helps developers work with the Ferra DLMM SDK for Discrete Liquidity Market Maker operations on Sui blockchain. Provides guidance on SDK initialization, pair creation, liquidity management, token swaps, and position handling. Use when working with DLMM pairs, adding/removing liquidity, creating trading pairs, or performing token swaps in the ferra-sdks monorepo."
allowed-tools: Read, Glob, Grep, Bash
---

# Working with Ferra DLMM SDK

This skill helps you work with the Ferra Discrete Liquidity Market Maker (DLMM) SDK for Sui blockchain. The SDK provides tools for liquidity management, pair creation, token swapping, and position handling in DLMM pools.

## Overview

The `@ferra-labs/dlmm` package is a TypeScript SDK for interacting with Discrete Liquidity Market Maker protocols on Sui. It supports:

- **Factory operations**: Creating new trading pairs
- **Pair management**: Fetching pair data and managing liquidity pools
- **Position handling**: Opening, closing, and managing liquidity positions
- **Swap operations**: Token swapping with precise price calculations
- **Quoter utilities**: Price quoting and calculation tools

## Quick Start

### SDK Initialization

Initialize the SDK with a specific network (mainnet, testnet, beta):

```typescript
import { initFerraSDK } from '@ferra-labs/dlmm'

const sdk = initFerraSDK({
  network: 'testnet',
  wallet: '0x...your_wallet_address'
})
```

### Basic Usage Pattern

```typescript
// Get a pair by its address
const pair = await sdk.Pair.getPair(pairAddress)

// Check current active bin
const activeId = pair.parameters.active_id
console.log(`Current active bin ID: ${activeId}`)
```

## Core Modules

The SDK is organized into these main modules:

1. **Factory** (`sdk.Factory`) - Creating and managing trading pairs
2. **Pair** (`sdk.Pair`) - Liquidity pool operations and pair information
3. **Position** (`sdk.Position`) - Opening, closing, and managing positions
4. **Swap** (`sdk.Swap`) - Token swapping with rate calculations
5. **Quoter** (`sdk.Quoter`) - Price quoting utilities

## Common Patterns

For detailed guidance on specific operations, refer to these reference files:

- [SDK Setup and Configuration](./reference/SDK_SETUP.md)
- [Pair Operations and Liquidity Management](./reference/PAIR_OPERATIONS.md)
- [Swap Operations and Price Calculations](./reference/SWAP_OPERATIONS.md)
- [Position Management](./reference/POSITION_MANAGEMENT.md)
- [Test Examples and Usage Patterns](./reference/TEST_EXAMPLES.md)

## Workflows

Step-by-step guides for common tasks:

1. [Creating a New Trading Pair](./workflows/CREATE_PAIR_WORKFLOW.md)
2. [Adding Liquidity to a Pair](./workflows/ADD_LIQUIDITY_WORKFLOW.md)
3. [Swapping Tokens](./workflows/SWAP_TOKENS_WORKFLOW.md)
4. [Managing Positions](./workflows/MANAGE_POSITIONS_WORKFLOW.md)
5. [Getting Active Bin Information](./workflows/GET_ACTIVE_BIN_INFO_WORKFLOW.md)

## Testing

The package includes comprehensive test examples. You can run them with:

```bash
# Navigate to the dlmm package
cd packages/dlmm

# Run specific test files
bun test add-liquidity.ts
bun test create-pair.ts
bun test swap.ts
```

Test files are located in `packages/dlmm/tests/` and provide working examples of all major operations.

## Tool Usage

This skill allows the following tools:

- **Read**: Access files in the codebase to understand implementation details
- **Glob**: Find files by pattern (e.g., `**/*.ts` for TypeScript files)
- **Grep**: Search for specific code patterns or function definitions
- **Bash**: Execute test commands and scripts

## Getting Help

When working with the DLMM SDK:

1. **Check the test files first** - they contain working examples
2. **Review the reference files** - they provide detailed explanations
3. **Follow the workflows** - step-by-step guides for common tasks
4. **Examine the source code** - use Read/Glob/Grep tools to explore

## Key Concepts

- **Discrete Liquidity**: Liquidity is concentrated in specific price ranges (bins)
- **Active Bin**: The current price bin where trading occurs
- **Bin Step**: The percentage difference between adjacent bins
- **Distribution Strategies**: How liquidity is allocated across bins (BID_ASK, etc.)

Start with the [SDK Setup](./reference/SDK_SETUP.md) reference for detailed initialization instructions.