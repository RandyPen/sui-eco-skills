// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Basic setup example for DeepBook trading skill
 * Demonstrates how to initialize the trading client and perform basic queries
 */

import { DeepBookTradingClient } from '../src/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function main() {
  console.log('🚀 DeepBook Trading Skill - Basic Setup Example\n');

  // 1. Initialize Sui Client
  const suiClient = new SuiClient({
    url: getFullnodeUrl('testnet'), // Use 'mainnet' for production
  });

  console.log('✅ Sui client initialized');

  // 2. Create a test keypair (in production, use your actual keypair)
  const keypair = Ed25519Keypair.generate();
  const address = keypair.getPublicKey().toSuiAddress();

  console.log(`📝 Test address: ${address}`);
  console.log('⚠️  Note: This is a generated test address. Use your actual address in production.\n');

  // 3. Initialize DeepBook Trading Client
  const tradingClient = new DeepBookTradingClient({
    suiClient,
    address,
    environment: 'testnet', // 'mainnet', 'testnet', or 'devnet'
  });

  console.log('✅ DeepBook trading client initialized');
  console.log(`Environment: testnet`);
  console.log(`Available wrappers:`);
  console.log(`  • trading: ${tradingClient.trading ? '✓' : '✗'} (Order execution)`);
  console.log(`  • queries: ${tradingClient.queries ? '✓' : '✗'} (Market data)`);
  console.log(`  • flashLoans: ${tradingClient.flashLoans ? '✓' : '✗'} (Arbitrage)`);
  console.log(`  • balanceManager: ${tradingClient.balanceManager ? '✓' : '✗'} (Fund management)\n`);

  // 4. Get available pool keys
  try {
    const poolKeys = tradingClient.getAvailablePoolKeys();
    console.log(`📊 Available pools (${poolKeys.length}):`);
    poolKeys.forEach((poolKey, index) => {
      console.log(`  ${index + 1}. ${poolKey}`);
    });
  } catch (error) {
    console.log('⚠️  Could not load pool configurations');
  }

  // 5. Query order book for a pool (example with SUI_DBUSDC)
  try {
    const poolKey = 'SUI_DBUSDC'; // Default testnet pool
    console.log(`\n📈 Querying order book for: ${poolKey}`);

    const orderBook = await tradingClient.queries.getOrderBook({
      poolKey,
      depth: 5,
      includeStats: true,
    });

    console.log(`✅ Order book data retrieved`);
    console.log(`   Mid price: ${orderBook.midPrice}`);
    console.log(`   Bid levels: ${orderBook.bids.length}`);
    console.log(`   Ask levels: ${orderBook.asks.length}`);

    if (orderBook.bids.length > 0) {
      console.log(`\n   Best bid: ${orderBook.bids[0].price} (${orderBook.bids[0].quantity})`);
    }
    if (orderBook.asks.length > 0) {
      console.log(`   Best ask: ${orderBook.asks[0].price} (${orderBook.asks[0].quantity})`);
    }

    if (orderBook.stats) {
      console.log(`\n📊 Pool statistics:`);
      console.log(`   Taker fee: ${(orderBook.stats.tradeParams.takerFee * 100).toFixed(4)}%`);
      console.log(`   Maker fee: ${(orderBook.stats.tradeParams.makerFee * 100).toFixed(4)}%`);
      console.log(`   Vault balances:`);
      console.log(`     Base: ${orderBook.stats.vaultBalances.base}`);
      console.log(`     Quote: ${orderBook.stats.vaultBalances.quote}`);
      console.log(`     DEEP: ${orderBook.stats.vaultBalances.deep}`);
    }
  } catch (error) {
    console.log(`❌ Failed to query order book: ${error}`);
    console.log('ℹ️  This may be due to network issues or the pool not being available.');
  }

  // 6. Demonstrate price conversion
  try {
    const poolKey = 'SUI_DBUSDC';
    const amount = 100; // 100 SUI
    console.log(`\n💱 Price conversion example:`);
    console.log(`   Converting ${amount} SUI to USDC in pool: ${poolKey}`);

    const conversion = await tradingClient.queries.getPriceConversion(
      poolKey,
      amount,
      true // isBaseToQuote (SUI to USDC)
    );

    console.log(`   ${amount} SUI ≈ ${conversion.outputAmount.toFixed(4)} USDC`);
    console.log(`   Rate: 1 SUI = ${conversion.conversionRate.toFixed(4)} USDC`);
    console.log(`   DEEP required: ${conversion.deepRequired}`);
  } catch (error) {
    console.log(`❌ Failed to get price conversion: ${error}`);
  }

  console.log('\n🎯 Basic setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Fund your address with testnet SUI and USDC');
  console.log('2. Create a BalanceManager for trading');
  console.log('3. Try placing limit orders with trading.placeLimitOrder()');
  console.log('4. Explore more examples in the examples/ directory');
}

// Run the example
main().catch((error) => {
  console.error('❌ Example failed:', error);
  process.exit(1);
});