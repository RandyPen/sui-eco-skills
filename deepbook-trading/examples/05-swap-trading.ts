// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Swap trading example for DeepBook trading skill
 * Demonstrates asset swaps and exchange functionality
 */

import { DeepBookTradingClient } from '../src/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

async function main() {
  console.log('🔄 DeepBook Trading Skill - Swap Trading Example\n');

  // Initialize client
  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
  const address = '0xYourAddressHere';

  const tradingClient = new DeepBookTradingClient({
    suiClient,
    address,
    environment: 'testnet',
  });

  const poolKey = 'SUI_DBUSDC';

  console.log(`📊 Trading pool: ${poolKey}`);
  console.log(`👤 Address: ${address}\n`);

  // 1. Understanding swaps on DeepBook
  console.log('1. Swap Trading Fundamentals');
  console.log('============================');

  console.log('🔍 What are swaps on DeepBook?');
  console.log('   • Direct asset exchange between base and quote tokens');
  console.log('   • Uses the order book for price discovery');
  console.log('   • Can be exact input or exact output (with slippage protection)');
  console.log('   • Typically pay taker fees');
  console.log('   • Advantages:');
  console.log('     - Single transaction execution');
  console.log('     - No need for limit orders');
  console.log('     - Immediate settlement');
  console.log('     - Slippage protection available\n');

  // 2. Swap types and parameters
  console.log('2. Swap Types and Parameters');
  console.log('=============================');

  console.log('📋 Swap function types:');
  console.log('   1. swapExactBaseForQuote()');
  console.log('      • Input: Exact base amount');
  console.log('      • Output: Minimum quote amount (slippage protection)');
  console.log('      • Use: When you know exactly how much base to sell');
  console.log('');
  console.log('   2. swapExactQuoteForBase()');
  console.log('      • Input: Exact quote amount');
  console.log('      • Output: Minimum base amount (slippage protection)');
  console.log('      • Use: When you know exactly how much quote to spend');
  console.log('');
  console.log('   3. getQuantityOut() - for price estimation');
  console.log('      • Estimates output for given input');
  console.log('      • Helps set appropriate minOut values');
  console.log('      • Essential for slippage calculation\n');

  // 3. Price and slippage analysis
  console.log('3. Price and Slippage Analysis');
  console.log('===============================');

  const testAmounts = [10, 50, 100, 500]; // SUI amounts to test

  console.log('📊 Swap analysis for different amounts:');

  for (const amount of testAmounts) {
    try {
      console.log(`\n💱 Swap ${amount} SUI → USDC:`);

      // Get price conversion estimate
      const conversion = await tradingClient.queries.getPriceConversion(
        poolKey,
        amount,
        true // SUI to USDC
      );

      console.log(`   Expected output: ${conversion.outputAmount.toFixed(4)} USDC`);
      console.log(`   Exchange rate: 1 SUI = ${conversion.conversionRate.toFixed(4)} USDC`);
      console.log(`   DEEP required: ${conversion.deepRequired}`);

      // Calculate slippage for different minOut values
      const slippageTolerances = [0.001, 0.005, 0.01, 0.02]; // 0.1%, 0.5%, 1%, 2%

      console.log(`   Slippage protection scenarios:`);

      for (const tolerance of slippageTolerances) {
        const minOut = conversion.outputAmount * (1 - tolerance);
        const effectiveRate = minOut / amount;

        console.log(`     • ${(tolerance * 100).toFixed(1)}% tolerance:`);
        console.log(`       Min output: ${minOut.toFixed(4)} USDC`);
        console.log(`       Effective rate: ${effectiveRate.toFixed(4)} USDC/SUI`);
        console.log(`       Protection: ${((conversion.conversionRate - effectiveRate) / conversion.conversionRate * 100).toFixed(2)}% below market`);

        // Check if this is realistic given market depth
        const orderBook = await tradingClient.queries.getOrderBook({
          poolKey,
          depth: 20,
          includeStats: false,
        });

        let cumulativeDepth = 0;
        let avgPrice = 0;

        for (const ask of orderBook.asks) {
          if (cumulativeDepth >= amount) break;
          const take = Math.min(ask.quantity, amount - cumulativeDepth);
          avgPrice = (avgPrice * cumulativeDepth + ask.price * take) / (cumulativeDepth + take);
          cumulativeDepth += take;
        }

        const canExecute = cumulativeDepth >= amount;
        const expectedAvgRate = 1 / avgPrice; // USDC per SUI

        console.log(`       Market depth: ${cumulativeDepth.toFixed(2)} SUI available`);
        console.log(`       Can execute: ${canExecute ? '✅' : '❌'}`);
        if (canExecute) {
          console.log(`       Expected avg rate: ${expectedAvgRate.toFixed(4)} USDC/SUI`);
          const wouldFail = effectiveRate > expectedAvgRate;
          console.log(`       Order would: ${wouldFail ? '❌ FAIL (minOut too high)' : '✅ SUCCEED'}`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Analysis failed for ${amount} SUI: ${error}`);
    }
  }

  // 4. Swap transaction examples
  console.log('\n4. Swap Transaction Examples');
  console.log('============================');

  const swapExamples = [
    {
      name: 'Small swap with tight slippage',
      amount: 10,
      isExactBase: true,
      slippage: 0.005, // 0.5%
      description: 'Conservative swap with minimal slippage risk'
    },
    {
      name: 'Medium swap with moderate slippage',
      amount: 100,
      isExactBase: true,
      slippage: 0.01, // 1%
      description: 'Balanced approach for typical trading'
    },
    {
      name: 'Large swap with relaxed slippage',
      amount: 500,
      isExactBase: true,
      slippage: 0.02, // 2%
      description: 'Large trade accepting more slippage for execution certainty'
    },
    {
      name: 'Quote to base swap',
      quoteAmount: 150,
      isExactBase: false,
      slippage: 0.01, // 1%
      description: 'Spending exact USDC amount to buy SUI'
    }
  ];

  for (const example of swapExamples) {
    console.log(`\n📝 ${example.name}:`);
    console.log(`   ${example.description}`);

    try {
      if (example.isExactBase) {
        console.log(`   Swap: ${example.amount} SUI → USDC`);

        const conversion = await tradingClient.queries.getPriceConversion(
          poolKey,
          example.amount,
          true // SUI to USDC
        );

        const minOut = conversion.outputAmount * (1 - example.slippage);

        console.log(`   Parameters:`);
        console.log(`     Pool: ${poolKey}`);
        console.log(`     Amount: ${example.amount} SUI`);
        console.log(`     Min output: ${minOut.toFixed(4)} USDC (${(example.slippage * 100).toFixed(1)}% slippage)`);
        console.log(`     Expected output: ${conversion.outputAmount.toFixed(4)} USDC`);
        console.log(`     DEEP required: ${conversion.deepRequired}`);

        // Transaction structure
        console.log(`\n   Transaction would use:`);
        console.log(`     swapExactBaseForQuote({`);
        console.log(`       poolKey: '${poolKey}',`);
        console.log(`       amount: ${example.amount},`);
        console.log(`       deepAmount: 0,`);
        console.log(`       minOut: ${minOut.toFixed(4)}`);
        console.log(`     })`);

      } else {
        console.log(`   Swap: ${example.quoteAmount} USDC → SUI`);

        const conversion = await tradingClient.queries.getPriceConversion(
          poolKey,
          example.quoteAmount,
          false // USDC to SUI
        );

        const minOut = conversion.outputAmount * (1 - example.slippage);

        console.log(`   Parameters:`);
        console.log(`     Pool: ${poolKey}`);
        console.log(`     Amount: ${example.quoteAmount} USDC`);
        console.log(`     Min output: ${minOut.toFixed(4)} SUI (${(example.slippage * 100).toFixed(1)}% slippage)`);
        console.log(`     Expected output: ${conversion.outputAmount.toFixed(4)} SUI`);
        console.log(`     DEEP required: ${conversion.deepRequired}`);

        // Transaction structure
        console.log(`\n   Transaction would use:`);
        console.log(`     swapExactQuoteForBase({`);
        console.log(`       poolKey: '${poolKey}',`);
        console.log(`       amount: ${example.quoteAmount},`);
        console.log(`       deepAmount: 0,`);
        console.log(`       minOut: ${minOut.toFixed(4)}`);
        console.log(`     })`);
      }

    } catch (error) {
      console.log(`   ❌ Example failed: ${error}`);
    }
  }

  // 5. Advanced swap strategies
  console.log('\n5. Advanced Swap Strategies');
  console.log('===========================');

  console.log('🔧 Strategy 1: Slippage Optimization');
  console.log('   • Dynamic slippage based on market conditions');
  console.log('   • Higher volatility → higher slippage tolerance');
  console.log('   • Lower liquidity → higher slippage tolerance');
  console.log('   • Time-based adjustments for TWAP execution\n');

  console.log('🔧 Strategy 2: Multi-pool Arbitrage');
  console.log('   • Compare rates across different pools');
  console.log('   • Execute profitable arbitrage opportunities');
  console.log('   • Consider gas costs and execution speed');
  console.log('   Example:');
  console.log('     Pool A: 1 SUI = 1.50 USDC');
  console.log('     Pool B: 1 SUI = 1.52 USDC');
  console.log('     Opportunity: Buy in Pool A, sell in Pool B\n');

  console.log('🔧 Strategy 3: DCA (Dollar Cost Averaging)');
  console.log('   • Regular swaps at fixed intervals');
  console.log('   • Smooth out price volatility');
  console.log('   • Automated execution via scripts');
  console.log('   • Customizable: amount, frequency, conditions\n');

  console.log('🔧 Strategy 4: Stop-Loss Swaps');
  console.log('   • Automatic swap if price reaches certain level');
  console.log('   • Risk management tool');
  console.log('   • Requires price monitoring or oracles');
  console.log('   • Can be combined with limit orders\n');

  // 6. Risk management and best practices
  console.log('\n6. Risk Management for Swaps');
  console.log('============================');

  console.log('⚠️  Common risks:');
  console.log('   • Slippage: Getting worse price than expected');
  console.log('   • Front-running: Others trading ahead of your swap');
  console.log('   • Sandwich attacks: Being manipulated by MEV bots');
  console.log('   • Failed transactions: Gas wasted if minOut not met');
  console.log('   • Price volatility: Market moves during transaction confirmation');

  console.log('\n✅ Best practices:');
  console.log('   • Always use minOut for slippage protection');
  console.log('   • Monitor gas prices and network conditions');
  console.log('   • Avoid swapping during high volatility');
  console.log('   • Consider splitting large swaps');
  console.log('   • Use reputable RPC endpoints');
  console.log('   • Implement transaction simulation before execution');

  console.log('\n🔍 Slippage calculation tips:');
  console.log('   1. Check recent price volatility');
  console.log('   2. Analyze current market depth');
  console.log('   3. Consider transaction confirmation time');
  console.log('   4. Adjust for time of day (liquidity patterns)');
  console.log('   5. Factor in gas costs for failed transactions');

  console.log('\n🎯 Swap trading example completed!');
  console.log('\nNext steps:');
  console.log('1. Analyze current market conditions for your swap');
  console.log('2. Calculate optimal slippage tolerance');
  console.log('3. Execute swap with proper BalanceManager setup');
  console.log('4. Monitor execution and adjust strategies');
  console.log('5. Explore advanced strategies like arbitrage and DCA');
}

main().catch((error) => {
  console.error('❌ Example failed:', error);
  process.exit(1);
});