// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Liquidation bot template for detecting and executing liquidation opportunities
 * This template provides a foundation for building liquidation bots
 */

import { DeepBookTradingClient } from '../src/index.js';
import type { SuiClient } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';

export interface LiquidationOpportunity {
  poolKey: string;
  accountAddress: string;
  positionSize: number; // Size of the position to liquidate
  collateralRatio: number; // Current collateral ratio
  liquidationThreshold: number; // Threshold for liquidation
  estimatedBonus: number; // Estimated liquidation bonus
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface LiquidationConfig {
  monitoredPools: string[];
  liquidationThreshold: number; // Collateral ratio threshold (e.g., 1.1 for 110%)
  minPositionSize: number; // Minimum position size to consider
  maxGasPerLiquidation: number; // Maximum gas cost per liquidation
  checkInterval: number; // Milliseconds between checks
  maxFlashLoanSize: number; // Maximum flash loan amount
  slippageTolerance: number; // Slippage tolerance for execution
}

export interface LiquidationBotState {
  lastCheck: number;
  opportunitiesFound: number;
  liquidationsExecuted: number;
  totalBonuses: number;
  activeOpportunities: LiquidationOpportunity[];
}

export class LiquidationBot {
  private state: LiquidationBotState = {
    lastCheck: 0,
    opportunitiesFound: 0,
    liquidationsExecuted: 0,
    totalBonuses: 0,
    activeOpportunities: [],
  };

  constructor(
    private tradingClient: DeepBookTradingClient,
    private config: LiquidationConfig
  ) {}

