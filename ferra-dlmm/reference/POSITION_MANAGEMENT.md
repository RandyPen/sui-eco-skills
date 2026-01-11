# Position Management

This reference covers opening, closing, and managing liquidity positions in DLMM pairs.

## Opening Positions

Create a new liquidity position:

```typescript
// Example from open-position.ts line 50
const tx = await sdk.Pair.openPosition(pair)
```

### Position Creation Flow

The typical flow for opening a position:

1. **Get the pair** you want to add liquidity to
2. **Create distribution parameters** for liquidity allocation
3. **Open a position** to get a position ID
4. **Add liquidity** to the position

```typescript
// Complete example from open-position.ts
const pair = await sdk.Pair.getPair(pairAddress)
if (!pair) throw new Error('Pair not found')

const currentPairId = pair.parameters.active_id

// Create distribution (same as for addLiquidity)
const distribution = DistributionUtils.createParams('BID_ASK', {
  activeId: currentPairId,
  binRange: [currentPairId - 100, currentPairId + 100],
  parsedAmounts: [
    Decimal(toDecimalsAmount(coinXAmount, 6)),
    Decimal(toDecimalsAmount(coinYAmount, 9)),
  ],
})

// Open position (gets position ID)
const openTx = await sdk.Pair.openPosition(pair)

// Execute to get position ID
const result = await sdk.fullClient.signAndExecuteTransaction({
  transaction: openTx,
  signer: keypair,
})

// Extract position ID from transaction events
// (Position ID is needed for adding liquidity)
```

## Position ID Management

Position IDs are required for adding, removing, and managing liquidity. They are created when you open a position and must be tracked for future operations.

### Getting Position IDs

After opening a position, you need to extract the position ID from transaction events:

```typescript
// Pattern for extracting position ID (check transaction events)
// The exact event structure may vary
const positionCreatedEvent = result.events?.find(
  e => e.type.includes('PositionCreated') || e.type.includes('PositionOpened')
)

let positionId: string | undefined

if (positionCreatedEvent) {
  // Extract position ID from event data
  positionId = positionCreatedEvent.parsedJson?.position_id
}

if (!positionId) {
  // Fallback: Position ID might be in transaction effects
  // Check created object IDs
  const createdObjects = result.effects?.created
  if (createdObjects && createdObjects.length > 0) {
    positionId = createdObjects[0].reference.objectId
  }
}
```

### Using Position IDs

Once you have a position ID, use it for liquidity operations:

```typescript
// Add liquidity to existing position
const tx = await sdk.Pair.addLiquidity(pair, {
  amountX: BigInt(toDecimalsAmount(coinXAmount, 6)),
  amountY: BigInt(toDecimalsAmount(coinYAmount, 9)),
  ...distribution,
  positionId: "0x..."  // Use the position ID from openPosition
})
```

## Managing Existing Positions

### Querying Positions

The SDK may provide ways to query existing positions for a wallet/pair:

```typescript
// Check PositionModule methods for querying positions
// Example pattern (check actual SDK methods):
const positions = await sdk.Position.getPositions({
  owner: walletAddress,
  pair: pairAddress
})
```

### Position Information

A position typically contains:
- **Position ID**: Unique identifier
- **Owner**: Wallet address that owns the position
- **Pair**: The trading pair address
- **Liquidity amounts**: Amounts of X and Y tokens
- **Bin ranges**: Which bins the liquidity is in
- **Fees accrued**: Unclaimed fee amounts

## Closing Positions

Remove all liquidity and close a position:

```typescript
// Check remove-liquidity.ts test for exact method
// Pattern:
const closeTx = await sdk.Pair.closePosition(pair, {
  positionId: "0x..."
})

// Or remove all liquidity first, then close
const removeTx = await sdk.Pair.removeLiquidity(pair, {
  positionId: "0x...",
  // ... removal parameters
})
```

## Claiming Fees and Rewards

Positions accrue fees from swaps. Claim these fees:

