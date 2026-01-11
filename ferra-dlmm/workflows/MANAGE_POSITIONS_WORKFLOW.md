# Workflow: Managing Positions

This workflow guides you through managing liquidity positions in DLMM pairs, including opening, querying, modifying, and closing positions.

## Prerequisites

- Existing pair address (for position operations)
- Wallet with position ownership (for modifications)
- Position ID (for existing position operations)

## Steps

### Step 1: Open New Position

```typescript
import { initFerraSDK } from '@ferra-labs/dlmm'

// Initialize SDK
const sdk = initFerraSDK({ network: 'testnet', wallet })

// Get pair
const pairAddress = '0x...'
const pair = await sdk.Pair.getPair(pairAddress)
if (!pair) throw new Error('Pair not found')

// Open position (creates empty position)
const tx = await sdk.Pair.openPosition(pair)

// Dry-run test first
const TEST = true
if (TEST) {
  const res = await sdk.fullClient.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client: sdk.fullClient }),
  })

  if (res.effects?.status.status !== 'success') {
    throw new Error(`Dry-run failed: ${res.effects?.status.error}`)
  }
}

// Execute to create position
const result = await sdk.fullClient.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
})

// Extract position ID from transaction
let positionId: string | undefined

// Method 1: Check created objects
const createdObjects = result.effects?.created
if (createdObjects && createdObjects.length > 0) {
  positionId = createdObjects[0].reference.objectId
}

// Method 2: Check events
if (!positionId) {
  const positionEvent = result.events?.find(
    e => e.type.includes('PositionCreated') || e.type.includes('PositionOpened')
  )
  if (positionEvent) {
    positionId = positionEvent.parsedJson?.position_id
  }
}

console.log('New position ID:', positionId)
```

### Step 2: Query Existing Positions

Currently, the SDK may not have direct position query methods. You need to:

1. **Track position IDs manually**: Save position IDs when you create them
2. **Use indexer/explorer**: Check Sui explorer for positions by wallet address
3. **Monitor events**: Parse transaction events for position operations

```typescript
// Manual tracking example
const myPositions = {
  'pairAddress1': ['positionId1', 'positionId2'],
  'pairAddress2': ['positionId3']
}

// Check if position exists by trying to add liquidity
async function checkPositionExists(pairAddress: string, positionId: string) {
  try {
    const pair = await sdk.Pair.getPair(pairAddress)
    if (!pair) return false

    // Try to prepare add liquidity (dry-run)
    const tx = await sdk.Pair.addLiquidity(pair, {
      amountX: 0n,
      amountY: 0n,
      // ... other required params
      positionId
    })

    const dryRun = await sdk.fullClient.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: sdk.fullClient }),
    })

    // If no "position not found" error, position exists
    return dryRun.effects?.status.status === 'success'
  } catch (error) {
    console.error('Error checking position:', error)
    return false
  }
}
```

### Step 3: Modify Position Parameters

Modify existing positions by:
1. **Adding more liquidity** (see Add Liquidity workflow)
2. **Removing some liquidity** (partial removal)
3. **Changing distribution** (close and recreate with new parameters)

```typescript
// Adding more liquidity to existing position
async function addToPosition(
  pairAddress: string,
  positionId: string,
  amountXHuman: number,
  amountYHuman: number,
  tokenXDecimals: number,
  tokenYDecimals: number
) {
  const pair = await sdk.Pair.getPair(pairAddress)
  if (!pair) throw new Error('Pair not found')

  const activeId = pair.parameters.active_id

  // Create distribution (same strategy as before or new)
  const distribution = DistributionUtils.createParams('BID_ASK', {
    activeId,
    binRange: [activeId - 500, activeId + 500],
    parsedAmounts: [
      Decimal(toDecimalsAmount(amountXHuman, tokenXDecimals)),
      Decimal(toDecimalsAmount(amountYHuman, tokenYDecimals)),
    ],
  })

  const tx = await sdk.Pair.addLiquidity(pair, {
    amountX: BigInt(toDecimalsAmount(amountXHuman, tokenXDecimals)),
    amountY: BigInt(toDecimalsAmount(amountYHuman, tokenYDecimals)),
    ...distribution,
    positionId  // Existing position ID
  })

  // Execute transaction...
}
```

### Step 4: Close Positions

Close a position by removing all liquidity:

```typescript
// Check remove-liquidity.ts test for exact method
// Pattern for removing all liquidity:
async function closePosition(
  pairAddress: string,
  positionId: string
) {
  const pair = await sdk.Pair.getPair(pairAddress)
  if (!pair) throw new Error('Pair not found')

  // Method 1: Remove all liquidity then close (if separate methods)
  // Method 2: Direct close position method (check SDK)

  // Example pattern (check actual SDK methods):
  const tx = await sdk.Pair.removeLiquidity(pair, {
    positionId,
    // ... removal parameters (may need to specify amounts)
  })

  // Or if there's a closePosition method:
  // const tx = await sdk.Pair.closePosition(pair, { positionId })

  // Dry-run test
  const dryRun = await sdk.fullClient.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client: sdk.fullClient }),
  })

  if (dryRun.effects?.status.status !== 'success') {
    throw new Error(`Dry-run failed: ${dryRun.effects?.status.error}`)
  }

  // Execute
  const result = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })

  console.log('Position closed:', result.digest)
  return result
}
```

