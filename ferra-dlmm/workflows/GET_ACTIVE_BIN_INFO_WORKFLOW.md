# Workflow: Getting Active Bin Information

This workflow guides you through getting current active bin price and token information for a DLMM pair. This addresses the specific user requirement: "怎么获取dlmm当前 active bin 的价格和代币信息".

## Prerequisites

- Existing pair address
- Token decimals (must be known externally - SDK does not fetch from chain)
- Token coin types (for symbol extraction)

## Important Note

**The SDK does NOT fetch token metadata (decimals, symbols) from the chain.** You must provide:
- Token decimals (e.g., USDC=6, SUI=9)
- Token coin types (for symbol extraction via `CoinAssist.getCoinSymbol()`)

## Steps

### Step 1: Get Pair by Address

```typescript
import { initFerraSDK } from '@ferra-labs/dlmm'

// Initialize SDK
const sdk = initFerraSDK({ network: 'testnet', wallet: '0x...' })

// Get pair
const pairAddress = '0x...' // Your pair address
const pair = await sdk.Pair.getPair(pairAddress)

if (!pair) {
  throw new Error('Pair not found')
}
```

### Step 2: Extract Active ID

```typescript
// Get current active bin ID
const activeId = pair.parameters.active_id
console.log(`Current active bin ID: ${activeId}`)

// Additional pair information
console.log('Pair details:', {
  binStep: pair.binStep,
  tokenX: pair.tokenX,
  tokenY: pair.tokenY,
  reservesX: pair.reserves.reserveX,
  reservesY: pair.reserves.reserveY
})
```

### Step 3: Provide Token Decimals (Must Be Known Externally)

```typescript
// EXAMPLE VALUES - YOU MUST PROVIDE CORRECT VALUES FOR YOUR TOKENS

// Example: USDC/SUI pair
const tokenXDecimals = 6    // USDC has 6 decimals
const tokenYDecimals = 9    // SUI has 9 decimals

// Example token types (from the pair or known externally)
const tokenXType = pair.tokenX  // Or provide directly
const tokenYType = pair.tokenY  // Or provide directly

console.log('Token information (must be provided):', {
  tokenXDecimals,
  tokenYDecimals,
  tokenXType,
  tokenYType
})
```

### Step 4: Calculate Current Price

```typescript
import { BinMath } from '@ferra-labs/dlmm'

// Calculate price from active bin ID
const price = BinMath.getPriceFromId(
  activeId,
  Number(pair.binStep),
  tokenXDecimals,
  tokenYDecimals
)

console.log(`Current price: 1 tokenX = ${price} tokenY`)
console.log(`Inverse price: 1 tokenY = ${1 / price} tokenX`)
```

### Step 5: Get Token Symbols (Optional)

```typescript
import { CoinAssist } from '@ferra-labs/dlmm'

// Extract token symbols from coin types
const tokenXSymbol = CoinAssist.getCoinSymbol(tokenXType)  // e.g., "USDC"
const tokenYSymbol = CoinAssist.getCoinSymbol(tokenYType)  // e.g., "SUI"

console.log(`Token symbols: ${tokenXSymbol}/${tokenYSymbol}`)
console.log(`Formatted price: 1 ${tokenXSymbol} = ${price.toFixed(6)} ${tokenYSymbol}`)
```

### Step 6: Complete Information Extraction

Combine all information into a comprehensive view:

