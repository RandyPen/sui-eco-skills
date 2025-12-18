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
            providers: ["CETUS","CETUSDLMM","SCALLOP","AFTERMATH","FLOWXV3","AFSUI","STEAMM","VOLO","KRIYAV3","KRIYA","ALPHAFI","FLOWX","BLUEMOVE","DEEPBOOKV3","BLUEFIN","HAEDAL","TURBOS","SPRINGSUI","STEAMM","HAWAL","OBRIC","FULLSAIL","MAGMA","FERRACLMM","FERRADLMM"]
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

    } catch (error) {
        console.error("Application error:", error);
        process.exit(1);
    }
}

// Run the application
main();