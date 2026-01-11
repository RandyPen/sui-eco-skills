# Workflow: Creating a New Trading Pair

This workflow guides you through creating a new DLMM trading pair.

## Prerequisites

- Wallet with SUITokens for gas fees
- Token types (coin addresses) for both tokens
- Token decimals (must be known externally)

## Steps

### Step 1: Set up Wallet and SDK

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { initFerraSDK } from '@ferra-labs/dlmm'

// Initialize wallet (use your preferred method)
const keypair = Ed25519Keypair.fromSecretKey(/* your secret key */)
const wallet = keypair.getPublicKey().toSuiAddress()

// Initialize SDK
const sdk = initFerraSDK({ network: 'testnet', wallet })
```

### Step 2: Define Token Types and Decimals

```typescript
// Example tokens (replace with your token addresses)
const SUI_COINTYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
const USDC_COINTYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'

const COIN_X = {
  type: SUI_COINTYPE,
  decimals: 9,  // Must be known
}

const COIN_Y = {
  type: USDC_COINTYPE,
  decimals: 6,  // Must be known
}
```

### Step 3: Calculate Bin Step and Active ID

```typescript
import { BinMath, isSortedSymbols } from '@ferra-labs/dlmm'

const binStep = 1  // 0.01% price difference between bins
let initialPrice = 3.9  // Your desired initial price

// Calculate initial bin ID from price
let activeId = BinMath.getIdFromPrice(
  initialPrice,
  binStep,
  COIN_X.decimals,
  COIN_Y.decimals
)
```

### Step 4: Check Token Symbol Ordering

```typescript
// Tokens must be in sorted order
let tokenXType = COIN_X.type
let tokenYType = COIN_Y.type
let tokenXDecimals = COIN_X.decimals
let tokenYDecimals = COIN_Y.decimals

if (isSortedSymbols(COIN_X.type, COIN_Y.type)) {
  // Tokens already in correct order
} else {
  // Swap tokens to correct order
  [tokenXType, tokenYType] = [COIN_Y.type, COIN_X.type]
  [tokenXDecimals, tokenYDecimals] = [COIN_Y.decimals, COIN_X.decimals]

  // Recalculate active ID with swapped tokens
  initialPrice = 1 / initialPrice
  activeId = BinMath.getIdFromPrice(
    initialPrice,
    binStep,
    tokenXDecimals,
    tokenYDecimals
  )
}
```

### Step 5: Create Pair Transaction

```typescript
const tx = await sdk.Factory.createLBPair({
  activeId: Number(activeId),
  binStep,
  tokenXType,
  tokenYType,
})
```

### Step 6: Dry-run Test

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
}
```

### Step 7: Execute Transaction

```typescript
if (!TEST) {
  const res = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })

  console.log('Transaction executed:', res)
  console.log('Pair created successfully!')

  // Extract pair address from transaction events/effects
  // The new pair address will be in the transaction results
}
```

## Complete Example

```typescript
async function createPair(
  tokenAType: string,
  tokenBType: string,
  tokenADecimals: number,
  tokenBDecimals: number,
  initialPrice: number,
  binStep: number = 1
) {
  // 1. Setup
  const keypair = Ed25519Keypair.fromSecretKey(/* your secret key */)
  const wallet = keypair.getPublicKey().toSuiAddress()
  const sdk = initFerraSDK({ network: 'testnet', wallet })

  // 2. Token configuration
  const COIN_X = { type: tokenAType, decimals: tokenADecimals }
  const COIN_Y = { type: tokenBType, decimals: tokenBDecimals }

  // 3. Calculate active ID
  let activeId = BinMath.getIdFromPrice(
    initialPrice,
    binStep,
    COIN_X.decimals,
    COIN_Y.decimals
  )

  // 4. Check ordering
  let tokenXType = COIN_X.type
  let tokenYType = COIN_Y.type

  if (isSortedSymbols(COIN_X.type, COIN_Y.type)) {
    // Already correct
  } else {
    [tokenXType, tokenYType] = [COIN_Y.type, COIN_X.type]
    initialPrice = 1 / initialPrice
    activeId = BinMath.getIdFromPrice(
      initialPrice,
      binStep,
      COIN_Y.decimals,
      COIN_X.decimals
    )
  }

  // 5. Create transaction
  const tx = await sdk.Factory.createLBPair({
    activeId: Number(activeId),
    binStep,
    tokenXType,
    tokenYType,
  })

  // 6. Dry-run test
  const dryRun = await sdk.fullClient.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client: sdk.fullClient }),
  })

  if (dryRun.effects?.status.status !== 'success') {
    throw new Error(`Dry-run failed: ${dryRun.effects?.status.error}`)
  }

  // 7. Execute
  const result = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })

  return result
}
```

## Checklist

- [ ] Wallet configured with sufficient gas
- [ ] Token addresses and decimals known
- [ ] Token ordering checked with `isSortedSymbols()`
- [ ] Active ID calculated correctly
- [ ] Dry-run test successful
- [ ] Gas fees acceptable
- [ ] Transaction executed (if not testing)

## Common Issues

1. **Token ordering**: Ensure tokens are in sorted order
2. **Decimal precision**: Use correct decimal places for calculations
3. **Gas estimation**: Always dry-run first to estimate gas
4. **Network selection**: Use testnet for development

## Related References

- [SDK Setup](../reference/SDK_SETUP.md)
- [Pair Operations](../reference/PAIR_OPERATIONS.md)
- [Test Examples](../reference/TEST_EXAMPLES.md)
- [Create Pair Test](../../packages/dlmm/tests/create-pair.ts)