```typescript
async function getActiveBinInfo(pairAddress: string) {
  // 1. Get pair
  const pair = await sdk.Pair.getPair(pairAddress)
  if (!pair) throw new Error('Pair not found')

  // 2. Extract active ID
  const activeId = pair.parameters.active_id

  // 3. PROVIDE TOKEN DECIMALS (required - SDK doesn't fetch these)
  const tokenXDecimals = 6  // EXAMPLE: USDC decimals
  const tokenYDecimals = 9  // EXAMPLE: SUI decimals

  // 4. Calculate price
  const price = BinMath.getPriceFromId(
    activeId,
    Number(pair.binStep),
    tokenXDecimals,
    tokenYDecimals
  )

  // 5. Get symbols (optional)
  const tokenXSymbol = CoinAssist.getCoinSymbol(pair.tokenX)
  const tokenYSymbol = CoinAssist.getCoinSymbol(pair.tokenY)

  return {
    activeId,
    price,
    formattedPrice: `1 ${tokenXSymbol} = ${price} ${tokenYSymbol}`,
    inversePrice: 1 / price,
    tokenInfo: {
      tokenX: {
        type: pair.tokenX,
        symbol: tokenXSymbol,
        decimals: tokenXDecimals,
        reserves: pair.reserves.reserveX
      },
      tokenY: {
        type: pair.tokenY,
        symbol: tokenYSymbol,
        decimals: tokenYDecimals,
        reserves: pair.reserves.reserveY
      }
    },
    pairInfo: {
      address: pair.address,
      binStep: pair.binStep,
      binStepPercentage: Number(pair.binStep) / 100, // 1 = 0.01%
      activeId,
      // Price in terms of bin math
      pricePerBin: (1 + Number(pair.binStep) / 10000) ** (activeId - 8388608)
    }
  }
}

// Usage
const info = await getActiveBinInfo('0x...your_pair_address...')
console.log('Active bin information:', JSON.stringify(info, null, 2))
```

## Optional: Get Bin Data for Analysis

After getting active bin information, you may want to analyze liquidity in surrounding bins:

```typescript
// Get bins around the active bin for liquidity analysis
const binRange: [number, number] = [activeId - 10, activeId + 10]
const bins = await sdk.Pair.getPairBins(pair, binRange)

console.log(`Liquidity in ${bins.length} bins around active bin (ID: ${activeId}):`)
bins.forEach((bin, index) => {
  const binId = binRange[0] + index
  console.log(`  Bin ${binId}: X=${bin.reserve_x}, Y=${bin.reserve_y}`)
})

// Calculate total liquidity in the range
const totalReserveX = bins.reduce((sum, bin) => sum + BigInt(bin.reserve_x), 0n)
const totalReserveY = bins.reduce((sum, bin) => sum + BigInt(bin.reserve_y), 0n)
console.log(`Total in range: X=${totalReserveX}, Y=${totalReserveY}`)
```

For complete bin metadata (prices, fees, total supply), use the API method:

```typescript
// Get complete bin data via API (may be cached)
const allBinData = await sdk.Pair.getPairBinsData(pair.address)
const binsAroundActive = allBinData.filter(bin =>
  Math.abs(Number(bin.bin_id) - activeId) <= 10
)

console.log(`Found ${binsAroundActive.length} bins with complete metadata:`)
binsAroundActive.forEach(bin => {
  console.log(`  Bin ${bin.bin_id}: Price=${bin.price}, Supply=${bin.total_supply}`)
})
```

## Complete Example with Error Handling

