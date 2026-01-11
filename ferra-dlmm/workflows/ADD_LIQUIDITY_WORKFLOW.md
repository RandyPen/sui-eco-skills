# Workflow: Adding Liquidity to a Pair

This workflow guides you through adding liquidity to an existing DLMM pair.

## Prerequisites

- Existing pair address
- Wallet with both tokens to add as liquidity
- Token decimals (must be known externally)
- Position ID (if adding to existing position, otherwise will create new)

## Steps

### Step 1: Get Existing Pair by Address

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
```

### Step 2: Get Current Active ID

```typescript
// Extract current active bin ID
const activeId = pair.parameters.active_id
console.log(`Current active bin ID: ${activeId}`)
```

### Step 3: Set Amount and Slippage Parameters

```typescript
import { toDecimalsAmount } from '@ferra-labs/dlmm'

// Amounts in human-readable format
const coinXAmount = 250.00  // Example: 250 USDC
const coinYAmount = 450     // Example: 450 SUI
const slippage = 0.5        // 0.5% slippage tolerance

// Convert to on-chain amounts (requires knowing decimals)
const tokenXDecimals = 6  // USDC decimals
const tokenYDecimals = 9  // SUI decimals

const amountX = BigInt(toDecimalsAmount(coinXAmount, tokenXDecimals))
const amountY = BigInt(toDecimalsAmount(coinYAmount, tokenYDecimals))
```

### Step 4: Create Distribution Strategy

```typescript
import { DistributionUtils } from '@ferra-labs/dlmm'
import Decimal from 'decimal.js'

// Choose distribution strategy
const strategy = 'BID_ASK'  // Common for market making

// Define bin range around current price
const binRange = [activeId - 500, activeId + 500]  // ±500 bins

const distribution = DistributionUtils.createParams(strategy, {
  activeId,
  binRange,
  parsedAmounts: [
    Decimal(toDecimalsAmount(coinXAmount, tokenXDecimals)),
    Decimal(toDecimalsAmount(coinYAmount, tokenYDecimals)),
  ],
})

// Optional: Verify distribution doesn't exceed limits
const MAX_DIS = BigInt(toDecimalsAmount(1, 9))
const disX = distribution.distributionX.reduce((p, v) => (p += v, p), 0n)
const disY = distribution.distributionY.reduce((p, v) => (p += v, p), 0n)

if (disX > MAX_DIS || disY > MAX_DIS) {
  throw new Error('Distribution exceeds maximum allowed')
}
```

### Step 5: Prepare Add Liquidity Transaction

```typescript
// Position ID (if adding to existing position)
const positionId = "0x..." // Optional: omit to create new position

const tx = await sdk.Pair.addLiquidity(pair, {
  amountX,
  amountY,
  ...distribution,
  positionId,  // Optional: include if adding to existing position
})
```

### Step 6: Test with Dry-run

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

  // Check position creation (if new position)
  if (!positionId) {
    console.log('New position will be created')
    // Position ID will be in transaction events
  }
}
```

### Step 7: Execute Transaction

```typescript
if (!TEST) {
  const res = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })

  console.log('Transaction executed:', res.digest)

  // Extract position ID if new position was created
  if (!positionId) {
    const positionCreatedEvent = res.events?.find(
      e => e.type.includes('PositionCreated') || e.type.includes('PositionOpened')
    )

    if (positionCreatedEvent) {
      const newPositionId = positionCreatedEvent.parsedJson?.position_id
      console.log('New position ID:', newPositionId)
      // Save this ID for future operations
    }
  }
}
```

## Complete Example

```typescript
async function addLiquidity(
  pairAddress: string,
  amountXHuman: number,
  amountYHuman: number,
  tokenXDecimals: number,
  tokenYDecimals: number,
  positionId?: string
) {
  // 1. Setup
  const keypair = Ed25519Keypair.fromSecretKey(/* your secret key */)
  const wallet = keypair.getPublicKey().toSuiAddress()
  const sdk = initFerraSDK({ network: 'testnet', wallet })

  // 2. Get pair
  const pair = await sdk.Pair.getPair(pairAddress)
  if (!pair) throw new Error('Pair not found')

  // 3. Get active ID
  const activeId = pair.parameters.active_id

  // 4. Convert amounts
  const amountX = BigInt(toDecimalsAmount(amountXHuman, tokenXDecimals))
  const amountY = BigInt(toDecimalsAmount(amountYHuman, tokenYDecimals))

  // 5. Create distribution
  const distribution = DistributionUtils.createParams('BID_ASK', {
    activeId,
    binRange: [activeId - 500, activeId + 500],
    parsedAmounts: [
      Decimal(toDecimalsAmount(amountXHuman, tokenXDecimals)),
      Decimal(toDecimalsAmount(amountYHuman, tokenYDecimals)),
    ],
  })

  // 6. Prepare transaction
  const txParams: any = {
    amountX,
    amountY,
    ...distribution,
  }

  if (positionId) {
    txParams.positionId = positionId
  }

  const tx = await sdk.Pair.addLiquidity(pair, txParams)

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

  // 9. Extract new position ID if created
  let newPositionId = positionId
  if (!positionId) {
    const event = result.events?.find(e => e.type.includes('PositionCreated'))
    newPositionId = event?.parsedJson?.position_id
  }

  return {
    result,
    positionId: newPositionId,
    gasUsed: dryRun.effects?.gasUsed
  }
}
```

## Distribution Strategies

Choose based on your market making strategy:

- **BID_ASK**: Distribute liquidity around current price (market making)
- **SPOT**: Concentrate liquidity at single price point
- **CURVE**: Custom distribution curve
- **CUSTOM**: User-defined distribution

## Position Management

### Adding to Existing Position
- Provide `positionId` parameter
- Liquidity will be added to the existing position

### Creating New Position
- Omit `positionId` parameter
- New position will be created
- Save the returned position ID for future operations

## Checklist

- [ ] Pair address is correct and pair exists
- [ ] Wallet has sufficient tokens for liquidity
- [ ] Token decimals are known and correct
- [ ] Active ID extracted from pair
- [ ] Distribution strategy chosen appropriately
- [ ] Bin range set based on strategy
- [ ] Dry-run test successful
- [ ] Gas fees acceptable
- [ ] Position ID saved (if new position created)

## Common Issues

1. **Insufficient tokens**: Check wallet balances before adding liquidity
2. **Wrong decimals**: Ensure correct decimal places for token conversions
3. **Invalid bin range**: Range should be around current active ID
4. **Position not found**: Verify position ID is correct when adding to existing position

## Related References

- [Pair Operations](../reference/PAIR_OPERATIONS.md)
- [Position Management](../reference/POSITION_MANAGEMENT.md)
- [Test Examples](../reference/TEST_EXAMPLES.md)
- [Add Liquidity Test](../../packages/dlmm/tests/add-liquidity.ts)