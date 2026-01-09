// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Market maker template for automated market making strategies
 * This template provides a foundation for building market making bots
 */

import { DeepBookTradingClient } from '../src/index.js';
import type { SuiClient } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';

export interface MarketMakingConfig {
  poolKey: string;
  balanceManagerKey: string;
  spreadPercent: number; // Spread as percentage of mid price (e.g., 0.1 for 0.1%)
  orderSize: number; // Size per order in base asset (e.g., SUI)
  refreshInterval: number; // Milliseconds between order updates
  maxOrdersPerSide: number;
  minProfitThreshold: number; // Minimum profit threshold in quote asset
  maxPositionSize: number; // Maximum position size in base asset
}

export interface MarketMakerState {
  activeOrders: Array<{
    orderId: string;
    price: number;
    quantity: number;
    isBid: boolean;
    timestamp: number;
  }>;
  currentPosition: {
    baseBalance: number;
    quoteBalance: number;
    pnl: number;
  };
  lastUpdate: number;
}

export class MarketMakerBot {
  private state: MarketMakerState = {
    activeOrders: [],
    currentPosition: {
      baseBalance: 0,
      quoteBalance: 0,
      pnl: 0,
    },
    lastUpdate: 0,
  };

  constructor(
    private tradingClient: DeepBookTradingClient,
    private config: MarketMakingConfig
  ) {}