```typescript
// Check claim-fee.ts and claim-rewards.ts tests
// Pattern:
const claimTx = await sdk.Pair.claimFees(pair, {
  positionId: "0x...",
  // ... claim parameters
})

// Or claim rewards
const rewardsTx = await sdk.Pair.claimRewards(pair, {
  positionId: "0x...",
  // ... claim parameters
})
```

## Distribution Verification

When creating distributions, verify they don't exceed limits:

```typescript
// Example from open-position.ts lines 80-90
const MAX_DIS = BigInt(toDecimalsAmount(1, 9))

function verifyDistribution(distribution: DistributionUtils.LiquidityDistributionParams) {
  const disX = distribution.distributionX.reduce((p, v) => (p += v, p), 0n)
  const disY = distribution.distributionY.reduce((p, v) => (p += v, p), 0n)

  if (disX > MAX_DIS || disY > MAX_DIS) {
    console.log('Distribution exceeds limits:', disX, disY)
    throw new Error("Distribution exceeds maximum allowed")
  }
}

// Use before opening position or adding liquidity
verifyDistribution(distribution)
```

## Complete Position Management Example

```typescript
async function createAndFundPosition(
  pairAddress: string,
  amountX: number,
  amountY: number,
  decimalsX: number,
  decimalsY: number
) {
  // 1. Get pair
  const pair = await sdk.Pair.getPair(pairAddress)
  if (!pair) throw new Error('Pair not found')

  // 2. Create distribution
  const currentPairId = pair.parameters.active_id
  const distribution = DistributionUtils.createParams('BID_ASK', {
    activeId: currentPairId,
    binRange: [currentPairId - 100, currentPairId + 100],
    parsedAmounts: [
      Decimal(toDecimalsAmount(amountX, decimalsX)),
      Decimal(toDecimalsAmount(amountY, decimalsY)),
    ],
  })

  // 3. Verify distribution
  verifyDistribution(distribution)

  // 4. Open position
  const openTx = await sdk.Pair.openPosition(pair)
  const openResult = await sdk.fullClient.signAndExecuteTransaction({
    transaction: openTx,
    signer: keypair,
  })

  // 5. Extract position ID (simplified - actual extraction may vary)
  const positionId = extractPositionId(openResult)

  if (!positionId) {
    throw new Error('Failed to get position ID from transaction')
  }

  // 6. Add liquidity to position
  const addTx = await sdk.Pair.addLiquidity(pair, {
    amountX: BigInt(toDecimalsAmount(amountX, decimalsX)),
    amountY: BigInt(toDecimalsAmount(amountY, decimalsY)),
    ...distribution,
    positionId
  })

  // 7. Execute add liquidity
  const addResult = await sdk.fullClient.signAndExecuteTransaction({
    transaction: addTx,
    signer: keypair,
  })

  return {
    positionId,
    openResult,
    addResult,
    distribution
  }
}

function extractPositionId(transactionResult: any): string | undefined {
  // Implementation depends on transaction event structure
  // Check events, created objects, etc.
  return undefined
}
```

## Testing Patterns

### Dry-run Testing

Always test with dry-run first:

```typescript
const TEST = true

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
  // Actual execution
  const res = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })
}
```

## Important Notes

1. **Position IDs are critical**: Save position IDs for future operations
2. **Distribution limits**: Verify distributions don't exceed protocol limits
3. **Gas estimation**: Always dry-run to estimate gas costs
4. **Event parsing**: Position IDs come from transaction events - parse carefully
5. **Fee claiming**: Regularly claim fees from active positions

## Related Operations

- **Adding liquidity**: [Pair Operations](./PAIR_OPERATIONS.md#adding-liquidity)
- **Removing liquidity**: Check `remove-liquidity.ts` test
- **Claiming fees**: Check `claim-fee.ts` and `claim-rewards.ts` tests
- **Distribution strategies**: [Pair Operations](./PAIR_OPERATIONS.md#distribution-strategies)

## Next Steps

- [Test Examples](./TEST_EXAMPLES.md) for complete position management examples
- [Pair Operations](./PAIR_OPERATIONS.md) for more liquidity management details
- [SDK Setup](./SDK_SETUP.md) for wallet and SDK configuration