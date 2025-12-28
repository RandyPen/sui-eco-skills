// Basic usage example for Cetus Aggregator SDK
import { AggregatorClient, Env } from "@cetusprotocol/aggregator-sdk"
import { SuiClient } from "@mysten/sui/client"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Transaction, coinWithBalance } from "@mysten/sui/transactions"
import BN from "bn.js"
import { bcs } from "@mysten/sui/bcs"

// Load environment variables
import "dotenv/config"

// Common token addresses
const TOKENS = {
    SUI: "0x2::sui::SUI",
    USDC: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    CETUS: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    AFSUI: "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI",
}

const NO_PYTH_PROVIDERS = ['CETUS', 'KRIYA', 'FLOWX', 'FLOWXV3', 'KRIYAV3', 'TURBOS', 'AFTERMATH', 
    'HAEDAL', 'VOLO', 'AFSUI', 'BLUEMOVE', 'DEEPBOOKV3', 'SCALLOP', 'SUILEND', 'BLUEFIN', 
    'ALPHAFI', 'SPRINGSUI', 'STEAMM', 'METASTABLE', 'OBRIC', 'HAWAL', 'MOMENTUM', 'MAGMA', 
    'SEVENK', 'FULLSAIL', 'CETUSDLMM', 'FERRADLMM', 'FERRACLMM'];

/**
 * Execute a swap with conditional checking for minimum output amount.
 * This function finds optimal routing, validates the output meets minimum requirements,
 * executes the swap, and transfers the resulting tokens to the sender's wallet.
 *
 * @param client - Aggregator client instance for interacting with the Cetus aggregator
 * @param keypair - Ed25519 keypair for signing transactions
 * @param from - Token address to swap from (e.g., SUI token address)
 * @param target - Token address to swap to (e.g., CETUS token address)
 * @param amount - Input amount as a string (e.g., "1000000000" for 1 SUI)
 * @param amountOut - Minimum acceptable output amount as a string
 * @returns Transaction result if successful and conditions met, otherwise null
 */
export const querySwap = async (
    client: AggregatorClient, 
    keypair: Ed25519Keypair, 
    from: string, 
    target: string, 
    amount: string, 
    amountOut: string
) => {
    let router: any = null;
    let txb: any = null;
    let targetCoin: any = null;

    try {
        const wallet = keypair.toSuiAddress();

        const amountIn = new BN(amount);
        router = await client.findRouters({
            from,
            target,
            amount: amountIn,
            byAmountIn: true,
            providers: NO_PYTH_PROVIDERS
        });

        if (router === null) {
            console.log("No routes available");
            return;
        }

        const amountOutput = router.amountOut;

        if (amountOutput.lt(new BN(amountOut))) {
            console.log("Trade condition not met");
            return;
        }

        txb = new Transaction();

        targetCoin = await client.routerSwap({
            router,
            txb,
            inputCoin: coinWithBalance({ type: from, balance: BigInt(amount) }),
            slippage: 0.01,
        });

        txb.moveCall({
            package: "0xe450c157978058fc23078941924ad91bfe3022db6243ffa432f7209ad5bc9889",
            module: "utils",
            function: "check_coin_threshold",
            arguments: [
                targetCoin,
                txb.pure(bcs.U64.serialize(BigInt(amountOut))),
            ],
            typeArguments: [
                target,
            ],
        });
        txb.transferObjects([targetCoin], wallet);

        txb.setSender(wallet);
        txb.setGasBudget(1_000000000);

        const result = await client.client.signAndExecuteTransaction({ transaction: txb, signer: keypair });
        console.log("Swap result:", result);
        return result;

    } catch (error) {
        console.log("querySwap error:", error);
        return null;
    } finally {
        router = null;
        txb = null;
        targetCoin = null;

        if (global.gc) {
            global.gc();
        }
    }
}

/**
 * Execute a simple swap using fast routing without conditional checking.
 * This function finds optimal routing and executes the swap with specified slippage tolerance.
 *
 * @param client - Aggregator client instance for interacting with the Cetus aggregator
 * @param keypair - Ed25519 keypair for signing transactions
 * @param fromToken - Token address to swap from (e.g., SUI token address)
 * @param toToken - Token address to swap to (e.g., USDC token address)
 * @param amount - Input amount as a string (e.g., "500000000" for 0.5 SUI)
 * @param slippage - Maximum acceptable slippage percentage (default: 0.01 for 1%)
 * @returns Transaction result if successful, otherwise null
 */
export async function simpleSwap(
    client: AggregatorClient,
    keypair: Ed25519Keypair,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number = 0.01
) {
    try {
        const amountIn = new BN(amount);

        const routers = await client.findRouters({
            from: fromToken,
            target: toToken,
            amount: amountIn,
            byAmountIn: true,
        });

        if (!routers) {
            console.log("No routes found");
            return null;
        }

        const txb = new Transaction();
        await client.fastRouterSwap({
            router: routers,
            txb,
            slippage,
            refreshAllCoins: true,
        });

        const result = await client.client.signAndExecuteTransaction({ transaction: txb, signer: keypair });
        console.log("Swap executed successfully:", result);
        return result;

    } catch (error) {
        console.error("Swap failed:", error);
        return null;
    }
}

