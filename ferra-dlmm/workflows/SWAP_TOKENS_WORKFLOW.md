# Workflow: Swapping Tokens

This workflow guides you through swapping tokens in a DLMM pair.

## Prerequisites

- Existing pair address
- Wallet with token to swap
- Token decimals (must be known externally)
- Swap direction (X→Y or Y→X)

## Steps

### Step 1: Get Pair Information

```typescript
import { initFerraSDK } from '@ferra-labs/dlmm'

// Initialize SDK
const sdk = initFerraSDK({ network: 'testnet', wallet })

// Get pair
const pairAddress = '0x...' // Your pair address
const pair = await sdk.Pair.getPair(pairAddress)

if (!pair) {
  throw new Error('Pair not found')
}

console.log('Pair tokens:', {
  tokenX: pair.tokenX,
  tokenY: pair.tokenY,
  activeId: pair.parameters.active_id,
  binStep: pair.binStep
})
```

### Step 2: Calculate Swap Rates

```typescript
import { formatBins } from '@ferra-labs/dlmm'

// Amount to swap (in smallest token units)
const AMOUNT = 10_000_000_000n  // Example: 10 USDC (with 6 decimals = 10 * 10^6)

// Swap direction
const XTOY = false  // true = swap X for Y, false = swap Y for X

// Token decimals (MUST be known)
const decimalsA = 6  // Token A decimals
const decimalsB = 9  // Token B decimals

// Format bins data (empty array uses all bins)
const binsData = formatBins([])

// Calculate swap rates
const swapOut = sdk.Swap.calculateRates(pair, {
  amount: AMOUNT,
  swapBins: binsData,
  xtoy: XTOY,
  decimalsA,
  decimalsB
})

console.log('Swap calculation:', {
  estimatedAmountOut: swapOut.estimatedAmountOut,
  priceImpact: swapOut.priceImpact,
  feeAmount: swapOut.feeAmount
})
```

### Step 3: Determine Swap Direction

```typescript
import { isSortedSymbols } from '@ferra-labs/dlmm'

// Check if your intended swap matches pair token order
const tokenAType = '0x...' // Your input token type
const tokenBType = '0x...' // Your output token type

// Determine correct swap direction based on token order
let xtoy: boolean

if (tokenAType === pair.tokenX && tokenBType === pair.tokenY) {
  xtoy = true  // X → Y
} else if (tokenAType === pair.tokenY && tokenBType === pair.tokenX) {
  xtoy = false // Y → X
} else {
  throw new Error('Tokens not found in pair')
}

// Alternative: Use isSortedSymbols for complex cases
if (!isSortedSymbols(tokenAType, tokenBType)) {
  // Tokens need to be swapped in your logic
  console.log('Note: Tokens are not in sorted order, adjust calculations')
}
```

### Step 4: Prepare Swap Transaction

```typescript
const tx = await sdk.Swap.prepareSwap(pair, {
  amount: AMOUNT,
  xtoy: XTOY,  // Use the direction from Step 3
})
```

### Step 5: Estimate Gas Fees

```typescript
const TEST = true  // Set to false for actual execution

if (TEST) {
  const res = await sdk.fullClient.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client: sdk.fullClient }),
  })

  // Check for errors
  if (res.effects?.status.status !== 'success') {
    console.error('Dry-run failed:', res.effects?.status.error)
    throw new Error('Dry-run failed')
  }

  // Calculate gas fees
  const gas = BigInt(res.effects!.gasUsed.storageCost) -
              BigInt(res.effects!.gasUsed.storageRebate) +
              BigInt(res.effects!.gasUsed.computationCost)
  console.log('Estimated gas fee:', Number(gas) / 10 ** 9, 'SUI')

  // Compare estimated vs actual
  console.log('Estimated output:', swapOut.estimatedAmountOut)

  // Parse swap event from dry-run to see actual output
  const swapEvent = res.events?.find((e) => e.type.endsWith('SwapEvent'))?.parsedJson
  if (swapEvent) {
    const actualOut = swapEvent.swap_for_y
      ? swapEvent.amounts_out_y.reduce((p, v) => ((p += BigInt(v)), p), 0n)
      : swapEvent.amounts_out_x.reduce((p, v) => ((p += BigInt(v)), p), 0n)
    console.log('Dry-run actual output:', actualOut)
  }
}
```

### Step 6: Execute Swap

```typescript
if (!TEST) {
  const res = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })

  console.log('Swap executed:', res.digest)

  // Parse swap event for details
  const swapEvent = res.events?.find((e) => e.type.endsWith('SwapEvent'))!.parsedJson as any

  const amountOut = swapEvent.swap_for_y
    ? swapEvent.amounts_out_y.reduce((p, v) => ((p += BigInt(v)), p), 0n)
    : swapEvent.amounts_out_x.reduce((p, v) => ((p += BigInt(v)), p), 0n)

  const fee = swapEvent.swap_for_y
    ? swapEvent.total_fees_x.reduce((p, v) => ((p += BigInt(v)), p), 0n)
    : swapEvent.total_fees_y.reduce((p, v) => ((p += BigInt(v)), p), 0n)

  console.log('Swap results:', {
    amountOut,
    fee,
    direction: swapEvent.swap_for_y ? 'X→Y' : 'Y→X',
    estimated: swapOut.estimatedAmountOut,
    difference: amountOut - swapOut.estimatedAmountOut
  })
}
```

