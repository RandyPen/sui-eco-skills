# Swap Operations and Price Calculations

This reference covers token swapping operations and price calculation utilities in the DLMM SDK.

## Calculating Swap Rates

Use `calculateRates()` to estimate swap outcomes before executing:

```typescript
// Example from swap.ts lines 52-58
const swapOut = sdk.Swap.calculateRates(pair, {
  amount: AMOUNT,          // Amount to swap (in smallest units)
  swapBins: binsData,      // Formatted bins data (use formatBins([]) for all bins)
  xtoy: XTOY,              // Swap direction: true = X→Y, false = Y→X
  decimalsA: 6,            // Token A decimals (MUST be provided)
  decimalsB: 9             // Token B decimals (MUST be provided)
})

console.log('Estimated swap output:', swapOut)
```

### Parameters

- `amount`: Amount to swap in smallest token units (e.g., 1000000 for 1 USDC with 6 decimals)
- `swapBins`: Bin data for the swap (use `formatBins([])` to include all bins)
- `xtoy`: Swap direction
  - `true`: Swap token X for token Y
  - `false`: Swap token Y for token X
- `decimalsA`: Decimals of token A (must match token order)
- `decimalsB`: Decimals of token B (must match token order)

### Return Value

The `calculateRates()` returns an object with:
- `estimatedAmountOut`: Estimated output amount
- `priceImpact`: Price impact of the swap
- `feeAmount`: Estimated fee amount
- Other swap metrics

## Preparing Swap Transactions

After calculating rates, prepare the actual swap transaction:

```typescript
// Example from swap.ts lines 63-66
const tx = await sdk.Swap.prepareSwap(pair, {
  amount: AMOUNT,
  xtoy: XTOY,  // Same direction as calculateRates
})
```

### Executing the Swap

```typescript
// Dry-run test first (recommended)
if (TEST) {
  const res = await sdk.fullClient.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client: sdk.fullClient }),
  })

  // Calculate gas fees
  const gas = BigInt(res.effects!.gasUsed.storageCost) -
              BigInt(res.effects!.gasUsed.storageRebate) +
              BigInt(res.effects!.gasUsed.computationCost)
  console.log('Gas fee:', Number(gas) / 10 ** 9)
} else {
  // Execute actual swap
  const res = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })
}
```

## Token Ordering and Direction

### Checking Token Order

```typescript
import { isSortedSymbols } from '@ferra-labs/dlmm'

const tokenXType = '0x...usdc::USDC'
const tokenYType = '0x...sui::SUI'

// Check if tokens are in correct order
if (!isSortedSymbols(tokenXType, tokenYType)) {
  // Swap the tokens to correct order
  [tokenXType, tokenYType] = [tokenYType, tokenXType]

  // Also invert swap direction if needed
  xtoy = !xtoy
}
```

### Swap Direction Logic

- **X → Y** (`xtoy: true`): Swap token X for token Y
- **Y → X** (`xtoy: false`): Swap token Y for token X

The direction depends on token ordering in the pair. Check the pair's `tokenX` and `tokenY` fields.

## Bin Math Utilities

### Converting Price to Bin ID

```typescript
import { BinMath } from '@ferra-labs/dlmm'

// Example from create-pair.ts lines 39-43
const binStep = 1  // 0.01%
let initialPrice = 3.9

// Calculate bin ID from price
let activeId = BinMath.getIdFromPrice(
  initialPrice,
  binStep,
  COIN_X.decimals,  // Token X decimals
  COIN_Y.decimals   // Token Y decimals
)

// Adjust for token ordering
if (isSortedSymbols(COIN_X.type, COIN_Y.type)) {
  initialPrice = 1 / initialPrice
  activeId = BinMath.getIdFromPrice(
    initialPrice,
    binStep,
    COIN_Y.decimals,
    COIN_X.decimals
  )
}
```

### Converting Bin ID to Price

```typescript
// Example adapted from swap.ts line 71 pattern
const currentBinId = pair.parameters.active_id
const price = BinMath.getPriceFromId(
  currentBinId,
  Number(pair.binStep),
  params.decimalsA,  // Must be provided
  params.decimalsB   // Must be provided
)
```

## Formatting Bins Data

The `formatBins()` utility prepares bin data for swap calculations:

```typescript
import { formatBins } from '@ferra-labs/dlmm'

// Empty array includes all bins
const binsData = formatBins([])

// Or specify specific bins
const binsData = formatBins([
  { binId: 100, reserveX: '1000000', reserveY: '0' },
  { binId: 101, reserveX: '500000', reserveY: '500000' }
])
```

## Working with Swap Events

After executing a swap, you can extract event data:

```typescript
// Example from swap.ts lines 84-93
const swapEvent = res.events?.find((e) => e.type.endsWith('SwapEvent'))!.parsedJson as SwapEvent

// Calculate actual output amount
const amountOut = swapEvent.swap_for_y
  ? swapEvent.amounts_out_y.reduce((p, v) => ((p += BigInt(v)), p), 0n)
  : swapEvent.amounts_out_x.reduce((p, v) => ((p += BigInt(v)), p), 0n)

// Calculate total fees
const fee = swapEvent.swap_for_y
  ? swapEvent.total_fees_x.reduce((p, v) => ((p += BigInt(v)), p), 0n)
  : swapEvent.total_fees_y.reduce((p, v) => ((p += BigInt(v)), p), 0n)

console.log('Actual output:', amountOut)
console.log('Total fees:', fee)
```

## Complete Swap Example

```typescript
async function executeSwap(
  pairAddress: string,
  amount: bigint,
  xtoy: boolean,
  tokenADecimals: number,
  tokenBDecimals: number
) {
  // Get pair
  const pair = await sdk.Pair.getPair(pairAddress)
  if (!pair) throw new Error('Pair not found')

  // Calculate rates
  const binsData = formatBins([])
  const swapOut = sdk.Swap.calculateRates(pair, {
    amount,
    swapBins: binsData,
    xtoy,
    decimalsA: tokenADecimals,
    decimalsB: tokenBDecimals
  })

  console.log('Estimated output:', swapOut.estimatedAmountOut)
  console.log('Price impact:', swapOut.priceImpact)

  // Prepare transaction
  const tx = await sdk.Swap.prepareSwap(pair, {
    amount,
    xtoy
  })

  // Dry-run test
  const dryRun = await sdk.fullClient.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client: sdk.fullClient }),
  })

  // Check for errors
  if (dryRun.effects?.status.status !== 'success') {
    throw new Error(`Dry-run failed: ${dryRun.effects?.status.error}`)
  }

  // Execute if dry-run successful
  const result = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })

  return {
    swapOut,
    result,
    gasUsed: dryRun.effects?.gasUsed
  }
}
```

## Important Notes

1. **Decimals are required**: Both `calculateRates()` and `BinMath` functions need token decimals as parameters
2. **Always dry-run first**: Test transactions with `dryRunTransactionBlock()` before execution
3. **Check token ordering**: Use `isSortedSymbols()` to ensure correct token order
4. **Gas estimation**: Calculate gas fees from dry-run results
5. **Price impact**: Check `swapOut.priceImpact` for large swaps

## Next Steps

- [Pair Operations](./PAIR_OPERATIONS.md) for liquidity management
- [Getting Active Bin Info](../workflows/GET_ACTIVE_BIN_INFO_WORKFLOW.md) for current price information
- [Test Examples](./TEST_EXAMPLES.md) for more swap examples