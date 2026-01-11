# Test Examples and Usage Patterns

This reference contains working examples extracted from the DLMM package test files. Use these as starting points for your own implementations.

## Environment Setup

All test files use these environment variables for wallet configuration:

```typescript
// Common pattern in all test files
const privateKey = process.env.SUI_WALLET_PRIVATEKEY || ''
const secret = process.env.SUI_WALLET_SECRET || ''
const mnemonic = process.env.SUI_WALLET_MNEMONICS || ''
```

### Wallet Initialization Pattern

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { fromBase64 } from '@mysten/sui/utils'
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography'

let keypair: Ed25519Keypair

if (privateKey) {
  // Preferred: From private key string
  keypair = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(privateKey).secretKey)
} else if (secret && secret.length > 0) {
  // Alternative: From base64 secret
  keypair = Ed25519Keypair.fromSecretKey(fromBase64(secret).slice(1, 33))
} else {
  // Fallback: From mnemonic
  keypair = Ed25519Keypair.deriveKeypair(mnemonic)
}

const wallet = keypair.getPublicKey().toSuiAddress()
```

## SDK Initialization

```typescript
import { initFerraSDK } from '@ferra-labs/dlmm'

// Most tests use testnet
const sdk = initFerraSDK({ network: 'testnet', wallet })

// Some use mainnet
const sdk = initFerraSDK({ network: 'mainnet', wallet })
```

## Key Test Examples

### 1. Creating a Pair (`create-pair.ts`)

```typescript
const SUI_COINTYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
const USDC_COINTYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'

const COIN_X = {
  type: SUI_COINTYPE,
  decimals: 9,
}

const COIN_Y = {
  type: USDC_COINTYPE,
  decimals: 6,
}

const binStep = 1
let initialPrice = 3.9
let activeId = BinMath.getIdFromPrice(initialPrice, binStep, COIN_X.decimals, COIN_Y.decimals)

// Adjust for token ordering
if (isSortedSymbols(COIN_X.type, COIN_Y.type)) {
  initialPrice = 1 / initialPrice
  activeId = BinMath.getIdFromPrice(initialPrice, binStep, COIN_Y.decimals, COIN_X.decimals)
}

const tx = await sdk.Factory.createLBPair({
  activeId: Number(activeId),
  binStep,
  tokenXType: USDC_COINTYPE,
  tokenYType: SUI_COINTYPE,
})
```

### 2. Adding Liquidity (`add-liquidity.ts`)

```typescript
const pair = await sdk.Pair.getPair(
  '0xb64263f776b3e84a21c6c5ad376fd911773c97ecf5ecc004dcfd3ff94b1c54b4'
)

if (!pair) {
  throw new Error('Pair not found')
}

const currentPairId = pair.parameters.active_id  // Get active ID

const coinXAmount = 250_00
const coinYAmount = 450
const slippage = 0.5

const distribution = DistributionUtils.createParams('BID_ASK', {
  activeId: currentPairId,
  binRange: [currentPairId - 500, currentPairId + 500],
  parsedAmounts: [
    Decimal(toDecimalsAmount(coinXAmount, 6)),
    Decimal(toDecimalsAmount(coinYAmount, 9)),
  ],
})

const tx = await sdk.Pair.addLiquidity(pair, {
  amountX: BigInt(toDecimalsAmount(coinXAmount, 6)),
  amountY: BigInt(toDecimalsAmount(coinYAmount, 9)),
  ...distribution,
  positionId: "0x2f83e88202c2873a129d648de9e2a053b2fce78cbed0fad12449c8578e15e089"
})
```

### 3. Swapping Tokens (`swap.ts`)

```typescript
const pair = await sdk.Pair.getPair('0x20ce617778f92183b7b00a88a79da798af2da19f1829ce4f62d87226c9dcaa74')
if (!pair) {
  throw new Error('Pair not found')
}

const binsData = formatBins([])
const AMOUNT = 10_000_000_000n
const XTOY = false

const swapOut = sdk.Swap.calculateRates(pair, {
  amount: AMOUNT,
  swapBins: binsData,
  xtoy: XTOY,
  decimalsA: 6,    // Must provide decimals
  decimalsB: 9     // Must provide decimals
})

const tx = await sdk.Swap.prepareSwap(pair, {
  amount: AMOUNT,
  xtoy: XTOY,
})
```

### 4. Opening a Position (`open-position.ts`)

```typescript
const pair = await sdk.Pair.getPair(
  '0x7e934d6ea0cf5b73cd67e5767781859b50e10b598d64b2323d7473959ed50097'
)

if (!pair) {
  throw new Error('Pair not found')
}

const currentPairId = pair.parameters.active_id

const coinXAmount = 1000
const coinYAmount = 1000

const distribution = DistributionUtils.createParams('BID_ASK', {
  activeId: currentPairId,
  binRange: [currentPairId - 100, currentPairId + 100],
  parsedAmounts: [
    Decimal(toDecimalsAmount(coinXAmount, 6)),
    Decimal(toDecimalsAmount(coinYAmount, 9)),
  ],
})

verifyDistribution(distribution)
const tx = await sdk.Pair.openPosition(pair)
```

### 5. Getting Pair Information (`get-pair.ts` pattern)

```typescript
// Simple pair fetching
const pair = await sdk.Pair.getPair(pairAddress)

if (pair) {
  console.log('Pair found:')
  console.log('- Address:', pair.address)
  console.log('- Bin step:', pair.binStep)
  console.log('- Active ID:', pair.parameters.active_id)
  console.log('- Reserves X:', pair.reserves.reserveX)
  console.log('- Reserves Y:', pair.reserves.reserveY)
  console.log('- Token X:', pair.tokenX)
  console.log('- Token Y:', pair.tokenY)
} else {
  console.log('Pair not found')
}