## Complete Example

```typescript
async function executeSwap(
  pairAddress: string,
  inputTokenType: string,
  outputTokenType: string,
  amountHuman: number,
  inputTokenDecimals: number,
  outputTokenDecimals: number
) {
  // 1. Setup
  const keypair = Ed25519Keypair.fromSecretKey(/* your secret key */)
  const wallet = keypair.getPublicKey().toSuiAddress()
  const sdk = initFerraSDK({ network: 'testnet', wallet })

  // 2. Get pair
  const pair = await sdk.Pair.getPair(pairAddress)
  if (!pair) throw new Error('Pair not found')

  // 3. Determine swap direction
  let xtoy: boolean
  if (inputTokenType === pair.tokenX && outputTokenType === pair.tokenY) {
    xtoy = true
  } else if (inputTokenType === pair.tokenY && outputTokenType === pair.tokenX) {
    xtoy = false
  } else {
    throw new Error('Tokens not found in pair')
  }

  // 4. Convert amount
  const amount = BigInt(toDecimalsAmount(amountHuman, inputTokenDecimals))

  // 5. Calculate rates
  const binsData = formatBins([])
  const swapOut = sdk.Swap.calculateRates(pair, {
    amount,
    swapBins: binsData,
    xtoy,
    decimalsA: inputTokenDecimals,
    decimalsB: outputTokenDecimals
  })

  console.log('Price impact:', swapOut.priceImpact)
  if (swapOut.priceImpact > 0.05) { // 5% threshold
    console.warn('High price impact! Consider splitting swap')
  }

  // 6. Prepare transaction
  const tx = await sdk.Swap.prepareSwap(pair, {
    amount,
    xtoy
  })

  // 7. Dry-run test
  const dryRun = await sdk.fullClient.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client: sdk.fullClient }),
  })

  if (dryRun.effects?.status.status !== 'success') {
    throw new Error(`Dry-run failed: ${dryRun.effects?.status.error}`)
  }

  // 8. Execute
  const result = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })

  // 9. Parse results
  const swapEvent = result.events?.find((e) => e.type.endsWith('SwapEvent'))!.parsedJson as any
  const actualOut = swapEvent.swap_for_y
    ? swapEvent.amounts_out_y.reduce((p, v) => ((p += BigInt(v)), p), 0n)
    : swapEvent.amounts_out_x.reduce((p, v) => ((p += BigInt(v)), p), 0n)

  return {
    result,
    estimated: swapOut.estimatedAmountOut,
    actual: actualOut,
    priceImpact: swapOut.priceImpact,
    gasUsed: dryRun.effects?.gasUsed
  }
}
```

## Token Decimal Conversion

Always convert human-readable amounts to on-chain amounts:

```typescript
import { toDecimalsAmount, fromDecimalsAmount } from '@ferra-labs/dlmm'

// Human → On-chain
const humanAmount = 10.5  // 10.5 USDC
const decimals = 6
const onChainAmount = BigInt(toDecimalsAmount(humanAmount, decimals))  // 10500000

// On-chain → Human
const onChainValue = 10500000n
const humanValue = fromDecimalsAmount(Number(onChainValue), decimals)  // 10.5
```

## Price Impact Considerations

Check price impact before executing large swaps:

```typescript
const priceImpact = swapOut.priceImpact  // decimal (e.g., 0.01 = 1%)

if (priceImpact > 0.01) {  // 1% threshold
  console.warn(`High price impact: ${(priceImpact * 100).toFixed(2)}%`)

  // Consider splitting into multiple smaller swaps
  // or checking if slippage tolerance is acceptable
}
```

## Slippage Protection

While the SDK handles slippage internally, you can implement additional checks:

```typescript
const minExpectedOutput = swapOut.estimatedAmountOut * 99n / 100n  // 1% slippage tolerance

// After swap execution, compare actual vs minimum expected
if (actualOut < minExpectedOutput) {
  console.warn('Slippage exceeded tolerance')
}
```

## Checklist

- [ ] Pair address is correct and pair exists
- [ ] Wallet has sufficient input tokens
- [ ] Token decimals are known and correct
- [ ] Swap direction determined correctly
- [ ] Price impact checked and acceptable
- [ ] Dry-run test successful
- [ ] Gas fees acceptable
- [ ] Slippage tolerance set (if needed)

## Common Issues

1. **Wrong token order**: Verify `xtoy` direction matches pair token order
2. **Insufficient balance**: Check wallet balance before swapping
3. **High price impact**: Large swaps may move price significantly
4. **Wrong decimals**: Incorrect decimals lead to wrong amount calculations
5. **Network congestion**: Gas fees may be high during peak times

## Related References

- [Swap Operations](../reference/SWAP_OPERATIONS.md)
- [Pair Operations](../reference/PAIR_OPERATIONS.md)
- [Test Examples](../reference/TEST_EXAMPLES.md)
- [Swap Test](../../packages/dlmm/tests/swap.ts)