```typescript
import { BinMath, CoinAssist, initFerraSDK } from '@ferra-labs/dlmm'

interface TokenInfo {
  type: string
  symbol: string
  decimals: number
  reserves: string
}

interface ActiveBinInfo {
  activeId: number
  price: number
  formattedPrice: string
  inversePrice: number
  tokenX: TokenInfo
  tokenY: TokenInfo
  pairAddress: string
  binStep: string
  binStepPercentage: number
}

class ActiveBinFetcher {
  private sdk: any
  private tokenDecimalsCache: Map<string, number> = new Map()

  constructor(network: 'mainnet' | 'testnet' | 'beta', wallet: string) {
    this.sdk = initFerraSDK({ network, wallet })
  }

  // Set token decimals (must be called before fetching)
  setTokenDecimals(tokenType: string, decimals: number) {
    this.tokenDecimalsCache.set(tokenType, decimals)
  }

  async getActiveBinInfo(pairAddress: string): Promise<ActiveBinInfo> {
    try {
      // 1. Get pair
      const pair = await this.sdk.Pair.getPair(pairAddress)
      if (!pair) throw new Error(`Pair not found at ${pairAddress}`)

      // 2. Get active ID
      const activeId = pair.parameters.active_id

      // 3. Get token decimals (must be set via setTokenDecimals)
      const tokenXDecimals = this.tokenDecimalsCache.get(pair.tokenX)
      const tokenYDecimals = this.tokenDecimalsCache.get(pair.tokenY)

      if (tokenXDecimals === undefined || tokenYDecimals === undefined) {
        throw new Error(
          `Token decimals not set. Call setTokenDecimals() for:\n` +
          `- ${pair.tokenX}\n` +
          `- ${pair.tokenY}`
        )
      }

      // 4. Calculate price
      const price = BinMath.getPriceFromId(
        activeId,
        Number(pair.binStep),
        tokenXDecimals,
        tokenYDecimals
      )

      // 5. Get symbols
      const tokenXSymbol = CoinAssist.getCoinSymbol(pair.tokenX)
      const tokenYSymbol = CoinAssist.getCoinSymbol(pair.tokenY)

      return {
        activeId,
        price,
        formattedPrice: `1 ${tokenXSymbol} = ${price.toFixed(6)} ${tokenYSymbol}`,
        inversePrice: 1 / price,
        tokenX: {
          type: pair.tokenX,
          symbol: tokenXSymbol,
          decimals: tokenXDecimals,
          reserves: pair.reserves.reserveX
        },
        tokenY: {
          type: pair.tokenY,
          symbol: tokenYSymbol,
          decimals: tokenYDecimals,
          reserves: pair.reserves.reserveY
        },
        pairAddress: pair.address,
        binStep: pair.binStep,
        binStepPercentage: Number(pair.binStep) / 100
      }
    } catch (error) {
      console.error('Error getting active bin info:', error)
      throw error
    }
  }
}

// Usage example
async function example() {
  const fetcher = new ActiveBinFetcher('testnet', '0x...wallet_address')

  // MUST SET TOKEN DECIMALS FIRST (SDK doesn't fetch these)
  fetcher.setTokenDecimals(
    '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
    6
  )
  fetcher.setTokenDecimals(
    '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    9
  )

  const info = await fetcher.getActiveBinInfo('0x...pair_address')
  console.log('Active bin info:', info)
}
```

## How to Get Token Decimals (External Sources)

Since the SDK doesn't fetch token metadata, you need to:

### 1. Hardcode Known Tokens
```typescript
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  '0x2::sui::SUI': { symbol: 'SUI', decimals: 9 },
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC': { symbol: 'USDC', decimals: 6 },
  // Add more tokens as needed
}
```

### 2. Use External API
```typescript
async function fetchTokenMetadata(tokenType: string) {
  // Use Sui token registry, explorer API, or other sources
  const response = await fetch(`https://api.suiscan.xyz/api/v1/tokens/${tokenType}`)
  const data = await response.json()
  return {
    symbol: data.symbol,
    decimals: data.decimals
  }
}
```

### 3. Parse from Coin Type String
```typescript
function parseDecimalsFromType(tokenType: string): number | null {
  // Some tokens include decimals in type, but not reliable
  // This is token-dependent
  return null
}
```

## Bin Price Formula

The price calculation uses this formula:
```
price = (1 + binStep / 10_000) ^ (activeId - 2^23)
```

Where:
- `binStep`: Percentage difference between bins (e.g., 1 = 0.01%)
- `activeId`: Current active bin ID
- `2^23 = 8388608`: The ID where price = 1

## Checklist

- [ ] Pair address is correct
- [ ] Token decimals are known and provided
- [ ] SDK initialized with correct network
- [ ] Active ID extracted from pair
- [ ] Price calculated with correct decimals
- [ ] Token symbols extracted (optional)

## Common Issues

1. **Missing token decimals**: The most common error - SDK requires decimals as input
2. **Wrong network**: Pair must exist on the initialized network
3. **Invalid pair address**: Address format or pair doesn't exist
4. **Token symbol extraction fails**: `CoinAssist.getCoinSymbol()` may not work for all tokens

## Related References

- [Pair Operations](../reference/PAIR_OPERATIONS.md#getting-active-bin-price-and-token-information)
- [Swap Operations](../reference/SWAP_OPERATIONS.md#bin-math-utilities)
- [Test Examples](../reference/TEST_EXAMPLES.md)
- [Add Liquidity Test](../../packages/dlmm/tests/add-liquidity.ts) (line 32: `pair.parameters.active_id`)
- [Swap Test](../../packages/dlmm/tests/swap.ts) (line 71: `BinMath.getPriceFromId()` usage)