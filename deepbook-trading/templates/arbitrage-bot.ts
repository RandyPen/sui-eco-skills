// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Arbitrage bot template for flash loan based arbitrage strategies
 * This template provides a foundation for building arbitrage bots
 */

import { DeepBookTradingClient } from '../src/index.js';
import type { SuiClient } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';

export interface ArbitrageOpportunity {
  poolA: string;
  poolB: string;
  priceA: number; // Price in pool A (quote per base)
  priceB: number; // Price in pool B (quote per base)
  priceDifference: number;
  priceDifferencePercent: number;
  estimatedProfit: number;
  minProfitThreshold: number;
  liquidityAvailable: boolean;
}

export interface ArbitrageConfig {
  monitoredPools: string[];
  minProfitThreshold: number; // Minimum profit in quote asset (e.g., USDC)
  maxFlashLoanSize: number; // Maximum flash loan amount
  gasBuffer: number; // Gas buffer for transaction costs
  checkInterval: number; // Milliseconds between opportunity checks
  maxPositionSize: number; // Maximum position size per trade
  slippageTolerance: number; // Slippage tolerance as decimal (e.g., 0.001 for 0.1%)
}

export interface ArbitrageBotState {
  lastCheck: number;
  opportunitiesFound: number;
  tradesExecuted: number;
  totalProfit: number;
  activePositions: Array<{
    opportunity: ArbitrageOpportunity;
    timestamp: number;
    amount: number;
  }>;
}

export class ArbitrageBot {
  private state: ArbitrageBotState = {
    lastCheck: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalProfit: 0,
    activePositions: [],
  };

  constructor(
    private tradingClient: DeepBookTradingClient,
    private config: ArbitrageConfig
  ) {}

