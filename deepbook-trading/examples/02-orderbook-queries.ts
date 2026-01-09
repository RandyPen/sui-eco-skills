// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Order book queries example for DeepBook trading skill
 * Demonstrates various market data queries and analysis techniques
 */

import { DeepBookTradingClient } from '../src/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

async function main() {
  console.log('📊 DeepBook Trading Skill - Order Book Queries Example\n');

  // Initialize client (using testnet for example)
  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
  const address = '0xYourAddressHere'; // Replace with your address

  const tradingClient = new DeepBookTradingClient({
    suiClient,
    address,
    environment: 'testnet',
  });

  const poolKey = 'SUI_DBUSDC'; // Example pool

  console.log(`🔍 Analyzing pool: ${poolKey}\n`);

  // 1. Get comprehensive order book data
  console.log('1. Comprehensive Order Book Analysis');
  console.log('====================================');

  try {
    const orderBook = await tradingClient.queries.getOrderBook({
      poolKey,
      depth: 10,
      includeStats: true,
    });

    console.log(`✅ Order book retrieved (${orderBook.timestamp})`);
    console.log(`   Mid price: ${orderBook.midPrice}`);
    console.log(`   Spread: ${((orderBook.asks[0]?.price - orderBook.bids[0]?.price) / orderBook.midPrice * 100).toFixed(4)}%`);
    console.log(`   Bid depth: ${orderBook.bids.length} levels`);
    console.log(`   Ask depth: ${orderBook.asks.length} levels\n`);

    // Display top 5 bids and asks
    console.log('   Top 5 Bids:');
    orderBook.bids.slice(0, 5).forEach((bid, i) => {
      console.log(`     ${i + 1}. ${bid.price.toFixed(6)} - ${bid.quantity.toFixed(4)} (cumulative: ${bid.cumulativeQuantity?.toFixed(4) || 'N/A'})`);
    });

    console.log('\n   Top 5 Asks:');
    orderBook.asks.slice(0, 5).forEach((ask, i) => {
      console.log(`     ${i + 1}. ${ask.price.toFixed(6)} - ${ask.quantity.toFixed(4)} (cumulative: ${ask.cumulativeQuantity?.toFixed(4) || 'N/A'})`);
    });

  } catch (error) {
    console.log(`❌ Failed to get order book: ${error}`);
  }

  // 2. Get detailed pool statistics
  console.log('\n2. Pool Statistics');
  console.log('==================');

  try {
    const poolStats = await tradingClient.queries.getPoolStats(poolKey);

    console.log('✅ Pool statistics retrieved:');
    console.log(`   Trading parameters:`);
    console.log(`     Taker fee: ${(poolStats.tradeParams.takerFee * 100).toFixed(4)}%`);
    console.log(`     Maker fee: ${(poolStats.tradeParams.makerFee * 100).toFixed(4)}%`);
    console.log(`     Stake required: ${poolStats.tradeParams.stakeRequired} DEEP`);

    console.log(`\n   Book parameters:`);
    console.log(`     Tick size: ${poolStats.bookParams.tickSize}`);
    console.log(`     Lot size: ${poolStats.bookParams.lotSize}`);
    console.log(`     Min size: ${poolStats.bookParams.minSize}`);

    console.log(`\n   Vault balances:`);
    console.log(`     Base: ${poolStats.vaultBalances.base}`);
    console.log(`     Quote: ${poolStats.vaultBalances.quote}`);
    console.log(`     DEEP: ${poolStats.vaultBalances.deep}`);

    console.log(`\n   Status: ${poolStats.whitelisted ? 'Whitelisted ✅' : 'Not whitelisted ⚠️'}`);

  } catch (error) {
    console.log(`❌ Failed to get pool stats: ${error}`);
  }

  // 3. Price conversion analysis
  console.log('\n3. Price Conversion Analysis');
  console.log('============================');

  const testAmounts = [1, 10, 100, 1000];

  for (const amount of testAmounts) {
    try {
      const conversion = await tradingClient.queries.getPriceConversion(
        poolKey,
        amount,
        true // SUI to USDC
      );

      console.log(`   ${amount} SUI → ${conversion.outputAmount.toFixed(4)} USDC`);
      console.log(`     Rate: 1 SUI = ${conversion.conversionRate.toFixed(4)} USDC`);
      console.log(`     Slippage estimate: ${((conversion.conversionRate - orderBook?.midPrice || 0) / (orderBook?.midPrice || 1) * 100).toFixed(4)}%`);
      console.log(`     DEEP required: ${conversion.deepRequired}\n`);

    } catch (error) {
      console.log(`   ❌ Failed conversion for ${amount} SUI: ${error}`);
    }
  }

  // 4. Market depth analysis
  console.log('4. Market Depth Analysis');
  console.log('========================');

  try {
    const orderBook = await tradingClient.queries.getOrderBook({
      poolKey,
      depth: 20,
      includeStats: false,
    });

    // Calculate cumulative depth
    const bidCumulative = orderBook.bids.reduce((sum, bid) => sum + bid.quantity, 0);
    const askCumulative = orderBook.asks.reduce((sum, ask) => sum + ask.quantity, 0);

    console.log(`   Bid side depth: ${bidCumulative.toFixed(2)} SUI`);
    console.log(`   Ask side depth: ${askCumulative.toFixed(2)} SUI`);
    console.log(`   Depth ratio: ${(bidCumulative / askCumulative).toFixed(2)}`);

    // Calculate depth at specific price levels
    const priceLevels = [0.01, 0.02, 0.05]; // 1%, 2%, 5% from mid price
    for (const level of priceLevels) {
      const bidPrice = orderBook.midPrice * (1 - level);
      const askPrice = orderBook.midPrice * (1 + level);

      const bidDepth = orderBook.bids
        .filter(bid => bid.price >= bidPrice)
        .reduce((sum, bid) => sum + bid.quantity, 0);

      const askDepth = orderBook.asks
        .filter(ask => ask.price <= askPrice)
        .reduce((sum, ask) => sum + ask.quantity, 0);

      console.log(`\n   Depth at ${(level * 100).toFixed(0)}% from mid:`);
      console.log(`     Bid side (>${bidPrice.toFixed(4)}): ${bidDepth.toFixed(2)} SUI`);
      console.log(`     Ask side (<${askPrice.toFixed(4)}): ${askDepth.toFixed(2)} SUI`);
    }

  } catch (error) {
    console.log(`❌ Failed market depth analysis: ${error}`);
  }

  // 5. Historical spread analysis (simulated)
  console.log('\n5. Spread Analysis');
  console.log('==================');

  try {
    // Simulate checking spread over time (in real implementation, you would store historical data)
    const spreads = [];
    for (let i = 0; i < 3; i++) {
      const orderBook = await tradingClient.queries.getOrderBook({
        poolKey,
        depth: 5,
        includeStats: false,
      });

      if (orderBook.bids[0] && orderBook.asks[0]) {
        const spread = orderBook.asks[0].price - orderBook.bids[0].price;
        const spreadPercent = (spread / orderBook.midPrice) * 100;
        spreads.push({
          timestamp: orderBook.timestamp,
          spread,
          spreadPercent,
          bestBid: orderBook.bids[0].price,
          bestAsk: orderBook.asks[0].price,
        });

        console.log(`   Sample ${i + 1}: ${spreadPercent.toFixed(4)}% spread (${spread.toFixed(6)})`);
      }
    }

    if (spreads.length > 0) {
      const avgSpread = spreads.reduce((sum, s) => sum + s.spreadPercent, 0) / spreads.length;
      const minSpread = Math.min(...spreads.map(s => s.spreadPercent));
      const maxSpread = Math.max(...spreads.map(s => s.spreadPercent));

      console.log(`\n   Spread statistics:`);
      console.log(`     Average: ${avgSpread.toFixed(4)}%`);
      console.log(`     Minimum: ${minSpread.toFixed(4)}%`);
      console.log(`     Maximum: ${maxSpread.toFixed(4)}%`);
      console.log(`     Volatility: ${((maxSpread - minSpread) / avgSpread * 100).toFixed(2)}%`);
    }

  } catch (error) {
    console.log(`❌ Failed spread analysis: ${error}`);
  }

  console.log('\n🎯 Order book queries completed!');
  console.log('\nKey insights:');
  console.log('• Use getOrderBook() for comprehensive market analysis');
  console.log('• getPoolStats() provides trading parameters and vault balances');
  console.log('• getPriceConversion() helps estimate trade execution prices');
  console.log('• Market depth analysis is crucial for large orders');
  console.log('• Spread monitoring helps identify trading opportunities');
}

main().catch((error) => {
  console.error('❌ Example failed:', error);
  process.exit(1);
});