  /**
   * Start the liquidation bot
   */
  async start(): Promise<void> {
    console.log('🚀 Starting liquidation bot');
    console.log(`   Monitored pools: ${this.config.monitoredPools.length}`);
    console.log(`   Liquidation threshold: ${this.config.liquidationThreshold}`);
    console.log(`   Min position size: ${this.config.minPositionSize}`);
    console.log(`   Check interval: ${this.config.checkInterval}ms`);

    // Main loop
    while (true) {
      try {
        await this.checkLiquidationOpportunities();
        await this.sleep(this.config.checkInterval);
      } catch (error) {
        console.error('❌ Liquidation bot error:', error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  /**
   * Check for liquidation opportunities in monitored pools
   */
  private async checkLiquidationOpportunities(): Promise<void> {
    console.log('🔍 Scanning for liquidation opportunities...');

    for (const poolKey of this.config.monitoredPools) {
      try {
        const opportunities = await this.findLiquidationOpportunities(poolKey);

        for (const opportunity of opportunities) {
          if (this.isProfitable(opportunity)) {
            console.log(`💰 Found liquidation opportunity in ${poolKey}`);
            console.log(`   Position size: ${opportunity.positionSize}`);
            console.log(`   Collateral ratio: ${opportunity.collateralRatio.toFixed(4)}`);
            console.log(`   Estimated bonus: $${opportunity.estimatedBonus.toFixed(2)}`);
            console.log(`   Risk level: ${opportunity.riskLevel}`);

            await this.executeLiquidation(opportunity);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to check liquidation opportunities for ${poolKey}:`, error);
      }
    }

    this.state.lastCheck = Date.now();
  }

  /**
   * Find liquidation opportunities in a specific pool
   */
  private async findLiquidationOpportunities(poolKey: string): Promise<LiquidationOpportunity[]> {
    const opportunities: LiquidationOpportunity[] = [];

    try {
      // In a real implementation, you would:
      // 1. Query all accounts in the pool
      // 2. Check their collateral ratios
      // 3. Identify accounts below liquidation threshold

      // For this template, we'll simulate finding opportunities
      const simulatedAccounts = this.simulateAccountData(poolKey);

      for (const account of simulatedAccounts) {
        if (account.collateralRatio < this.config.liquidationThreshold &&
            account.positionSize >= this.config.minPositionSize) {

          const opportunity: LiquidationOpportunity = {
            poolKey,
            accountAddress: account.address,
            positionSize: account.positionSize,
            collateralRatio: account.collateralRatio,
            liquidationThreshold: this.config.liquidationThreshold,
            estimatedBonus: this.calculateLiquidationBonus(account),
            riskLevel: this.calculateRiskLevel(account),
            timestamp: Date.now(),
          };

          opportunities.push(opportunity);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to find liquidation opportunities for ${poolKey}:`, error);
    }

    return opportunities;
  }

  /**
   * Calculate liquidation bonus for an account
   */
  private calculateLiquidationBonus(account: any): number {
    // Simplified bonus calculation
    // In reality, this would depend on the specific protocol's liquidation incentives
    const positionValue = account.positionSize * account.currentPrice;
    const collateralDeficit = (this.config.liquidationThreshold - account.collateralRatio) * 100;

    // Typical liquidation bonus: 5-15% of position value
    const bonusPercentage = Math.min(0.15, Math.max(0.05, collateralDeficit / 10));
    return positionValue * bonusPercentage;
  }

  /**
   * Calculate risk level for a liquidation opportunity
   */
  private calculateRiskLevel(account: any): 'low' | 'medium' | 'high' {
    const collateralDeficit = (this.config.liquidationThreshold - account.collateralRatio) * 100;

    if (collateralDeficit > 20) return 'low';    // Far below threshold
    if (collateralDeficit > 10) return 'medium'; // Moderately below threshold
    return 'high';                               // Just below threshold
  }

  /**
   * Check if a liquidation opportunity is profitable
   */
  private isProfitable(opportunity: LiquidationOpportunity): boolean {
    // Check if estimated bonus exceeds gas costs
    const netProfit = opportunity.estimatedBonus - this.config.maxGasPerLiquidation;

    // Additional checks
    const sufficientLiquidity = opportunity.positionSize <= this.config.maxFlashLoanSize;
    const acceptableRisk = opportunity.riskLevel !== 'high' || opportunity.estimatedBonus > this.config.maxGasPerLiquidation * 3;

    return netProfit > 0 && sufficientLiquidity && acceptableRisk;
  }

  /**
   * Execute liquidation using flash loan
   */
  private async executeLiquidation(opportunity: LiquidationOpportunity): Promise<void> {
    try {
      console.log(`⚡ Executing liquidation for ${opportunity.accountAddress}`);

      // 1. Calculate required flash loan amount
      const loanAmount = opportunity.positionSize * this.config.liquidationThreshold;

      if (loanAmount > this.config.maxFlashLoanSize) {
        console.log(`⚠️  Flash loan amount ${loanAmount} exceeds maximum ${this.config.maxFlashLoanSize}, skipping`);
        return;
      }

      // 2. Get current market price
      const orderBook = await this.tradingClient.queries.getOrderBook({
        poolKey: opportunity.poolKey,
        depth: 5,
      });

      const currentPrice = orderBook.midPrice;
      const positionValue = opportunity.positionSize * currentPrice;

      console.log(`   Position value: $${positionValue.toFixed(2)}`);
      console.log(`   Required loan: $${loanAmount.toFixed(2)}`);
      console.log(`   Current price: $${currentPrice.toFixed(6)}`);

      // 3. Create liquidation transaction
      // In a real implementation, this would involve:
      // - Borrowing assets via flash loan
      // - Liquidating the underwater position
      // - Selling the liquidated assets
      // - Repaying the flash loan
      // - Keeping the liquidation bonus

      const tx = new Transaction();

      // Example transaction structure:
      // tx.add(this.tradingClient.flashLoans.borrowQuoteAsset(opportunity.poolKey, loanAmount));
      // tx.add(this.tradingClient.liquidatePosition(opportunity.poolKey, opportunity.accountAddress));
      // tx.add(this.tradingClient.swapExactBaseForQuote(...));
      // tx.add(this.tradingClient.flashLoans.returnQuoteAsset(...));
      // tx.transferObjects([profit], tx.pure.address(this.tradingClient.address));

      console.log('✅ Liquidation transaction created successfully');

      // 4. Update state
      this.state.liquidationsExecuted++;
      this.state.totalBonuses += opportunity.estimatedBonus;

      // Remove from active opportunities
      this.state.activeOpportunities = this.state.activeOpportunities.filter(
        opp => opp.accountAddress !== opportunity.accountAddress
      );

      console.log(`💰 Liquidation executed: +$${opportunity.estimatedBonus.toFixed(2)} bonus`);

    } catch (error) {
      console.error('❌ Failed to execute liquidation:', error);

      // Mark opportunity as failed (could retry later)
      const existingOpp = this.state.activeOpportunities.find(
        opp => opp.accountAddress === opportunity.accountAddress
      );

      if (existingOpp) {
        existingOpp.riskLevel = 'high'; // Increase risk level for failed liquidation
      }
    }
  }

  /**
   * Simulate account data for template purposes
   */
  private simulateAccountData(poolKey: string): any[] {
    // Simulate 10 accounts with varying collateral ratios
    const accounts = [];
    const basePrice = 1.5; // Example price

    for (let i = 0; i < 10; i++) {
      const positionSize = 100 + Math.random() * 900; // 100-1000 SUI
      const collateralRatio = 0.8 + Math.random() * 0.4; // 80-120%

      accounts.push({
        address: `0xaccount${i}`,
        poolKey,
        positionSize,
        collateralRatio,
        currentPrice: basePrice * (0.95 + Math.random() * 0.1), // ±5% variation
        timestamp: Date.now(),
      });
    }

    return accounts;
  }

  /**
   * Stop the liquidation bot
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping liquidation bot...');
    console.log(`   Opportunities found: ${this.state.opportunitiesFound}`);
    console.log(`   Liquidations executed: ${this.state.liquidationsExecuted}`);
    console.log(`   Total bonuses: $${this.state.totalBonuses.toFixed(2)}`);
    console.log(`   Active opportunities: ${this.state.activeOpportunities.length}`);
    console.log('✅ Liquidation bot stopped');
  }

  /**
   * Get current state
   */
  getState(): LiquidationBotState {
    return { ...this.state };
  }

  /**
   * Get active opportunities
   */
  getActiveOpportunities(): LiquidationOpportunity[] {
    return [...this.state.activeOpportunities];
  }

  /**
   * Sleep helper function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example usage of the liquidation bot template
 */
export async function runLiquidationBotExample(): Promise<void> {
  console.log('🏃‍♂️ Running liquidation bot example...\n');

  // Configuration
  const config: LiquidationConfig = {
    monitoredPools: ['SUI_DBUSDC', 'SUI_USDT', 'SUI_USDC'],
    liquidationThreshold: 1.1, // 110% collateral ratio
    minPositionSize: 50, // Minimum 50 SUI position
    maxGasPerLiquidation: 0.5, // Maximum $0.5 gas per liquidation
    checkInterval: 15000, // 15 seconds
    maxFlashLoanSize: 50000, // $50,000 max flash loan
    slippageTolerance: 0.005, // 0.5% slippage tolerance
  };

  console.log('📋 Liquidation bot configuration:');
  console.log(`   Monitored pools: ${config.monitoredPools.join(', ')}`);
  console.log(`   Liquidation threshold: ${config.liquidationThreshold} (${(config.liquidationThreshold * 100 - 100).toFixed(0)}% above maintenance margin)`);
  console.log(`   Min position size: ${config.minPositionSize} base asset`);
  console.log(`   Max gas per liquidation: $${config.maxGasPerLiquidation}`);
  console.log(`   Check interval: ${config.checkInterval}ms`);
  console.log(`   Max flash loan size: $${config.maxFlashLoanSize}`);
  console.log(`   Slippage tolerance: ${(config.slippageTolerance * 100).toFixed(2)}%\n`);

  console.log('💡 This is a template. To run:');
  console.log('   1. Initialize DeepBookTradingClient with your credentials');
  console.log('   2. Create a LiquidationBot instance with the client and config');
  console.log('   3. Call bot.start() to begin scanning for opportunities');
  console.log('   4. Monitor performance and adjust parameters as needed\n');

  console.log('⚡ How liquidation works:');
  console.log('   1. Monitor accounts for under-collateralized positions');
  console.log('   2. When collateral ratio falls below threshold, position is liquidatable');
  console.log('   3. Use flash loan to borrow required assets');
  console.log('   4. Execute liquidation to close the position');
  console.log('   5. Sell liquidated assets');
  console.log('   6. Repay flash loan + fee');
  console.log('   7. Keep liquidation bonus as profit\n');

  console.log('⚠️  Important considerations:');
  console.log('   • Liquidation requires careful risk assessment');
  console.log('   • Monitor gas costs and network congestion');
  console.log('   • Consider competition from other liquidation bots');
  console.log('   • Understand the specific protocol liquidation rules');
  console.log('   • Implement proper error handling and retry logic');
  console.log('   • Have circuit breakers for system failures\n');

  console.log('📊 Risk management strategies:');
  console.log('   • Diversify across multiple pools');
  console.log('   • Set position size limits');
  console.log('   • Implement dynamic gas price adjustments');
  console.log('   • Monitor overall system health');
  console.log('   • Have manual override capabilities\n');

  console.log('✅ Liquidation bot example completed');
}