### 6. Getting Bin Data (`getPairBins` and `getPairBinsData`)

Use `getPairBins` to fetch bin reserves directly from chain for a specific range:

```typescript
// Example from remove-liquidity.ts line 27
const bins = await sdk.Pair.getPairBins(pair, [8445280, 8445287])
console.log('Bins data:', bins)

// Query a single bin (ID = 8445280):
const singleBin = await sdk.Pair.getPairBins(pair, [8445280, 8445281])
console.log('Single bin reserves:', singleBin[0])

// Each bin contains:
// {
//   reserve_x: string,  // Token X reserves (as string)
//   reserve_y: string   // Token Y reserves (as string)
// }
```

Use `getPairBinsData` to fetch complete bin information via API:

```typescript
// Get all bins data for a pair via API
const binData = await sdk.Pair.getPairBinsData(pair.address)
console.log('Total bins:', binData.length)

// Format bins for swap calculations
const formattedBins = formatBins(binData)

// Each bin contains complete metadata:
// {
//   bin_id: bigint,      // Bin ID
//   reserve_x: bigint,   // Token X reserves
//   reserve_y: bigint,   // Token Y reserves
//   price: bigint,       // Price in the bin
//   total_supply: bigint, // Total liquidity supply
//   fee_growth_x: bigint, // Fee growth for token X
//   fee_growth_y: bigint  // Fee growth for token Y
// }
```

**Key Differences:**
- `getPairBins`: Chain direct query, real-time reserves only
- `getPairBinsData`: API cached, complete metadata including prices and fees

## Dry-run vs Actual Execution Pattern

All test files follow this pattern:

```typescript
const TEST = true  // Set to false for actual execution

let res

if (TEST) {
  // Dry-run test
  res = await sdk.fullClient.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client: sdk.fullClient }),
  })

  // Calculate gas fees
  const gas = BigInt(res.effects!.gasUsed.storageCost) -
              BigInt(res.effects!.gasUsed.storageRebate) +
              BigInt(res.effects!.gasUsed.computationCost)
  console.log('Gas fee:', Number(gas) / 10 ** 9)
} else {
  // Actual execution
  res = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })
}
```

## Distribution Verification

```typescript
// From open-position.ts
const MAX_DIS = BigInt(toDecimalsAmount(1, 9))

function verifyDistribution(distribution: DistributionUtils.LiquidityDistributionParams) {
  const disX = distribution.distributionX.reduce((p, v) => (p += v, p), 0n)
  const disY = distribution.distributionY.reduce((p, v) => (p += v, p), 0n)

  if (disX > MAX_DIS || disY > MAX_DIS) {
    console.log('Distribution exceeds limits:', disX, disY)
    throw "MAX_DIS"
  }
}
```

## Token Decimal Management

All examples show that decimals must be provided:

```typescript
// Hardcoded decimals in tests
const decimalsA = 6  // USDC
const decimalsB = 9  // SUI

// Usage in calculations
const amount = toDecimalsAmount(100, 6)  // 100 USDC → 100000000

// Usage in BinMath
const price = BinMath.getPriceFromId(
  activeId,
  binStep,
  6,  // tokenXDecimals
  9   // tokenYDecimals
)
```

## Common Constants

```typescript
// Commonly used token types
const SUI_COINTYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
const USDC_COINTYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'

// Token configurations
const COIN_X = {
  type: SUI_COINTYPE,
  decimals: 9,
}

const COIN_Y = {
  type: USDC_COINTYPE,
  decimals: 6,
}
```

## Running Tests

Execute test files with Bun:

```bash
# Navigate to the dlmm package
cd packages/dlmm

# Run specific tests
bun test add-liquidity.ts
bun test create-pair.ts
bun test swap.ts
bun test open-position.ts
bun test remove-liquidity.ts
bun test claim-fee.ts
bun test claim-rewards.ts
bun test get-pair.ts
bun test math.ts

# Set environment variables
SUI_WALLET_PRIVATEKEY=your_private_key bun test create-pair.ts
```

## Key Patterns to Note

1. **Always check for pair existence**: `if (!pair) throw new Error('Pair not found')`
2. **Extract active ID**: `const currentPairId = pair.parameters.active_id`
3. **Use DistributionUtils**: For creating liquidity distribution parameters
4. **Provide token decimals**: All calculations require known decimals
5. **Test with dry-run first**: Always use `TEST = true` for initial testing
6. **Calculate gas fees**: From dry-run results before actual execution
7. **Handle token ordering**: Use `isSortedSymbols()` and adjust calculations

## File Locations

All test files are in `packages/dlmm/tests/`:
- `add-liquidity.ts` - Adding liquidity to existing positions
- `create-pair.ts` - Creating new trading pairs
- `swap.ts` - Token swapping operations
- `remove-liquidity.ts` - Removing liquidity from positions
- `open-position.ts` - Opening new positions
- `claim-fee.ts` - Claiming fee rewards
- `claim-rewards.ts` - Claiming liquidity rewards
- `get-pair.ts` - Fetching pair information
- `math.ts` - Mathematical utilities tests

## Next Steps

- [SDK Setup](./SDK_SETUP.md) for initialization details
- [Pair Operations](./PAIR_OPERATIONS.md) for liquidity management
- [Swap Operations](./SWAP_OPERATIONS.md) for token swapping
- [Position Management](./POSITION_MANAGEMENT.md) for position handling
- [Workflows](../workflows/) for step-by-step guides