// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Balance manager example for DeepBook trading skill
 * Demonstrates fund management with BalanceManager
 */

import { DeepBookTradingClient } from '../src/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

async function main() {
  console.log('💰 DeepBook Trading Skill - Balance Manager Example\n');

  // Initialize client
  const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
  const address = '0xYourAddressHere';

  const tradingClient = new DeepBookTradingClient({
    suiClient,
    address,
    environment: 'testnet',
  });

  console.log(`👤 Address: ${address}`);
  console.log(`🌐 Environment: testnet\n`);

  // 1. Understanding BalanceManager
  console.log('1. Balance Manager Fundamentals');
  console.log('================================');

  console.log('🔍 What is BalanceManager?');
  console.log('   • Smart contract for managing funds on DeepBook');
  console.log('   • Required for all trading operations');
  console.log('   • Holds user deposits for trading');
  console.log('   • Manages DEEP staking for order placement');
  console.log('   • Provides fund isolation and security');
  console.log('');
  console.log('📋 Key functions:');
  console.log('   • createBalanceManager() - Create new BalanceManager');
  console.log('   • deposit() - Deposit funds into BalanceManager');
  console.log('   • withdraw() - Withdraw funds from BalanceManager');
  console.log('   • checkBalance() - Check current balances');
  console.log('   • getAccountInfo() - Get comprehensive account status\n');

  // 2. BalanceManager creation
  console.log('2. Creating a BalanceManager');
  console.log('=============================');

  console.log('📝 Creating a new BalanceManager:');
  console.log('   const createTx = await tradingClient.balanceManager.createBalanceManager({');
  console.log('     owner: address,');
  console.log('     referralCode: "",');
  console.log('   });');
  console.log('');
  console.log('🔑 Important notes:');
  console.log('   • Each address can have multiple BalanceManagers');
  console.log('   • BalanceManagers are identified by their object ID');
  console.log('   • Keep the BalanceManager key (object ID) safe');
  console.log('   • BalanceManagers can be shared with other addresses');
  console.log('   • Referral codes can provide fee discounts\n');

  // 3. Deposit operations
  console.log('3. Deposit Operations');
  console.log('======================');

  const exampleBalanceManagerKey = '0xBalanceManagerKeyHere';

  console.log('💰 Depositing funds:');
  console.log('   // Deposit SUI');
  console.log(`   const depositSuiTx = await tradingClient.balanceManager.deposit({`);
  console.log(`     managerKey: '${exampleBalanceManagerKey}',`);
  console.log(`     coinKey: 'SUI',`);
  console.log(`     amount: 100,`);
  console.log(`   });`);
  console.log('');
  console.log('   // Deposit USDC');
  console.log(`   const depositUsdcTx = await tradingClient.balanceManager.deposit({`);
  console.log(`     managerKey: '${exampleBalanceManagerKey}',`);
  console.log(`     coinKey: 'USDC',`);
  console.log(`     amount: 1000,`);
  console.log(`   });`);
  console.log('');
  console.log('   // Deposit DEEP (required for order placement)');
  console.log(`   const depositDeepTx = await tradingClient.balanceManager.deposit({`);
  console.log(`     managerKey: '${exampleBalanceManagerKey}',`);
  console.log(`     coinKey: 'DEEP',`);
  console.log(`     amount: 1000,`);
  console.log(`   });`);
  console.log('');
  console.log('💡 Deposit tips:');
  console.log('   • Deposit sufficient DEEP for order placement');
  console.log('   • Keep some funds outside BalanceManager for gas');
  console.log('   • Monitor deposit transaction confirmations');
  console.log('   • Verify balances after deposit\n');

  // 4. Balance checking
  console.log('4. Balance Checking');
  console.log('====================');

  console.log('📊 Checking balances:');
  console.log(`   // Check SUI balance`);
  console.log(`   const suiBalance = await tradingClient.balanceManager.checkBalance({`);
  console.log(`     managerKey: '${exampleBalanceManagerKey}',`);
  console.log(`     coinKey: 'SUI',`);
  console.log(`   });`);
  console.log(`   console.log('SUI balance:', suiBalance.balance);`);
  console.log('');
  console.log(`   // Check USDC balance`);
  console.log(`   const usdcBalance = await tradingClient.balanceManager.checkBalance({`);
  console.log(`     managerKey: '${exampleBalanceManagerKey}',`);
  console.log(`     coinKey: 'USDC',`);
  console.log(`   });`);
  console.log(`   console.log('USDC balance:', usdcBalance.balance);`);
  console.log('');
  console.log(`   // Check DEEP balance`);
  console.log(`   const deepBalance = await tradingClient.balanceManager.checkBalance({`);
  console.log(`     managerKey: '${exampleBalanceManagerKey}',`);
  console.log(`     coinKey: 'DEEP',`);
  console.log(`   });`);
  console.log(`   console.log('DEEP balance:', deepBalance.balance);`);
  console.log('');
  console.log('💡 Balance checking tips:');
  console.log('   • Check balances before placing orders');
  console.log('   • Monitor locked vs available balances');
  console.log('   • Track DEEP requirements for different order types');
  console.log('   • Set up automated balance alerts\n');

  // 5. Withdraw operations
  console.log('5. Withdraw Operations');
  console.log('========================');

  console.log('💸 Withdrawing funds:');
  console.log('   // Withdraw SUI');
  console.log(`   const withdrawSuiTx = await tradingClient.balanceManager.withdraw({`);
  console.log(`     managerKey: '${exampleBalanceManagerKey}',`);
  console.log(`     coinKey: 'SUI',`);
  console.log(`     amount: 50,`);
  console.log(`   });`);
  console.log('');
  console.log('   // Withdraw USDC');
  console.log(`   const withdrawUsdcTx = await tradingClient.balanceManager.withdraw({`);
  console.log(`     managerKey: '${exampleBalanceManagerKey}',`);
  console.log(`     coinKey: 'USDC',`);
  console.log(`     amount: 500,`);
  console.log(`   });`);
  console.log('');
  console.log('   // Withdraw DEEP');
  console.log(`   const withdrawDeepTx = await tradingClient.balanceManager.withdraw({`);
  console.log(`     managerKey: '${exampleBalanceManagerKey}',`);
  console.log(`     coinKey: 'DEEP',`);
  console.log(`     amount: 500,`);
  console.log(`   });`);
  console.log('');
  console.log('⚠️  Withdraw considerations:');
  console.log('   • Cannot withdraw locked funds (used in open orders)');
  console.log('   • Withdrawals may take time to process');
  console.log('   • Keep sufficient DEEP for active orders');
  console.log('   • Consider gas costs for withdrawal transactions\n');

  // 6. Account information
  console.log('6. Account Information');
  console.log('========================');

  const examplePoolKey = 'SUI_DBUSDC';

  console.log('📈 Getting comprehensive account info:');
  console.log(`   const accountInfo = await tradingClient.queries.getAccountInfo({`);
  console.log(`     poolKey: '${examplePoolKey}',`);
  console.log(`     balanceManagerKey: '${exampleBalanceManagerKey}',`);
  console.log(`   });`);
  console.log('');
  console.log('📊 Account information includes:');
  console.log('   • Base asset balance (e.g., SUI)');
  console.log('   • Quote asset balance (e.g., USDC)');
  console.log('   • DEEP balance');
  console.log('   • Locked balances (for open orders)');
  console.log('   • Open orders list');
  console.log('   • Available balances for trading');
  console.log('');
  console.log('💡 Account management tips:');
  console.log('   • Regularly check account health');
  console.log('   • Monitor locked vs available balances');
  console.log('   • Track DEEP requirements for order placement');
  console.log('   • Set up automated alerts for low balances\n');

  // 7. Multiple BalanceManagers
  console.log('7. Multiple BalanceManagers Strategy');
  console.log('=====================================');

  console.log('🏦 Using multiple BalanceManagers:');
  console.log('   • Strategy 1: Separation by trading strategy');
  console.log('     - One for market making');
  console.log('     - One for arbitrage');
  console.log('     - One for long-term holds');
  console.log('');
  console.log('   • Strategy 2: Separation by risk level');
  console.log('     - High-risk BalanceManager');
  console.log('     - Medium-risk BalanceManager');
  console.log('     - Low-risk BalanceManager');
  console.log('');
  console.log('   • Strategy 3: Separation by asset type');
  console.log('     - SUI-focused BalanceManager');
  console.log('     - USDC-focused BalanceManager');
  console.log('     - Multi-asset BalanceManager');
  console.log('');
  console.log('🔧 Implementation:');
  console.log(`   const balanceManagers = {`);
  console.log(`     marketMaking: '0xMarketMakingManager',`);
  console.log(`     arbitrage: '0xArbitrageManager',`);
  console.log(`     longTerm: '0xLongTermManager',`);
  console.log(`   };`);
  console.log('');
  console.log('   // Use in trading client initialization');
  console.log(`   const clientWithMultipleManagers = new DeepBookTradingClient({`);
  console.log(`     suiClient,`);
  console.log(`     address,`);
  console.log(`     environment: 'testnet',`);
  console.log(`     balanceManagers,`);
  console.log(`   });`);

  // 8. Best practices and risk management
  console.log('\n8. Best Practices for Balance Management');
  console.log('=========================================');

  console.log('✅ Security best practices:');
  console.log('   • Store BalanceManager keys securely');
  console.log('   • Use hardware wallets for large amounts');
  console.log('   • Implement multi-signature for institutional use');
  console.log('   • Regularly audit BalanceManager activities');
  console.log('   • Monitor for unauthorized access\n');

  console.log('✅ Risk management:');
  console.log('   • Set maximum deposit limits per BalanceManager');
  console.log('   • Implement withdrawal limits and delays');
  console.log('   • Use separate BalanceManagers for different strategies');
  console.log('   • Maintain emergency withdrawal procedures');
  console.log('   • Regularly backup BalanceManager configurations\n');

  console.log('✅ Operational efficiency:');
  console.log('   • Automate balance monitoring and alerts');
  console.log('   • Implement batch deposit/withdrawal operations');
  console.log('   • Use scripts for routine BalanceManager operations');
  console.log('   • Monitor gas costs for BalanceManager transactions');
  console.log('   • Optimize DEEP allocation across strategies\n');

  // 9. Example workflow
  console.log('\n9. Complete BalanceManager Workflow');
  console.log('====================================');

  console.log('🔧 Step-by-step workflow:');
  console.log('   1. Create BalanceManager');
  console.log('   2. Deposit initial funds (SUI, USDC, DEEP)');
  console.log('   3. Check balances and verify deposits');
  console.log('   4. Execute trading operations');
  console.log('   5. Monitor account balances and open orders');
  console.log('   6. Withdraw profits or rebalance funds');
  console.log('   7. Regular maintenance and optimization');
  console.log('');
  console.log('📋 Example checklist:');
  console.log('   [ ] BalanceManager created and key saved');
  console.log('   [ ] Initial deposits completed');
  console.log('   [ ] Balances verified');
  console.log('   [ ] DEEP staking sufficient for trading');
  console.log('   [ ] Withdrawal procedures tested');
  console.log('   [ ] Monitoring systems in place');
  console.log('   [ ] Backup procedures established');

  console.log('\n🎯 Balance manager example completed!');
  console.log('\nNext steps:');
  console.log('1. Create your BalanceManager with a funded address');
  console.log('2. Deposit test amounts for SUI, USDC, and DEEP');
  console.log('3. Practice balance checking and account queries');
  console.log('4. Test deposit and withdrawal operations');
  console.log('5. Implement automated balance monitoring');
  console.log('6. Explore multiple BalanceManager strategies');
}

main().catch((error) => {
  console.error('❌ Example failed:', error);
  process.exit(1);
});