### Step 5: Claim Fees and Rewards

Claim accumulated fees from positions:

```typescript
// Check claim-fee.ts and claim-rewards.ts tests
async function claimPositionFees(
  pairAddress: string,
  positionId: string
) {
  const pair = await sdk.Pair.getPair(pairAddress)
  if (!pair) throw new Error('Pair not found')

  // Pattern from test files (check exact method name):
  const tx = await sdk.Pair.claimFees(pair, {
    positionId,
    // ... other parameters if needed
  })

  // Or for rewards:
  // const tx = await sdk.Pair.claimRewards(pair, { positionId })

  // Dry-run test
  const dryRun = await sdk.fullClient.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client: sdk.fullClient }),
  })

  if (dryRun.effects?.status.status !== 'success') {
    throw new Error(`Dry-run failed: ${dryRun.effects?.status.error}`)
  }

  // Check fee amounts in dry-run events
  const feeEvent = dryRun.events?.find(e => e.type.includes('FeeClaimed'))
  if (feeEvent) {
    console.log('Claimable fees:', feeEvent.parsedJson)
  }

  // Execute
  const result = await sdk.fullClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  })

  console.log('Fees claimed:', result.digest)
  return result
}
```

## Complete Position Management Example

```typescript
class PositionManager {
  private positions: Map<string, string[]> = new Map() // pairAddress → positionIds

  async createPosition(pairAddress: string) {
    const pair = await sdk.Pair.getPair(pairAddress)
    if (!pair) throw new Error('Pair not found')

    const tx = await sdk.Pair.openPosition(pair)
    const result = await this.executeTransaction(tx)

    const positionId = this.extractPositionId(result)
    if (!positionId) throw new Error('Failed to get position ID')

    // Track position
    const existing = this.positions.get(pairAddress) || []
    this.positions.set(pairAddress, [...existing, positionId])

    return positionId
  }

  async addLiquidityToPosition(
    pairAddress: string,
    positionId: string,
    amounts: { x: number; y: number },
    decimals: { x: number; y: number }
  ) {
    const pair = await sdk.Pair.getPair(pairAddress)
    if (!pair) throw new Error('Pair not found')

    const activeId = pair.parameters.active_id
    const distribution = DistributionUtils.createParams('BID_ASK', {
      activeId,
      binRange: [activeId - 500, activeId + 500],
      parsedAmounts: [
        Decimal(toDecimalsAmount(amounts.x, decimals.x)),
        Decimal(toDecimalsAmount(amounts.y, decimals.y)),
      ],
    })

    const tx = await sdk.Pair.addLiquidity(pair, {
      amountX: BigInt(toDecimalsAmount(amounts.x, decimals.x)),
      amountY: BigInt(toDecimalsAmount(amounts.y, decimals.y)),
      ...distribution,
      positionId
    })

    return this.executeTransaction(tx)
  }

  async claimAllFees() {
    const results = []

    for (const [pairAddress, positionIds] of this.positions) {
      for (const positionId of positionIds) {
        try {
          const result = await this.claimPositionFees(pairAddress, positionId)
          results.push({ pairAddress, positionId, result })
        } catch (error) {
          console.error(`Failed to claim fees for ${positionId}:`, error)
        }
      }
    }

    return results
  }

  private async executeTransaction(tx: any) {
    // Dry-run test
    const dryRun = await sdk.fullClient.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: sdk.fullClient }),
    })

    if (dryRun.effects?.status.status !== 'success') {
      throw new Error(`Dry-run failed: ${dryRun.effects?.status.error}`)
    }

    // Execute
    return await sdk.fullClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
    })
  }

  private extractPositionId(result: any): string | undefined {
    // Implementation depends on transaction structure
    // Check events and created objects
    return undefined
  }
}
```

## Position Tracking Best Practices

1. **Save position IDs immediately** after creation
2. **Record pair address** with each position
3. **Monitor transaction events** for position state changes
4. **Regularly claim fees** to maximize returns
5. **Backup position data** externally

## Checklist

- [ ] Position ID saved after creation
- [ ] Pair address recorded with position
- [ ] Regular fee claiming scheduled
- [ ] Position state monitored
- [ ] Backup of position data maintained

## Common Issues

1. **Lost position ID**: Without position ID, you cannot manage the position
2. **Insufficient liquidity**: Check position liquidity before removing/claiming
3. **Wrong owner**: Ensure wallet owns the position
4. **Network fees**: Consider gas costs for frequent position management

## Related References

- [Position Management](../reference/POSITION_MANAGEMENT.md)
- [Add Liquidity Workflow](./ADD_LIQUIDITY_WORKFLOW.md)
- [Test Examples](../reference/TEST_EXAMPLES.md)
- [Open Position Test](../../packages/dlmm/tests/open-position.ts)
- [Claim Fee Test](../../packages/dlmm/tests/claim-fee.ts)
- [Claim Rewards Test](../../packages/dlmm/tests/claim-rewards.ts)