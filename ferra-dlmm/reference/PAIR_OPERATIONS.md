# Pair Operations and Liquidity Management

This reference covers operations related to DLMM pairs, including creating pairs, managing liquidity, and getting current price information.

## Creating Pairs

Use the Factory module to create new trading pairs:

```typescript
// Example from create-pair.ts lines 46-51
const tx = await sdk.Factory.createLBPair({
  activeId: Number(activeId),
  binStep: 1,  // 1 = 0.01% price difference between bins
  tokenXType: USDC_COINTYPE,
  tokenYType: SUI_COINTYPE,
})
```

### Required Parameters

- `activeId`: Initial active bin ID (use `BinMath.getIdFromPrice()` to calculate)
- `binStep`: Percentage difference between adjacent bins (e.g., 1 = 0.01%)
- `tokenXType`: Coin type of token X (must be sorted correctly)
- `tokenYType`: Coin type of token Y

### Token Ordering

Tokens must be sorted by their struct addresses:

```typescript
import { isSortedSymbols } from '@ferra-labs/dlmm'

const tokenXType = '0x...usdc::USDC'
const tokenYType = '0x...sui::SUI'

if (isSortedSymbols(tokenXType, tokenYType)) {
  // Tokens are already in correct order
} else {
  // Swap token order
  [tokenXType, tokenYType] = [tokenYType, tokenXType]
}
```

## Getting Pair Information

Fetch existing pair data by its address:

```typescript
// Example from add-liquidity.ts lines 24-26
const pair = await sdk.Pair.getPair(
  '0xb64263f776b3e84a21c6c5ad376fd911773c97ecf5ecc004dcfd3ff94b1c54b4'
)

if (!pair) {
  throw new Error('Pair not found')
}
```

### Pair Data Structure

The returned `pair` object includes:

```typescript
{
  address: string,           // Pair address
  binStep: string,          // Bin step as string
  tokenX: string,           // Token X coin type
  tokenY: string,           // Token Y coin type
  parameters: {
    active_id: number,      // Current active bin ID
    // ... other parameters
  },
  reserves: {
    reserveX: string,       // Token X reserves
    reserveY: string,       // Token Y reserves
    // ... other reserves
  }
}
```

## Adding Liquidity

Add liquidity to an existing pair:

```typescript
// Example from add-liquidity.ts lines 49-54
const tx = await sdk.Pair.addLiquidity(pair, {
  amountX: BigInt(toDecimalsAmount(coinXAmount, 6)),
  amountY: BigInt(toDecimalsAmount(coinYAmount, 9)),
  ...distribution,  // Distribution strategy
  positionId: "0x..."  // Existing position ID or new position
})
```

### Distribution Strategies

Create distribution parameters for liquidity allocation:

```typescript
import { DistributionUtils } from '@ferra-labs/dlmm'
import Decimal from 'decimal.js'

// BID_ASK strategy (common for market making)
const distribution = DistributionUtils.createParams('BID_ASK', {
  activeId: currentPairId,
  binRange: [currentPairId - 500, currentPairId + 500],  // ±500 bins
  parsedAmounts: [
    Decimal(toDecimalsAmount(coinXAmount, 6)),
    Decimal(toDecimalsAmount(coinYAmount, 9)),
  ],
})
```

## Getting Active Bin Price and Token Information

### 1. Get Active Bin ID

```typescript
// Example from add-liquidity.ts line 32
const pair = await sdk.Pair.getPair(pairAddress)
const activeId = pair.parameters.active_id
console.log(`Current active bin ID: ${activeId}`)
```

### 2. Calculate Current Price

```typescript
import { BinMath } from '@ferra-labs/dlmm'

// Example from swap.ts line 71 (adapted)
// Note: Token decimals MUST be known/provided
const tokenXDecimals = 6  // e.g., USDC
const tokenYDecimals = 9  // e.g., SUI

const price = BinMath.getPriceFromId(
  activeId,
  Number(pair.binStep),
  tokenXDecimals,
  tokenYDecimals
)

console.log(`Current price: 1 tokenX = ${price} tokenY`)
```

### 3. Get Token Symbols (Optional)

```typescript
import { CoinAssist } from '@ferra-labs/dlmm'

const tokenXSymbol = CoinAssist.getCoinSymbol(tokenXType)  // "USDC"
const tokenYSymbol = CoinAssist.getCoinSymbol(tokenYType)  // "SUI"
```

### Complete Example: Getting Active Bin Info

```typescript
async function getActiveBinInfo(pairAddress: string) {
  const pair = await sdk.Pair.getPair(pairAddress)
  const activeId = pair.parameters.active_id

  // These must be known/provided (SDK doesn't fetch token metadata)
  const tokenXDecimals = 6  // Example: USDC
  const tokenYDecimals = 9  // Example: SUI
  const tokenXType = pair.tokenX
  const tokenYType = pair.tokenY

  const price = BinMath.getPriceFromId(
    activeId,
    Number(pair.binStep),
    tokenXDecimals,
    tokenYDecimals
  )

  const tokenXSymbol = CoinAssist.getCoinSymbol(tokenXType)
  const tokenYSymbol = CoinAssist.getCoinSymbol(tokenYType)

  return {
    activeId,
    price,
    tokenXSymbol,
    tokenYSymbol,
    tokenXDecimals,
    tokenYDecimals,
    binStep: pair.binStep,
    reserves: pair.reserves
  }
}
```

## Important Notes

### Token Decimals Management

**Critical**: The SDK does NOT fetch token decimals/metadata from the chain. You must:

1. **Know the decimals externally** (e.g., USDC=6, SUI=9)
2. **Provide them as parameters** to functions like `BinMath.getPriceFromId()`
3. **Use `toDecimalsAmount()` and `fromDecimalsAmount()`** for amount conversions

```typescript
import { toDecimalsAmount, fromDecimalsAmount } from '@ferra-labs/dlmm'

// Convert human-readable amount to on-chain amount
const onChainAmount = toDecimalsAmount(100, 6)  // 100 USDC → 100000000

// Convert on-chain amount back to human-readable
const humanAmount = fromDecimalsAmount(100000000, 6)  // 100000000 → 100 USDC
```

### Distribution Strategy Types

Common distribution strategies:

- **BID_ASK**: Market making around current price
- **SPOT**: Single price point
- **CURVE**: Custom distribution curve
- **CUSTOM**: User-defined distribution

## Removing Liquidity

Remove liquidity from a position:

```typescript
// Example pattern (check remove-liquidity.ts test)
const tx = await sdk.Pair.removeLiquidity(pair, {
  positionId: "0x...",
  // ... other parameters
})
```

## Common Patterns from Test Files

### From `add-liquidity.ts`:
- Getting pair by address (line 24-26)
- Extracting active ID (line 32)
- Creating distribution with BID_ASK strategy (lines 40-47)
- Adding liquidity with position ID (lines 49-54)

### From `create-pair.ts`:
- Wallet setup with private key/secret/mnemonic (lines 20-30)
- Calculating active ID from price (lines 39-43)
- Creating pair transaction (lines 46-51)
- Dry-run testing (lines 55-61)

## Next Steps

- [Swap Operations](./SWAP_OPERATIONS.md) for token swapping
- [Position Management](./POSITION_MANAGEMENT.md) for position handling
- [Get Active Bin Info Workflow](../workflows/GET_ACTIVE_BIN_INFO_WORKFLOW.md) for step-by-step guidance