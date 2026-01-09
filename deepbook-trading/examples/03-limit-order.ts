// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Limit order example for DeepBook trading skill
 * Demonstrates how to place, manage, and analyze limit orders
 */

import { DeepBookTradingClient } from '../src/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

// Note: This example demonstrates the structure and flow.
// In production, you would need:
// 1. A funded address with SUI and USDC
// 2. An existing BalanceManager
// 3. Proper error handling and transaction signing

async function main() {
  console.log('📈 DeepBook Trading Skill - Limit Order Example\n');

  // Initialize client
  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
  const address = '0xYourAddressHere'; // Replace with your funded address
  const balanceManagerKey = 'your-balance-manager-key'; // Replace with your BalanceManager key

  const tradingClient = new DeepBookTradingClient({
    suiClient,
    address,
    environment: 'testnet',
  });

  const poolKey = 'SUI_DBUSDC';

  console.log(`📊 Trading pool: ${poolKey}`);
  console.log(`👤 Address: ${address}`);
  console.log(`💼 BalanceManager: ${balanceManagerKey || 'Not set (see note below)'}\n`);

  if (!balanceManagerKey || balanceManagerKey === 'your-balance-manager-key') {
    console.log('⚠️  IMPORTANT:');
    console.log('1. You need a funded address with SUI and USDC');
    console.log('2. You need to create a BalanceManager first');
    console.log('3. Update the balanceManagerKey variable with your actual key');
    console.log('See examples/07-balance-manager.ts for BalanceManager creation\n');
  }

  // 1. Market analysis before placing order
  console.log('1. Pre-Trade Market Analysis');
  console.log('============================');

  try {
    const orderBook = await tradingClient.queries.getOrderBook({
      poolKey,
      depth: 5,
      includeStats: true,
    });

    console.log('✅ Current market conditions:');
    console.log(`   Mid price: ${orderBook.midPrice}`);
    console.log(`   Best bid: ${orderBook.bids[0]?.price || 'N/A'}`);
    console.log(`   Best ask: ${orderBook.asks[0]?.price || 'N/A'}`);
    console.log(`   Spread: ${orderBook.asks[0] && orderBook.bids[0] ?
      ((orderBook.asks[0].price - orderBook.bids[0].price) / orderBook.midPrice * 100).toFixed(4) + '%' : 'N/A'}`);

    // Check account info if BalanceManager is available
    if (balanceManagerKey && balanceManagerKey !== 'your-balance-manager-key') {
      try {
        const accountInfo = await tradingClient.queries.getAccountInfo({
          poolKey,
          balanceManagerKey,
        });

        console.log(`\n✅ Account status:`);
        console.log(`   Open orders: ${accountInfo.openOrders.length}`);
        console.log(`   Locked balances:`);
        console.log(`     Base: ${accountInfo.lockedBalance.base}`);
        console.log(`     Quote: ${accountInfo.lockedBalance.quote}`);
        console.log(`     DEEP: ${accountInfo.lockedBalance.deep}`);
      } catch (error) {
        console.log(`   ⚠️  Could not fetch account info: ${error}`);
      }
    }

  } catch (error) {
    console.log(`❌ Market analysis failed: ${error}`);
  }

  // 2. Order placement strategy
  console.log('\n2. Order Placement Strategy');
  console.log('===========================');

  // Example order parameters
  const orderParams = {
    poolKey,
    balanceManagerKey,
    price: 1.5, // Example price (adjust based on market)
    quantity: 10, // 10 SUI
    isBid: true, // Buy order
    clientOrderId: `limit_buy_${Date.now()}`,
    orderType: 'limit' as const,
    expiration: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
  };

  console.log('📝 Proposed order:');
  console.log(`   Type: ${orderParams.isBid ? 'BUY' : 'SELL'} limit`);
  console.log(`   Price: ${orderParams.price}`);
  console.log(`   Quantity: ${orderParams.quantity} SUI`);
  console.log(`   Total value: ${(orderParams.price * orderParams.quantity).toFixed(2)} USDC`);
  console.log(`   Client Order ID: ${orderParams.clientOrderId}`);
  console.log(`   Expiration: ${new Date(orderParams.expiration * 1000).toLocaleTimeString()}`);

  // 3. Calculate required DEEP stake
  console.log('\n3. DEEP Stake Calculation');
  console.log('=========================');

  try {
    const requiredDeep = await tradingClient.trading.calculateRequiredDeep(
      poolKey,
      orderParams.quantity,
      orderParams.isBid
    );

    console.log(`✅ Required DEEP stake: ${requiredDeep}`);
    console.log(`   Note: DEEP is required for order placement and is refunded when order fills or cancels`);

    // Check if sufficient DEEP is available
    if (balanceManagerKey && balanceManagerKey !== 'your-balance-manager-key') {
      try {
        const deepBalance = await tradingClient.balanceManager.checkBalance(
          balanceManagerKey,
          'DEEP'
        );
        console.log(`   Available DEEP: ${deepBalance.balance}`);
        console.log(`   Sufficient: ${deepBalance.balance >= requiredDeep ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   ⚠️  Could not check DEEP balance: ${error}`);
      }
    }

  } catch (error) {
    console.log(`❌ DEEP calculation failed: ${error}`);
  }

  // 4. Create transaction (demonstration only)
  console.log('\n4. Transaction Creation');
  console.log('======================');

  if (balanceManagerKey && balanceManagerKey !== 'your-balance-manager-key') {
    try {
      const tx = await tradingClient.trading.placeLimitOrder(orderParams);

      console.log('✅ Transaction created successfully');
      console.log(`   Commands: ${tx.blockData?.transactions?.length || 'Unknown'}`);
      console.log(`   Gas budget: ${tx.blockData?.gasConfig?.budget || 'Default'}`);

      // Display transaction structure
      console.log('\n📋 Transaction structure:');
      const commands = tx.blockData?.transactions || [];
      commands.forEach((cmd, i) => {
        console.log(`   ${i + 1}. ${cmd.kind || 'Unknown command'}`);
      });

      // Note: In production, you would:
      // 1. Sign the transaction with your keypair
      // 2. Execute it using suiClient.executeTransactionBlock
      // 3. Wait for confirmation and check results

      console.log('\n⚠️  To execute this transaction:');
      console.log('   1. Sign with your keypair: const signedTx = await keypair.signTransaction(tx)');
      console.log('   2. Execute: const result = await suiClient.executeTransactionBlock({ ... })');
      console.log('   3. Check result: console.log(result.digest)');

    } catch (error) {
      console.log(`❌ Transaction creation failed: ${error}`);
    }
  } else {
    console.log('⚠️  Transaction creation skipped - need valid BalanceManager key');
  }

  // 5. Post-order monitoring strategy
  console.log('\n5. Order Monitoring Strategy');
  console.log('============================');

  console.log('📊 Monitoring plan:');
  console.log('   1. Check order status immediately after placement');
  console.log('   2. Set up periodic status checks (every 30 seconds)');
  console.log('   3. Implement price alerts for market movement');
  console.log('   4. Have cancellation ready if needed');

  console.log('\n🔍 Monitoring commands:');
  console.log('   // Check specific order');
  console.log(`   const order = await tradingClient.queries.getOrderNormalized('${poolKey}', 'order-id-here');`);
  console.log('');
  console.log('   // Check all open orders');
  console.log(`   const openOrders = await tradingClient.client.accountOpenOrders('${poolKey}', '${balanceManagerKey}');`);
  console.log('');
  console.log('   // Cancel if needed');
  console.log(`   const cancelTx = await tradingClient.trading.cancelOrder('${poolKey}', '${balanceManagerKey}', 'order-id-here');`);

  // 6. Risk management considerations
  console.log('\n6. Risk Management');
  console.log('==================');

  console.log('⚠️  Important considerations:');
  console.log('   • Price risk: Market may move away from your order');
  console.log('   • Liquidity risk: Order may not fill if market depth is low');
  console.log('   • Gas cost: Failed transactions still cost gas');
  console.log('   • Slippage: Large orders may experience price impact');
  console.log('   • Expiration: Orders expire and must be renewed if not filled');

  console.log('\n✅ Best practices:');
  console.log('   • Use appropriate order sizes for market depth');
  console.log('   • Set reasonable expiration times');
  console.log('   • Monitor market conditions regularly');
  console.log('   • Have cancellation strategies ready');
  console.log('   • Diversify across multiple price levels');

  console.log('\n🎯 Limit order example completed!');
  console.log('\nNext steps:');
  console.log('1. Fund your address and create a BalanceManager');
  console.log('2. Adjust order parameters based on current market');
  console.log('3. Execute the transaction and monitor results');
  console.log('4. Explore batch orders and advanced strategies');
}

main().catch((error) => {
  console.error('❌ Example failed:', error);
  process.exit(1);
});