  /**
   * Start the market making bot
   */
  async start(): Promise<void> {
    console.log(`🚀 Starting market maker for pool: ${this.config.poolKey}`);
    console.log(`   Spread: ${this.config.spreadPercent}%`);
    console.log(`   Order size: ${this.config.orderSize} base asset`);
    console.log(`   Refresh interval: ${this.config.refreshInterval}ms`);

    // Initialize with current market data
    await this.initialize();

    // Main loop
    while (true) {
      try {
        await this.updateMarketMaking();
        await this.sleep(this.config.refreshInterval);
      } catch (error) {
        console.error('❌ Market maker error:', error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  /**
   * Initialize market maker with current market data
   */
  private async initialize(): Promise<void> {
    try {
      // Get current market data
      const orderBook = await this.tradingClient.queries.getOrderBook({
        poolKey: this.config.poolKey,
        depth: this.config.maxOrdersPerSide * 2,
      });

      // Get current account position
      const accountInfo = await this.tradingClient.queries.getAccountInfo({
        poolKey: this.config.poolKey,
        balanceManagerKey: this.config.balanceManagerKey,
      });

      // Update state
      this.state.currentPosition = {
        baseBalance: accountInfo.baseBalance,
        quoteBalance: accountInfo.quoteBalance,
        pnl: 0,
      };

      console.log('✅ Market maker initialized');
      console.log(`   Current position: ${this.state.currentPosition.baseBalance} base, ${this.state.currentPosition.quoteBalance} quote`);
      console.log(`   Mid price: ${orderBook.midPrice}`);

    } catch (error) {
      console.error('❌ Failed to initialize market maker:', error);
      throw error;
    }
  }

  /**
   * Update market making orders based on current market conditions
   */
  private async updateMarketMaking(): Promise<void> {
    // 1. Get current market data
    const orderBook = await this.tradingClient.queries.getOrderBook({
      poolKey: this.config.poolKey,
      depth: this.config.maxOrdersPerSide * 2,
    });

    const midPrice = orderBook.midPrice;
    const spreadAmount = midPrice * (this.config.spreadPercent / 100);

    // 2. Calculate bid and ask prices
    const bidPrice = midPrice - spreadAmount / 2;
    const askPrice = midPrice + spreadAmount / 2;

    console.log(`📊 Market update - Mid: ${midPrice.toFixed(6)}, Bid: ${bidPrice.toFixed(6)}, Ask: ${askPrice.toFixed(6)}`);

    // 3. Cancel old orders
    await this.cancelOldOrders();

    // 4. Check risk limits
    if (!this.checkRiskLimits()) {
      console.log('⚠️ Risk limits exceeded, pausing market making');
      return;
    }

    // 5. Place new orders
    await this.placeBidOrder(bidPrice);
    await this.placeAskOrder(askPrice);

    // 6. Update state
    this.state.lastUpdate = Date.now();
  }

  /**
   * Place bid (buy) order
   */
  private async placeBidOrder(price: number): Promise<void> {
    try {
      const tx = await this.tradingClient.trading.placeLimitOrder({
        poolKey: this.config.poolKey,
        balanceManagerKey: this.config.balanceManagerKey,
        price,
        quantity: this.config.orderSize,
        isBid: true,
        clientOrderId: `mm_bid_${Date.now()}`,
        orderType: 'limit',
        expiration: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      });

      // In a real implementation, you would sign and execute the transaction
      console.log(`📈 Placed bid order at ${price.toFixed(6)} for ${this.config.orderSize} base asset`);

      // Record order in state
      this.state.activeOrders.push({
        orderId: `mm_bid_${Date.now()}`,
        price,
        quantity: this.config.orderSize,
        isBid: true,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('❌ Failed to place bid order:', error);
    }
  }

  /**
   * Place ask (sell) order
   */
  private async placeAskOrder(price: number): Promise<void> {
    try {
      const tx = await this.tradingClient.trading.placeLimitOrder({
        poolKey: this.config.poolKey,
        balanceManagerKey: this.config.balanceManagerKey,
        price,
        quantity: this.config.orderSize,
        isBid: false,
        clientOrderId: `mm_ask_${Date.now()}`,
        orderType: 'limit',
        expiration: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      });

      console.log(`📉 Placed ask order at ${price.toFixed(6)} for ${this.config.orderSize} base asset`);

      // Record order in state
      this.state.activeOrders.push({
        orderId: `mm_ask_${Date.now()}`,
        price,
        quantity: this.config.orderSize,
        isBid: false,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('❌ Failed to place ask order:', error);
    }
  }

  /**
   * Cancel old orders
   */
  private async cancelOldOrders(): Promise<void> {
    const now = Date.now();
    const ordersToCancel = this.state.activeOrders.filter(
      order => now - order.timestamp > this.config.refreshInterval * 2
    );

    for (const order of ordersToCancel) {
      try {
        // In a real implementation, you would execute cancel transaction
        console.log(`🗑️  Canceling old order: ${order.orderId}`);

        // Remove from active orders
        this.state.activeOrders = this.state.activeOrders.filter(
          o => o.orderId !== order.orderId
        );
      } catch (error) {
        console.error(`❌ Failed to cancel order ${order.orderId}:`, error);
      }
    }
  }

  /**
   * Check risk limits
   */
  private checkRiskLimits(): boolean {
    // Check position size limit
    if (Math.abs(this.state.currentPosition.baseBalance) > this.config.maxPositionSize) {
      console.log(`⚠️  Position size limit exceeded: ${this.state.currentPosition.baseBalance} > ${this.config.maxPositionSize}`);
      return false;
    }

    // Check profit threshold
    if (this.state.currentPosition.pnl < -this.config.minProfitThreshold) {
      console.log(`⚠️  Loss threshold exceeded: PnL = ${this.state.currentPosition.pnl}`);
      return false;
    }

    return true;
  }

  /**
   * Calculate current PnL
   */
  private async calculatePnL(): Promise<number> {
    try {
      // Get current market price
      const orderBook = await this.tradingClient.queries.getOrderBook({
        poolKey: this.config.poolKey,
        depth: 1,
      });

      const currentPrice = orderBook.midPrice;
      const positionValue = this.state.currentPosition.baseBalance * currentPrice;
      const totalValue = positionValue + this.state.currentPosition.quoteBalance;

      // Simple PnL calculation
      // In a real implementation, you would track entry prices and calculate realized/unrealized PnL
      return totalValue;

    } catch (error) {
      console.error('❌ Failed to calculate PnL:', error);
      return 0;
    }
  }

  /**
   * Stop the market maker
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping market maker...');

    // Cancel all active orders
    for (const order of this.state.activeOrders) {
      try {
        console.log(`🗑️  Canceling order: ${order.orderId}`);
        // Cancel order implementation would go here
      } catch (error) {
        console.error(`❌ Failed to cancel order ${order.orderId}:`, error);
      }
    }

    // Clear state
    this.state.activeOrders = [];
    console.log('✅ Market maker stopped');
  }

  /**
   * Get current state
   */
  getState(): MarketMakerState {
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
 * Example usage of the market maker template
 */
export async function runMarketMakerExample(): Promise<void> {
  console.log('🏃‍♂️ Running market maker example...\n');

  // Configuration
  const config: MarketMakingConfig = {
    poolKey: 'SUI_DBUSDC',
    balanceManagerKey: 'main-balance-manager',
    spreadPercent: 0.1, // 0.1% spread
    orderSize: 10, // 10 SUI per order
    refreshInterval: 30000, // 30 seconds
    maxOrdersPerSide: 3,
    minProfitThreshold: 10, // $10 minimum profit
    maxPositionSize: 1000, // Max 1000 SUI position
  };

  console.log('📋 Market maker configuration:');
  console.log(`   Pool: ${config.poolKey}`);
  console.log(`   Spread: ${config.spreadPercent}%`);
  console.log(`   Order size: ${config.orderSize} SUI`);
  console.log(`   Refresh interval: ${config.refreshInterval}ms`);
  console.log(`   Max orders per side: ${config.maxOrdersPerSide}`);
  console.log(`   Min profit threshold: $${config.minProfitThreshold}`);
  console.log(`   Max position size: ${config.maxPositionSize} SUI\n`);

  console.log('💡 This is a template. To run:');
  console.log('   1. Initialize DeepBookTradingClient with your credentials');
  console.log('   2. Create a MarketMakerBot instance with the client and config');
  console.log('   3. Call bot.start() to begin market making');
  console.log('   4. Monitor performance and adjust parameters as needed\n');

  console.log('⚠️  Important considerations:');
  console.log('   • Test with small amounts first');
  console.log('   • Monitor gas costs and network conditions');
  console.log('   • Implement proper risk management');
  console.log('   • Consider market volatility and liquidity');
  console.log('   • Have a stop-loss mechanism in place\n');

  console.log('✅ Market maker example completed');
}