  /**
   * Start the arbitrage bot
   */
  async start(): Promise<void> {
    console.log('🚀 Starting arbitrage bot');
    console.log(`   Monitored pools: ${this.config.monitoredPools.length}`);
    console.log(`   Min profit threshold: $${this.config.minProfitThreshold}`);
    console.log(`   Max flash loan size: $${this.config.maxFlashLoanSize}`);
    console.log(`   Check interval: ${this.config.checkInterval}ms`);

    // Main loop
    while (true) {
      try {
        await this.checkArbitrageOpportunities();
        await this.sleep(this.config.checkInterval);
      } catch (error) {
        console.error('❌ Arbitrage bot error:', error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  /**
   * Check for arbitrage opportunities across monitored pools
   */
  private async checkArbitrageOpportunities(): Promise<void> {
    console.log('🔍 Scanning for arbitrage opportunities...');

    // Get market data for all monitored pools
    const marketData = await this.getMarketData();

    // Find arbitrage opportunities
    const opportunities = this.findArbitrageOpportunities(marketData);

    // Execute profitable opportunities
    for (const opportunity of opportunities) {
      if (opportunity.estimatedProfit > opportunity.minProfitThreshold) {
        console.log(`💰 Found profitable opportunity: ${opportunity.poolA} ↔ ${opportunity.poolB}`);
        console.log(`   Price difference: ${opportunity.priceDifferencePercent.toFixed(4)}%`);
        console.log(`   Estimated profit: $${opportunity.estimatedProfit.toFixed(4)}`);

        await this.executeArbitrage(opportunity);
      }
    }

    this.state.lastCheck = Date.now();
  }

  /**
   * Get market data for all monitored pools
   */
  private async getMarketData(): Promise<Record<string, { midPrice: number; liquidity: number }>> {
    const marketData: Record<string, { midPrice: number; liquidity: number }> = {};

    for (const poolKey of this.config.monitoredPools) {
      try {
        const orderBook = await this.tradingClient.queries.getOrderBook({
          poolKey,
          depth: 10,
        });

        // Calculate available liquidity (sum of top 10 levels)
        const bidLiquidity = orderBook.bids.slice(0, 10).reduce((sum, bid) => sum + bid.quantity, 0);
        const askLiquidity = orderBook.asks.slice(0, 10).reduce((sum, ask) => sum + ask.quantity, 0);

        marketData[poolKey] = {
          midPrice: orderBook.midPrice,
          liquidity: Math.min(bidLiquidity, askLiquidity),
        };

        console.log(`   ${poolKey}: ${orderBook.midPrice.toFixed(6)} (liquidity: ${marketData[poolKey].liquidity.toFixed(2)})`);

      } catch (error) {
        console.error(`❌ Failed to get market data for ${poolKey}:`, error);
        marketData[poolKey] = { midPrice: 0, liquidity: 0 };
      }
    }

    return marketData;
  }

  /**
   * Find arbitrage opportunities from market data
   */
  private findArbitrageOpportunities(
    marketData: Record<string, { midPrice: number; liquidity: number }>
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const poolKeys = Object.keys(marketData);

    // Compare all pairs of pools
    for (let i = 0; i < poolKeys.length; i++) {
      for (let j = i + 1; j < poolKeys.length; j++) {
        const poolA = poolKeys[i];
        const poolB = poolKeys[j];

        const dataA = marketData[poolA];
        const dataB = marketData[poolB];

        if (dataA.midPrice === 0 || dataB.midPrice === 0) {
          continue;
        }

        const priceDifference = Math.abs(dataA.midPrice - dataB.midPrice);
        const priceDifferencePercent = (priceDifference / Math.min(dataA.midPrice, dataB.midPrice)) * 100;

        // Check if there's sufficient liquidity in both pools
        const minLiquidity = Math.min(dataA.liquidity, dataB.liquidity);
        const tradeAmount = Math.min(minLiquidity, this.config.maxPositionSize);

        // Calculate estimated profit
        const estimatedProfit = this.calculateEstimatedProfit(
          poolA,
          poolB,
          dataA.midPrice,
          dataB.midPrice,
          tradeAmount
        );

        // Account for gas and flash loan fees
        const netProfit = estimatedProfit - this.config.gasBuffer;
        const minProfitThreshold = this.config.minProfitThreshold;

        opportunities.push({
          poolA,
          poolB,
          priceA: dataA.midPrice,
          priceB: dataB.midPrice,
          priceDifference,
          priceDifferencePercent,
          estimatedProfit: netProfit,
          minProfitThreshold,
          liquidityAvailable: tradeAmount > 0,
        });
      }
    }

    // Sort by profit potential
    opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    return opportunities;
  }

  /**
   * Calculate estimated profit for an arbitrage opportunity
   */
  private calculateEstimatedProfit(
    poolA: string,
    poolB: string,
    priceA: number,
    priceB: number,
    amount: number
  ): number {
    // Determine which pool has lower price (buy there)
    // and which has higher price (sell there)
    const buyPool = priceA < priceB ? poolA : poolB;
    const sellPool = priceA < priceB ? poolB : poolA;
    const buyPrice = Math.min(priceA, priceB);
    const sellPrice = Math.max(priceA, priceB);

    // Simple arbitrage calculation:
    // 1. Buy at lower price
    // 2. Sell at higher price
    // 3. Account for fees and slippage

    const buyCost = amount * buyPrice;
    const sellProceeds = amount * sellPrice * (1 - this.config.slippageTolerance);

    // Flash loan fee (estimate 0.05%)
    const flashLoanFee = buyCost * 0.0005;

    // Trading fees (estimate 0.1% per trade)
    const tradingFees = (buyCost + sellProceeds) * 0.001;

    const profit = sellProceeds - buyCost - flashLoanFee - tradingFees;

    return profit;
  }

  /**
   * Execute arbitrage trade using flash loan
   */
  private async executeArbitrage(opportunity: ArbitrageOpportunity): Promise<void> {
    try {
      console.log(`⚡ Executing arbitrage: ${opportunity.poolA} ↔ ${opportunity.poolB}`);

      // Determine trade amount (limited by available liquidity and max position size)
      const tradeAmount = Math.min(
        this.config.maxPositionSize,
        this.config.maxFlashLoanSize / opportunity.priceA
      );

      if (tradeAmount <= 0) {
        console.log('⚠️  Trade amount too small, skipping');
        return;
      }

      // Determine which pool to buy from and which to sell to
      const buyPool = opportunity.priceA < opportunity.priceB ? opportunity.poolA : opportunity.poolB;
      const sellPool = opportunity.priceA < opportunity.priceB ? opportunity.poolB : opportunity.poolA;
      const isBaseAsset = true; // Assuming we're trading base asset (e.g., SUI)

      console.log(`   Buy from ${buyPool} at ${Math.min(opportunity.priceA, opportunity.priceB).toFixed(6)}`);
      console.log(`   Sell to ${sellPool} at ${Math.max(opportunity.priceA, opportunity.priceB).toFixed(6)}`);
      console.log(`   Trade amount: ${tradeAmount.toFixed(4)} base asset`);

      // Create flash loan arbitrage transaction
      const tx = await this.tradingClient.flashLoans.createFlashLoanArbitrage({
        borrowPoolKey: buyPool,
        tradePoolKey: sellPool,
        borrowAmount: tradeAmount * Math.min(opportunity.priceA, opportunity.priceB),
        tradeAmount,
        isBaseAsset,
      });

      // In a real implementation, you would:
      // 1. Sign the transaction
      // 2. Execute it
      // 3. Wait for confirmation
      // 4. Check results

      console.log('✅ Arbitrage transaction created successfully');

      // Update state
      this.state.tradesExecuted++;
      this.state.totalProfit += opportunity.estimatedProfit;

      // Record position
      this.state.activePositions.push({
        opportunity,
        timestamp: Date.now(),
        amount: tradeAmount,
      });

      // Clean up old positions
      this.cleanupOldPositions();

    } catch (error) {
      console.error('❌ Failed to execute arbitrage:', error);
      // Implement retry logic or skip this opportunity
    }
  }

  /**
   * Clean up old positions from state
   */
  private cleanupOldPositions(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.state.activePositions = this.state.activePositions.filter(
      position => position.timestamp > oneHourAgo
    );
  }

  /**
   * Stop the arbitrage bot
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping arbitrage bot...');
    console.log(`   Trades executed: ${this.state.tradesExecuted}`);
    console.log(`   Total profit: $${this.state.totalProfit.toFixed(2)}`);
    console.log('✅ Arbitrage bot stopped');
  }

  /**
   * Get current state
   */
  getState(): ArbitrageBotState {
    return { ...this.state };
  }

  /**
   * Sleep helper function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example usage of the arbitrage bot template
 */
export async function runArbitrageBotExample(): Promise<void> {
  console.log('🏃‍♂️ Running arbitrage bot example...\n');

  // Configuration
  const config: ArbitrageConfig = {
    monitoredPools: ['SUI_DBUSDC_A', 'SUI_DBUSDC_B', 'SUI_USDC'],
    minProfitThreshold: 5, // $5 minimum profit
    maxFlashLoanSize: 10000, // $10,000 max flash loan
    gasBuffer: 0.5, // $0.5 gas buffer
    checkInterval: 10000, // 10 seconds
    maxPositionSize: 1000, // Max 1000 SUI per trade
    slippageTolerance: 0.001, // 0.1% slippage tolerance
  };

  console.log('📋 Arbitrage bot configuration:');
  console.log(`   Monitored pools: ${config.monitoredPools.join(', ')}`);
  console.log(`   Min profit threshold: $${config.minProfitThreshold}`);
  console.log(`   Max flash loan size: $${config.maxFlashLoanSize}`);
  console.log(`   Gas buffer: $${config.gasBuffer}`);
  console.log(`   Check interval: ${config.checkInterval}ms`);
  console.log(`   Max position size: ${config.maxPositionSize} SUI`);
  console.log(`   Slippage tolerance: ${(config.slippageTolerance * 100).toFixed(2)}%\n`);

  console.log('💡 This is a template. To run:');
  console.log('   1. Initialize DeepBookTradingClient with your credentials');
  console.log('   2. Create an ArbitrageBot instance with the client and config');
  console.log('   3. Call bot.start() to begin scanning for opportunities');
  console.log('   4. Monitor performance and adjust parameters as needed\n');

  console.log('⚡ How flash loan arbitrage works:');
  console.log('   1. Borrow asset A from flash loan pool');
  console.log('   2. Swap A for B in pool with better price');
  console.log('   3. Swap B back to A in original pool');
  console.log('   4. Return borrowed A + fee to flash loan pool');
  console.log('   5. Keep the profit\n');

  console.log('⚠️  Important considerations:');
  console.log('   • Flash loans require careful risk management');
  console.log('   • Monitor gas costs and network congestion');
  console.log('   • Consider front-running and MEV risks');
  console.log('   • Test with small amounts first');
  console.log('   • Have circuit breakers for large losses\n');

  console.log('📊 Opportunity detection logic:');
  console.log('   • Continuously monitor multiple pools');
  console.log('   • Calculate price differences across pools');
  console.log('   • Check liquidity availability');
  console.log('   • Account for fees, gas, and slippage');
  console.log('   • Execute only profitable opportunities\n');

  console.log('✅ Arbitrage bot example completed');
}