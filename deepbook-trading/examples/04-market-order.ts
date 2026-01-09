// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Market order example for DeepBook trading skill
 * Demonstrates how to place and analyze market orders
 */

import { DeepBookTradingClient } from '../src/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

async function main() {
  console.log('⚡ DeepBook Trading Skill - Market Order Example\n');

  // Initialize client
  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
  const address = '0xYourAddressHere';
  const balanceManagerKey = 'your-balance-manager-key';

  const tradingClient = new DeepBookTradingClient({
    suiClient,
    address,
    environment: 'testnet',
  });

  const poolKey = 'SUI_DBUSDC';

  console.log(`📊 Trading pool: ${poolKey}`);
  console.log(`👤 Address: ${address}`);
  console.log(`💼 BalanceManager: ${balanceManagerKey || 'Not set'}\n`);

  // 1. Understanding market orders
  console.log('1. Market Order Fundamentals');
  console.log('============================');

  console.log('🔍 What are market orders?');
  console.log('   • Execute immediately at best available price');
  console.log('   • No price guarantee - fills at current market prices');
  console.log('   • Higher priority than limit orders');
  console.log('   • Typically pay taker fees');
  console.log('   • Ideal for:');
  console.log('     - Quick execution');
  console.log('     - Small to medium order sizes');
  console.log('     - When precise price is less important than timing\n');

  // 2. Market analysis before market order
  console.log('2. Pre-Trade Market Analysis');
  console.log('============================');

  try {
    const orderBook = await tradingClient.queries.getOrderBook({
      poolKey,
      depth: 10,
      includeStats: true,
    });

    console.log('✅ Current market depth:');
    console.log(`   Mid price: ${orderBook.midPrice}`);
    console.log(`   Best bid: ${orderBook.bids[0]?.price || 'N/A'}`);
    console.log(`   Best ask: ${orderBook.asks[0]?.price || 'N/A'}`);
    console.log(`   Spread: ${orderBook.asks[0] && orderBook.bids[0] ?
      ((orderBook.asks[0].price - orderBook.bids[0].price) / orderBook.midPrice * 100).toFixed(4) + '%' : 'N/A'}`);

    // Analyze market depth for different order sizes
    const testSizes = [1, 10, 50, 100];
    console.log('\n📊 Market depth analysis:');

    for (const size of testSizes) {
      let cumulativeBid = 0;
      let cumulativeAsk = 0;
      let avgBidPrice = 0;
      let avgAskPrice = 0;

      // Calculate average price for buying 'size' SUI
      for (const ask of orderBook.asks) {
        if (cumulativeAsk >= size) break;
        const take = Math.min(ask.quantity, size - cumulativeAsk);
        avgAskPrice = (avgAskPrice * cumulativeAsk + ask.price * take) / (cumulativeAsk + take);
        cumulativeAsk += take;
      }

      // Calculate average price for selling 'size' SUI
      for (const bid of orderBook.bids) {
        if (cumulativeBid >= size) break;
        const take = Math.min(bid.quantity, size - cumulativeBid);
        avgBidPrice = (avgBidPrice * cumulativeBid + bid.price * take) / (cumulativeBid + take);
        cumulativeBid += take;
      }

      const canBuy = cumulativeAsk >= size;
      const canSell = cumulativeBid >= size;

      console.log(`\n   Order size: ${size} SUI`);
      console.log(`   Buy side:`);
      console.log(`     Can execute: ${canBuy ? '✅' : '❌'}`);
      if (canBuy) {
        console.log(`     Avg price: ${avgAskPrice.toFixed(6)}`);
        console.log(`     Slippage: ${((avgAskPrice - orderBook.midPrice) / orderBook.midPrice * 100).toFixed(4)}%`);
        console.log(`     Total cost: ${(avgAskPrice * size).toFixed(2)} USDC`);
      }
      console.log(`   Sell side:`);
      console.log(`     Can execute: ${canSell ? '✅' : '❌'}`);
      if (canSell) {
        console.log(`     Avg price: ${avgBidPrice.toFixed(6)}`);
        console.log(`     Slippage: ${((orderBook.midPrice - avgBidPrice) / orderBook.midPrice * 100).toFixed(4)}%`);
        console.log(`     Total proceeds: ${(avgBidPrice * size).toFixed(2)} USDC`);
      }
    }

  } catch (error) {
    console.log(`❌ Market analysis failed: ${error}`);
  }

  // 3. Market order examples
  console.log('\n3. Market Order Scenarios');
  console.log('=========================');

  const scenarios = [
    {
      name: 'Small buy order',
      quantity: 5,
      isBid: true,
      description: 'Buying 5 SUI - minimal market impact'
    },
    {
      name: 'Medium sell order',
      quantity: 25,
      isBid: false,
      description: 'Selling 25 SUI - moderate market impact'
    },
    {
      name: 'Large buy order',
      quantity: 100,
      isBid: true,
      description: 'Buying 100 SUI - significant market impact'
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📝 ${scenario.name}:`);
    console.log(`   ${scenario.description}`);
    console.log(`   Quantity: ${scenario.quantity} SUI`);
    console.log(`   Side: ${scenario.isBid ? 'BUY' : 'SELL'}`);

    try {
      const conversion = await tradingClient.queries.getPriceConversion(
        poolKey,
        scenario.quantity,
        scenario.isBid // true for base to quote (buy), false for quote to base (sell)
      );

      console.log(`   Estimated output: ${conversion.outputAmount.toFixed(4)} ${scenario.isBid ? 'USDC' : 'SUI'}`);
      console.log(`   Estimated rate: 1 SUI = ${scenario.isBid ?
        conversion.conversionRate.toFixed(4) + ' USDC' :
        (1 / conversion.conversionRate).toFixed(4) + ' USDC'}`);
      console.log(`   DEEP required: ${conversion.deepRequired}`);

      // Check if order size is reasonable for market depth
      const orderBook = await tradingClient.queries.getOrderBook({
        poolKey,
        depth: 20,
        includeStats: false,
      });

      const relevantSide = scenario.isBid ? orderBook.asks : orderBook.bids;
      const totalDepth = relevantSide.reduce((sum, level) => sum + level.quantity, 0);

      console.log(`   Market depth: ${totalDepth.toFixed(2)} SUI on ${scenario.isBid ? 'ask' : 'bid'} side`);
      console.log(`   Depth coverage: ${((scenario.quantity / totalDepth) * 100).toFixed(1)}% of available depth`);

      if (scenario.quantity > totalDepth * 0.5) {
        console.log(`   ⚠️  Warning: Order size > 50% of available depth - high slippage risk`);
      }

    } catch (error) {
      console.log(`   ❌ Analysis failed: ${error}`);
    }
  }

  // 4. Transaction creation example
  console.log('\n4. Market Order Transaction');
  console.log('==========================');

  if (balanceManagerKey && balanceManagerKey !== 'your-balance-manager-key') {
    try {
      const marketOrderParams = {
        poolKey,
        balanceManagerKey,
        quantity: 10, // Example: buy 10 SUI
        isBid: true,
      };

      console.log('📋 Market order parameters:');
      console.log(`   Pool: ${marketOrderParams.poolKey}`);
      console.log(`   BalanceManager: ${marketOrderParams.balanceManagerKey}`);
      console.log(`   Quantity: ${marketOrderParams.quantity} SUI`);
      console.log(`   Side: ${marketOrderParams.isBid ? 'BUY' : 'SELL'}`);

      // Note: In production, you would create and execute the transaction
      console.log('\n⚠️  Transaction creation would:');
      console.log('   1. Create transaction: const tx = await tradingClient.trading.placeMarketOrder(marketOrderParams)');
      console.log('   2. Sign with keypair');
      console.log('   3. Execute and wait for confirmation');
      console.log('   4. Check fill results and balances');

    } catch (error) {
      console.log(`❌ Transaction example failed: ${error}`);
    }
  } else {
    console.log('⚠️  Transaction example skipped - need valid BalanceManager key');
  }

  // 5. Risk management for market orders
  console.log('\n5. Market Order Risk Management');
  console.log('===============================');

  console.log('⚠️  Key risks with market orders:');
  console.log('   • Slippage: Price may be worse than expected');
  console.log('   • Market impact: Large orders move the market');
  console.log('   • Partial fills: May not get full execution');
  console.log('   • Front-running: Others may trade ahead of you');
  console.log('   • Timing: Prices can change between order and execution');

  console.log('\n✅ Risk mitigation strategies:');
  console.log('   • Use limit orders for large trades');
  console.log('   • Split large orders into smaller chunks');
  console.log('   • Monitor market depth before trading');
  console.log('   • Avoid trading during high volatility');
  console.log('   • Use IOC (Immediate or Cancel) for precise control');
  console.log('   • Set maximum acceptable slippage');

  console.log('\n🔧 Advanced techniques:');
  console.log('   • TWAP (Time Weighted Average Price) execution');
  console.log('   • VWAP (Volume Weighted Average Price) targeting');
  console.log('   • Iceberg orders (hide large order size)');
  console.log('   • Smart order routing across multiple pools');

  // 6. Comparison: Market vs Limit orders
  console.log('\n6. Market vs Limit Orders');
  console.log('=========================');

  console.log('📊 Comparison table:');
  console.log('   Feature           Market Order        Limit Order');
  console.log('   -------------------------------------------------');
  console.log('   Execution speed   Immediate           When price reached');
  console.log('   Price certainty   Low                 High');
  console.log('   Fill certainty    High                Variable');
  console.log('   Fees              Taker fee           Maker fee (if resting)');
  console.log('   Market impact     High                Low (if resting)');
  console.log('   Best for          Quick trades        Specific price targets');

  console.log('\n🎯 When to use market orders:');
  console.log('   • Need immediate execution');
  console.log('   • Small order sizes');
  console.log('   • Liquid markets');
  console.log('   • Price is less important than timing');

  console.log('\n🎯 When to use limit orders:');
  console.log('   • Specific price target');
  console.log('   • Large order sizes');
  console.log('   • Want to earn maker fees');
  console.log('   • Can wait for execution');

  console.log('\n🎯 Market order example completed!');
  console.log('\nNext steps:');
  console.log('1. Analyze market depth for your desired trade size');
  console.log('2. Calculate expected slippage and costs');
  console.log('3. Execute with proper BalanceManager setup');
  console.log('4. Monitor execution results and adjust strategy');
}

main().catch((error) => {
  console.error('❌ Example failed:', error);
  process.exit(1);
});