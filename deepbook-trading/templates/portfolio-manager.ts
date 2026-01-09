// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Portfolio manager template for managing positions across multiple pools
 * This template provides a foundation for building portfolio management systems
 */

import { DeepBookTradingClient } from '../src/index.js';
import type { SuiClient } from '@mysten/sui/client';

export interface PoolAllocation {
  poolKey: string;
  targetAllocation: number; // Target allocation percentage (0-100)
  currentAllocation: number; // Current allocation percentage
  positionSize: number; // Current position size in base asset
  positionValue: number; // Current position value in quote asset
  avgEntryPrice: number; // Average entry price
  unrealizedPnL: number; // Unrealized profit/loss
  realizedPnL: number; // Realized profit/loss
}

export interface PortfolioConfig {
  pools: Array<{
    key: string;
    name: string;
    maxAllocation: number; // Maximum allocation percentage
    minAllocation: number; // Minimum allocation percentage
    rebalanceThreshold: number; // Rebalance when deviation exceeds this percentage
    stopLossPercent?: number; // Stop loss percentage (optional)
    takeProfitPercent?: number; // Take profit percentage (optional)
  }>;
  totalPortfolioValue: number; // Total portfolio value in quote asset
  rebalanceInterval: number; // Milliseconds between rebalance checks
  maxSlippage: number; // Maximum slippage for trades
  gasBudgetPerTrade: number; // Gas budget per trade
}

export interface PortfolioState {
  allocations: Record<string, PoolAllocation>; // Pool key -> allocation
  totalValue: number;
  totalPnL: number;
  lastRebalance: number;
  rebalanceCount: number;
  tradeHistory: Array<{
    timestamp: number;
    poolKey: string;
    type: 'buy' | 'sell' | 'rebalance';
    amount: number;
    price: number;
    value: number;
  }>;
}

export class PortfolioManager {
  private state: PortfolioState = {
    allocations: {},
    totalValue: 0,
    totalPnL: 0,
    lastRebalance: 0,
    rebalanceCount: 0,
    tradeHistory: [],
  };

  constructor(
    private tradingClient: DeepBookTradingClient,
    private config: PortfolioConfig
  ) {
    // Initialize allocations
    this.initializeAllocations();
  }