/**
 * Calculate the price of base coin in terms of quote coin.
 * This function finds the optimal routing for swapping a specified quote amount to base coin,
 * then calculates the price as quote amount per base amount (e.g., USDC per SUI).
 *
 * @param client - Aggregator client instance for interacting with the Cetus aggregator
 * @param baseCoinType - Address of the base coin (the coin whose price is being calculated)
 * @param quoteCoinType - Address of the quote coin (the coin used to price the base coin)
 * @param baseCoinDecimal - Decimal places of the base coin 
 * @param quoteCoinDecimal - Decimal places of the quote coin (e.g., 9 for SUI, 6 for USDC)
 * @param quoteAmount - Amount of quote coin to use for price calculation (in normal units, default: "100")
 * @returns Price as a number representing quote amount per base amount (e.g., 3.5 means 1 base = 3.5 quote)
 * @throws Error if no routes available or amountOut is zero
 */
export const getPrice = async (
    client: AggregatorClient,
    baseCoinType: string,
    quoteCoinType: string,
    baseCoinDecimal: number,
    quoteCoinDecimal: number,
    quoteAmount: string = "100",
): Promise<number> => {
    try {
        // Convert quote amount to BN and scale to smallest units (considering decimals)
        const quoteAmountBN = new BN(quoteAmount);
        const quoteAmountInSmallestUnit = quoteAmountBN.mul(new BN(10).pow(new BN(quoteCoinDecimal)));

        // Find optimal routing for swapping quote coin to base coin
        const router = await client.findRouters({
            from: quoteCoinType,
            target: baseCoinType,
            amount: quoteAmountInSmallestUnit,
            byAmountIn: true,
            providers: NO_PYTH_PROVIDERS
        });

        // Validate routing result
        if (!router || !router.amountOut) {
            throw new Error(`No routes available for ${quoteCoinType} -> ${baseCoinType}`);
        }

        // Get output amount in base coin (in smallest units) and convert to normal units
        const baseAmountOut = router.amountOut;
        const baseAmountInNormalUnit = baseAmountOut.div(new BN(10).pow(new BN(baseCoinDecimal)));

        // Ensure non-zero output for price calculation
        if (baseAmountInNormalUnit.isZero()) {
            throw new Error(`Cannot calculate price: amountOut is zero for ${quoteCoinType} -> ${baseCoinType}`);
        }

        // Convert amounts to numbers for division
        const quoteAmountNum = parseFloat(quoteAmountBN.toString());
        const baseAmountNum = parseFloat(baseAmountInNormalUnit.toString());

        // Calculate price: quote amount per base amount (e.g., USDC per SUI)
        const price = quoteAmountNum / baseAmountNum;

        return price;

  } catch (error) {
    console.error(`Error calculating price for ${baseCoinType} in ${quoteCoinType}:`, error);
    throw error;
  }
};

// Main execution
async function main() {
    try {
        // Setup
        const mnemonics = process.env.MNEMONICS!;
        const keypair = Ed25519Keypair.deriveKeypair(mnemonics, `m/44'/784'/0'/0'/0'`);

        const suiClient = new SuiClient({ url: process.env.RPC! });
        const client = new AggregatorClient({
            signer: keypair.toSuiAddress(),
            client: suiClient,
            env: Env.Mainnet,
        });

        console.log("Cetus Aggregator initialized successfully");

        // Example 1: Execute query swap
        console.log("\n=== Example 1: Query Swap ===");
        const result1 = await querySwap(
            client,
            keypair,
            TOKENS.SUI,
            TOKENS.CETUS,
            "1000000000", // 1 SUI
            "500000000"   // min 0.5 CETUS
        );

        if (result1) {
            console.log("✅ Query swap completed successfully");
        } else {
            console.log("❌ Query swap failed or conditions not met");
        }

        // Example 2: Execute simple swap
        console.log("\n=== Example 2: Simple Swap ===");
        const result2 = await simpleSwap(
            client,
            keypair,
            TOKENS.SUI,
            TOKENS.USDC,
            "500000000", // 0.5 SUI
            0.02 // 2% slippage
        );

        if (result2) {
            console.log("✅ Simple swap completed successfully");
        } else {
            console.log("❌ Simple swap failed");
        }

        // Example 3: Get price
        console.log("\n=== Example 3: Get Price ===");
        try {
            // Get SUI price in USDC (1 SUI = ? USDC)
            // Note: price is calculated as quote amount per base amount
            // So for base=SUI, quote=USDC, result means USDC per SUI
            const suiPriceInUSDC = await getPrice(
                client,
                TOKENS.SUI,        // base coin (the coin being priced)
                TOKENS.USDC,       // quote coin (pricing currency)
                9,                 // SUI decimals
                6,                 // USDC decimals
                "100"              // Use 100 USDC for price calculation
            );
            console.log(`✅ SUI price in USDC: ${suiPriceInUSDC.toFixed(6)} USDC per SUI`);

            // Get CETUS price in USDC
            const cetusPriceInUSDC = await getPrice(
                client,
                TOKENS.CETUS,      // base coin
                TOKENS.USDC,       // quote coin
                9,                 // CETUS decimals (assuming 9, adjust if different)
                6,                 // USDC decimals
                "100"              // Use 100 USDC for price calculation
            );
            console.log(`✅ CETUS price in USDC: ${cetusPriceInUSDC.toFixed(6)} USDC per CETUS`);

            // Get CETUS price in SUI (cross rate)
            const cetusPriceInSUI = await getPrice(
                client,
                TOKENS.CETUS,      // base coin
                TOKENS.SUI,        // quote coin
                9,                 // CETUS decimals
                9,                 // SUI decimals
                "100"             // Use 100 SUI for price calculation
            );
            console.log(`✅ CETUS price in SUI: ${cetusPriceInSUI.toFixed(6)} SUI per CETUS`);

        } catch (priceError) {
            console.error("❌ Price calculation failed:", priceError);
        }

    } catch (error) {
        console.error("Application error:", error);
        process.exit(1);
    }
}

// Run the application
main();