  /**
   * Start the portfolio manager
   */
  async start(): Promise<void> {
    console.log('🚀 Starting portfolio manager');
    console.log(`   Managing ${this.config.pools.length} pools`);
    console.log(`   Total portfolio value: $${this.config.totalPortfolioValue.toFixed(2)}`);
    console.log(`   Rebalance interval: ${this.config.rebalanceInterval}ms`);

    // Main loop
    while (true) {
      try {
        await this.updatePortfolioValues();
        await this.checkRebalanceNeeded();
        await this.checkStopLossTakeProfit();
        await this.sleep(this.config.rebalanceInterval);
      } catch (error) {
        console.error('❌ Portfolio manager error:', error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  /**
   * Initialize portfolio allocations
   */
  private initializeAllocations(): void {
    for (const pool of this.config.pools) {
      this.state.allocations[pool.key] = {
        poolKey: pool.key,
        targetAllocation: (pool.maxAllocation + pool.minAllocation) / 2,
        currentAllocation: 0,
        positionSize: 0,
        positionValue: 0,
        avgEntryPrice: 0,
        unrealizedPnL: 0,
        realizedPnL: 0,
      };
    }
  }

  /**
   * Update portfolio values based on current market prices
   */
  private async updatePortfolioValues(): Promise<void> {
    console.log('📊 Updating portfolio values...');

    let totalValue = 0;

    for (const pool of this.config.pools) {
      try {
        const allocation = this.state.allocations[pool.key];

        if (allocation.positionSize === 0) {
          // No position in this pool
          allocation.currentAllocation = 0;
          allocation.positionValue = 0;
          allocation.unrealizedPnL = 0;
          continue;
        }

        // Get current market price
        const orderBook = await this.tradingClient.queries.getOrderBook({
          poolKey: pool.key,
          depth: 1,
        });

        const currentPrice = orderBook.midPrice;
        const positionValue = allocation.positionSize * currentPrice;

        // Calculate unrealized PnL
        const unrealizedPnL = allocation.avgEntryPrice > 0
          ? (currentPrice - allocation.avgEntryPrice) * allocation.positionSize
          : 0;

        // Update allocation
        allocation.positionValue = positionValue;
        allocation.unrealizedPnL = unrealizedPnL;

        totalValue += positionValue;

        console.log(`   ${pool.key}: ${allocation.positionSize.toFixed(4)} @ $${currentPrice.toFixed(6)} = $${positionValue.toFixed(2)} (PnL: $${unrealizedPnL.toFixed(2)})`);

      } catch (error) {
        console.error(`❌ Failed to update values for ${pool.key}:`, error);
      }
    }

    // Update total value and allocations
    this.state.totalValue = totalValue;

    for (const pool of this.config.pools) {
      const allocation = this.state.allocations[pool.key];
      allocation.currentAllocation = totalValue > 0
        ? (allocation.positionValue / totalValue) * 100
        : 0;
    }

    console.log(`   Total portfolio value: $${totalValue.toFixed(2)}`);
  }

  /**
   * Check if rebalancing is needed
   */
  private async checkRebalanceNeeded(): Promise<void> {
    const now = Date.now();

    // Check if enough time has passed since last rebalance
    if (now - this.state.lastRebalance < this.config.rebalanceInterval) {
      return;
    }

    console.log('⚖️  Checking rebalancing needs...');

    let rebalanceNeeded = false;
    const rebalanceActions: Array<{
      poolKey: string;
      type: 'buy' | 'sell';
      amount: number;
      targetValue: number;
      currentValue: number;
    }> = [];

    for (const pool of this.config.pools) {
      const allocation = this.state.allocations[pool.key];
      const targetValue = (allocation.targetAllocation / 100) * this.state.totalValue;
      const deviation = Math.abs(allocation.positionValue - targetValue);
      const deviationPercent = targetValue > 0 ? (deviation / targetValue) * 100 : 100;

      if (deviationPercent > pool.rebalanceThreshold) {
        rebalanceNeeded = true;

        const actionType = allocation.positionValue < targetValue ? 'buy' : 'sell';
        const amount = Math.abs(allocation.positionValue - targetValue);

        rebalanceActions.push({
          poolKey: pool.key,
          type: actionType,
          amount,
          targetValue,
          currentValue: allocation.positionValue,
        });

        console.log(`   ${pool.key}: ${deviationPercent.toFixed(2)}% deviation (${actionType} $${amount.toFixed(2)})`);
      }
    }

    if (rebalanceNeeded) {
      console.log('🔄 Rebalancing portfolio...');
      await this.executeRebalance(rebalanceActions);
    } else {
      console.log('✅ Portfolio is balanced');
    }
  }

  /**
   * Execute rebalancing trades
   */
  private async executeRebalance(actions: Array<{ poolKey: string; type: 'buy' | 'sell'; amount: number }>): Promise<void> {
    for (const action of actions) {
      try {
        // Get current market price
        const orderBook = await this.tradingClient.queries.getOrderBook({
          poolKey: action.poolKey,
          depth: 5,
        });

        const currentPrice = orderBook.midPrice;
        const baseAmount = action.amount / currentPrice;

        console.log(`   ${action.type.toUpperCase()} ${baseAmount.toFixed(4)} ${action.poolKey} at $${currentPrice.toFixed(6)}`);

        if (action.type === 'buy') {
          await this.executeBuy(action.poolKey, baseAmount, currentPrice);
        } else {
          await this.executeSell(action.poolKey, baseAmount, currentPrice);
        }

        // Record trade in history
        this.state.tradeHistory.push({
          timestamp: Date.now(),
          poolKey: action.poolKey,
          type: action.type,
          amount: baseAmount,
          price: currentPrice,
          value: action.amount,
        });

      } catch (error) {
        console.error(`❌ Failed to execute ${action.type} for ${action.poolKey}:`, error);
      }
    }

    this.state.lastRebalance = Date.now();
    this.state.rebalanceCount++;
    console.log('✅ Rebalancing completed');
  }

  /**
   * Execute buy trade
   */
  private async executeBuy(poolKey: string, amount: number, price: number): Promise<void> {
    // In a real implementation, you would:
    // 1. Create and execute a buy transaction
    // 2. Update portfolio state
    // 3. Handle errors and retries

    const allocation = this.state.allocations[poolKey];
    const totalCost = amount * price;

    // Update average entry price
    if (allocation.positionSize > 0) {
      allocation.avgEntryPrice = (
        (allocation.avgEntryPrice * allocation.positionSize) +
        (price * amount)
      ) / (allocation.positionSize + amount);
    } else {
      allocation.avgEntryPrice = price;
    }

    // Update position size
    allocation.positionSize += amount;

    console.log(`   ↳ Bought ${amount.toFixed(4)} at $${price.toFixed(6)} (cost: $${totalCost.toFixed(2)})`);
  }

  /**
   * Execute sell trade
   */
  private async executeSell(poolKey: string, amount: number, price: number): Promise<void> {
    const allocation = this.state.allocations[poolKey];

    if (allocation.positionSize < amount) {
      console.log(`⚠️  Insufficient position: ${allocation.positionSize} < ${amount}`);
      return;
    }

    const saleValue = amount * price;
    const costBasis = allocation.avgEntryPrice * amount;
    const realizedPnL = saleValue - costBasis;

    // Update position
    allocation.positionSize -= amount;
    allocation.realizedPnL += realizedPnL;
    this.state.totalPnL += realizedPnL;

    console.log(`   ↳ Sold ${amount.toFixed(4)} at $${price.toFixed(6)} (value: $${saleValue.toFixed(2)}, PnL: $${realizedPnL.toFixed(2)})`);
  }

  /**
   * Check stop loss and take profit levels
   */
  private async checkStopLossTakeProfit(): Promise<void> {
    for (const pool of this.config.pools) {
      const allocation = this.state.allocations[pool.key];

      if (allocation.positionSize === 0 || allocation.avgEntryPrice === 0) {
        continue;
      }

      // Get current market price
      const orderBook = await this.tradingClient.queries.getOrderBook({
        poolKey: pool.key,
        depth: 1,
      });

      const currentPrice = orderBook.midPrice;
      const priceChangePercent = ((currentPrice - allocation.avgEntryPrice) / allocation.avgEntryPrice) * 100;

      // Check stop loss
      if (pool.stopLossPercent && priceChangePercent < -pool.stopLossPercent) {
        console.log(`🛑 Stop loss triggered for ${pool.key}: ${priceChangePercent.toFixed(2)}% < -${pool.stopLossPercent}%`);
        await this.executeSell(pool.key, allocation.positionSize, currentPrice);
      }

      // Check take profit
      if (pool.takeProfitPercent && priceChangePercent > pool.takeProfitPercent) {
        console.log(`🎯 Take profit triggered for ${pool.key}: ${priceChangePercent.toFixed(2)}% > ${pool.takeProfitPercent}%`);
        await this.executeSell(pool.key, allocation.positionSize / 2, currentPrice); // Sell half
      }
    }
  }

  /**
   * Get portfolio performance report
   */
  generateReport(): string {
    let report = `# Portfolio Performance Report\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += `## Summary\n`;
    report += `- Total Value: $${this.state.totalValue.toFixed(2)}\n`;
    report += `- Total PnL: $${this.state.totalPnL.toFixed(2)}\n`;
    report += `- Rebalance Count: ${this.state.rebalanceCount}\n`;
    report += `- Last Rebalance: ${new Date(this.state.lastRebalance).toLocaleString()}\n\n`;

    report += `## Allocations\n`;
    report += `| Pool | Target % | Current % | Position | Value | PnL |\n`;
    report += `|------|----------|-----------|----------|-------|-----|\n`;

    for (const pool of this.config.pools) {
      const allocation = this.state.allocations[pool.key];
      report += `| ${pool.key} | ${allocation.targetAllocation.toFixed(2)}% | ${allocation.currentAllocation.toFixed(2)}% | ${allocation.positionSize.toFixed(4)} | $${allocation.positionValue.toFixed(2)} | $${allocation.unrealizedPnL.toFixed(2)} |\n`;
    }

    report += `\n## Recent Trades (Last 10)\n`;
    const recentTrades = this.state.tradeHistory.slice(-10).reverse();

    if (recentTrades.length > 0) {
      report += `| Time | Pool | Type | Amount | Price | Value |\n`;
      report += `|------|------|------|--------|-------|-------|\n`;

      for (const trade of recentTrades) {
        const time = new Date(trade.timestamp).toLocaleTimeString();
        report += `| ${time} | ${trade.poolKey} | ${trade.type} | ${trade.amount.toFixed(4)} | $${trade.price.toFixed(6)} | $${trade.value.toFixed(2)} |\n`;
      }
    } else {
      report += `No recent trades.\n`;
    }

    return report;
  }

  /**
   * Get portfolio state
   */
  getState(): PortfolioState {
    return { ...this.state };
  }

  /**
   * Get allocation for a specific pool
   */
  getAllocation(poolKey: string): PoolAllocation | undefined {
    return this.state.allocations[poolKey];
  }

  /**
   * Update target allocation for a pool
   */
  updateTargetAllocation(poolKey: string, targetAllocation: number): void {
    const allocation = this.state.allocations[poolKey];
    if (allocation) {
      allocation.targetAllocation = targetAllocation;
      console.log(`📝 Updated target allocation for ${poolKey}: ${targetAllocation}%`);
    }
  }

  /**
   * Stop the portfolio manager
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping portfolio manager...');
    console.log(`   Final portfolio value: $${this.state.totalValue.toFixed(2)}`);
    console.log(`   Total PnL: $${this.state.totalPnL.toFixed(2)}`);
    console.log(`   Rebalance count: ${this.state.rebalanceCount}`);
    console.log(`   Total trades: ${this.state.tradeHistory.length}`);
    console.log('✅ Portfolio manager stopped');
  }

  /**
   * Sleep helper function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example usage of the portfolio manager template
 */
export async function runPortfolioManagerExample(): Promise<void> {
  console.log('🏃‍♂️ Running portfolio manager example...\n');

  // Configuration
  const config: PortfolioConfig = {
    pools: [
      {
        key: 'SUI_DBUSDC',
        name: 'SUI/USDC Pool',
        maxAllocation: 40,
        minAllocation: 20,
        rebalanceThreshold: 5, // Rebalance when allocation deviates by 5%
        stopLossPercent: 10, // Stop loss at 10% loss
        takeProfitPercent: 20, // Take profit at 20% gain
      },
      {
        key: 'SUI_USDT',
        name: 'SUI/USDT Pool',
        maxAllocation: 35,
        minAllocation: 15,
        rebalanceThreshold: 5,
        stopLossPercent: 10,
        takeProfitPercent: 20,
      },
      {
        key: 'SUI_USDC',
        name: 'SUI/USDC Pool (Alternate)',
        maxAllocation: 30,
        minAllocation: 10,
        rebalanceThreshold: 5,
        stopLossPercent: 10,
        takeProfitPercent: 20,
      },
    ],
    totalPortfolioValue: 10000, // $10,000 portfolio
    rebalanceInterval: 300000, // 5 minutes
    maxSlippage: 0.005, // 0.5% max slippage
    gasBudgetPerTrade: 0.1, // $0.1 gas per trade
  };

  console.log('📋 Portfolio manager configuration:');
  console.log(`   Total portfolio value: $${config.totalPortfolioValue}`);
  console.log(`   Number of pools: ${config.pools.length}`);
  console.log(`   Rebalance interval: ${config.rebalanceInterval}ms`);
  console.log(`   Max slippage: ${(config.maxSlippage * 100).toFixed(2)}%`);
  console.log(`   Gas budget per trade: $${config.gasBudgetPerTrade}\n`);

  console.log('Pool allocations:');
  for (const pool of config.pools) {
    const targetAlloc = (pool.maxAllocation + pool.minAllocation) / 2;
    console.log(`   ${pool.key}: ${targetAlloc.toFixed(1)}% target (${pool.minAllocation}-${pool.maxAllocation}% range)`);
  }
  console.log();

  console.log('💡 This is a template. To run:');
  console.log('   1. Initialize DeepBookTradingClient with your credentials');
  console.log('   2. Create a PortfolioManager instance with the client and config');
  console.log('   3. Call manager.start() to begin portfolio management');
  console.log('   4. Use manager.generateReport() to get performance reports');
  console.log('   5. Use manager.getState() to monitor portfolio state\n');

  console.log('📊 Portfolio management features:');
  console.log('   • Automated rebalancing based on target allocations');
  console.log('   • Real-time position valuation and PnL tracking');
  console.log('   • Stop loss and take profit automation');
  console.log('   • Trade history and performance reporting');
  console.log('   • Multi-pool diversification management');
  console.log('   • Slippage and gas cost optimization\n');

  console.log('⚖️  Rebalancing strategy:');
  console.log('   1. Monitor allocation deviations from targets');
  console.log('   2. Execute trades to bring allocations back to target');
  console.log('   3. Consider transaction costs and market impact');
  console.log('   4. Implement gradual rebalancing for large portfolios\n');

  console.log('⚠️  Important considerations:');
  console.log('   • Start with small portfolio sizes for testing');
  console.log('   • Monitor gas costs and adjust trade sizes accordingly');
  console.log('   • Consider market liquidity when rebalancing');
  console.log('   • Implement proper risk management for stop losses');
  console.log('   • Regularly review and adjust target allocations\n');

  console.log('✅ Portfolio manager example completed');
}