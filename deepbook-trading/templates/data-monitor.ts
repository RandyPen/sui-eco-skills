// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Data monitor template for real-time market data monitoring
 * This template provides a foundation for building data monitoring systems
 */

import { DeepBookTradingClient } from '../src/index.js';
import type { SuiClient } from '@mysten/sui/client';

export interface MonitorConfig {
  pools: Array<{
    key: string;
    name: string;
    alertThresholds: {
      spreadPercent: number;
      volumeChangePercent: number;
      priceChangePercent: number;
      liquidityDropPercent: number;
    };
  }>;
  checkInterval: number; // Milliseconds between checks
  historySize: number; // Number of data points to keep in history
  alertWebhook?: string; // Optional webhook for alerts
}

export interface MarketDataPoint {
  timestamp: number;
  poolKey: string;
  midPrice: number;
  spreadPercent: number;
  bidDepth: number;
  askDepth: number;
  volume24h?: number;
  totalValueLocked?: number;
}

export interface Alert {
  id: string;
  timestamp: number;
  poolKey: string;
  type: 'spread' | 'volume' | 'price' | 'liquidity' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: Record<string, any>;
  acknowledged: boolean;
}

export interface MonitorState {
  history: Record<string, MarketDataPoint[]>; // Pool key -> data points
  alerts: Alert[];
  lastCheck: number;
  totalChecks: number;
}

export class DataMonitor {
  private state: MonitorState = {
    history: {},
    alerts: [],
    lastCheck: 0,
    totalChecks: 0,
  };

  constructor(
    private tradingClient: DeepBookTradingClient,
    private config: MonitorConfig
  ) {
    // Initialize history for each pool
    for (const pool of config.pools) {
      this.state.history[pool.key] = [];
    }
  }

  /**
   * Start the data monitor
   */
  async start(): Promise<void> {
    console.log('🚀 Starting data monitor');
    console.log(`   Monitoring ${this.config.pools.length} pools`);
    console.log(`   Check interval: ${this.config.checkInterval}ms`);
    console.log(`   History size: ${this.config.historySize} data points per pool`);

    // Main loop
    while (true) {
      try {
        await this.collectMarketData();
        await this.analyzeData();
        await this.checkAlerts();
        await this.sleep(this.config.checkInterval);
      } catch (error) {
        console.error('❌ Data monitor error:', error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  /**
   * Collect market data for all monitored pools
   */
  private async collectMarketData(): Promise<void> {
    console.log(`📊 Collecting market data (${new Date().toISOString()})...`);

    for (const pool of this.config.pools) {
      try {
        const dataPoint = await this.getPoolMarketData(pool.key);

        // Add to history
        this.state.history[pool.key].push(dataPoint);

        // Keep history size limited
        if (this.state.history[pool.key].length > this.config.historySize) {
          this.state.history[pool.key].shift();
        }

        console.log(`   ${pool.name}: ${dataPoint.midPrice.toFixed(6)} (spread: ${dataPoint.spreadPercent.toFixed(4)}%)`);

      } catch (error) {
        console.error(`❌ Failed to collect data for ${pool.key}:`, error);
      }
    }

    this.state.lastCheck = Date.now();
    this.state.totalChecks++;
  }

  /**
   * Get comprehensive market data for a specific pool
   */
  private async getPoolMarketData(poolKey: string): Promise<MarketDataPoint> {
    try {
      // Get order book data
      const orderBook = await this.tradingClient.queries.getOrderBook({
        poolKey,
        depth: 10,
        includeStats: true,
      });

      // Get pool statistics
      const poolStats = await this.tradingClient.queries.getPoolStats(poolKey);

      // Calculate spread percent
      const spreadPercent = orderBook.bids[0] && orderBook.asks[0]
        ? ((orderBook.asks[0].price - orderBook.bids[0].price) / orderBook.midPrice) * 100
        : 0;

      // Calculate depth (sum of top 10 levels)
      const bidDepth = orderBook.bids.slice(0, 10).reduce((sum, bid) => sum + bid.quantity, 0);
      const askDepth = orderBook.asks.slice(0, 10).reduce((sum, ask) => sum + ask.quantity, 0);

      const dataPoint: MarketDataPoint = {
        timestamp: Date.now(),
        poolKey,
        midPrice: orderBook.midPrice,
        spreadPercent,
        bidDepth,
        askDepth,
        totalValueLocked: poolStats.vaultBalances.base * orderBook.midPrice + poolStats.vaultBalances.quote,
      };

      return dataPoint;

    } catch (error) {
      console.error(`❌ Failed to get market data for ${poolKey}:`, error);
      throw error;
    }
  }

  /**
   * Analyze collected data for anomalies and trends
   */
  private async analyzeData(): Promise<void> {
    for (const pool of this.config.pools) {
      const history = this.state.history[pool.key];
      if (history.length < 2) {
        continue; // Need at least 2 data points for analysis
      }

      const current = history[history.length - 1];
      const previous = history[history.length - 2];

      // Check for significant changes
      await this.checkPriceChange(pool, current, previous);
      await this.checkSpreadChange(pool, current, previous);
      await this.checkLiquidityChange(pool, current, previous);
    }
  }

  /**
   * Check for significant price changes
   */
  private async checkPriceChange(
    pool: { key: string; name: string; alertThresholds: any },
    current: MarketDataPoint,
    previous: MarketDataPoint
  ): Promise<void> {
    const priceChangePercent = Math.abs((current.midPrice - previous.midPrice) / previous.midPrice * 100);

    if (priceChangePercent > pool.alertThresholds.priceChangePercent) {
      const alert: Alert = {
        id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        poolKey: pool.key,
        type: 'price',
        severity: this.getSeverityLevel(priceChangePercent, [5, 10, 20]), // 5%, 10%, 20% thresholds
        message: `Significant price change detected in ${pool.name}`,
        data: {
          currentPrice: current.midPrice,
          previousPrice: previous.midPrice,
          changePercent: priceChangePercent,
          threshold: pool.alertThresholds.priceChangePercent,
        },
        acknowledged: false,
      };

      this.addAlert(alert);
    }
  }

  /**
   * Check for significant spread changes
   */
  private async checkSpreadChange(
    pool: { key: string; name: string; alertThresholds: any },
    current: MarketDataPoint,
    previous: MarketDataPoint
  ): Promise<void> {
    const spreadChange = Math.abs(current.spreadPercent - previous.spreadPercent);

    if (spreadChange > pool.alertThresholds.spreadPercent) {
      const alert: Alert = {
        id: `spread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        poolKey: pool.key,
        type: 'spread',
        severity: this.getSeverityLevel(spreadChange, [1, 2, 5]), // 1%, 2%, 5% thresholds
        message: `Significant spread change detected in ${pool.name}`,
        data: {
          currentSpread: current.spreadPercent,
          previousSpread: previous.spreadPercent,
          change: spreadChange,
          threshold: pool.alertThresholds.spreadPercent,
        },
        acknowledged: false,
      };

      this.addAlert(alert);
    }
  }

  /**
   * Check for significant liquidity changes
   */
  private async checkLiquidityChange(
    pool: { key: string; name: string; alertThresholds: any },
    current: MarketDataPoint,
    previous: MarketDataPoint
  ): Promise<void> {
    const totalDepth = current.bidDepth + current.askDepth;
    const previousTotalDepth = previous.bidDepth + previous.askDepth;
    const liquidityChangePercent = Math.abs((totalDepth - previousTotalDepth) / previousTotalDepth * 100);

    if (liquidityChangePercent > pool.alertThresholds.liquidityDropPercent) {
      const alert: Alert = {
        id: `liquidity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        poolKey: pool.key,
        type: 'liquidity',
        severity: this.getSeverityLevel(liquidityChangePercent, [20, 40, 60]), // 20%, 40%, 60% thresholds
        message: `Significant liquidity change detected in ${pool.name}`,
        data: {
          currentDepth: totalDepth,
          previousDepth: previousTotalDepth,
          changePercent: liquidityChangePercent,
          threshold: pool.alertThresholds.liquidityDropPercent,
        },
        acknowledged: false,
      };

      this.addAlert(alert);
    }
  }

  /**
   * Check and process active alerts
   */
  private async checkAlerts(): Promise<void> {
    const unacknowledgedAlerts = this.state.alerts.filter(alert => !alert.acknowledged);

    for (const alert of unacknowledgedAlerts) {
      // Check if alert is still relevant
      const age = Date.now() - alert.timestamp;
      if (age > 5 * 60 * 1000) { // 5 minutes
        alert.acknowledged = true;
        continue;
      }

      // Process alert based on severity
      switch (alert.severity) {
        case 'critical':
          console.log(`🚨 CRITICAL: ${alert.message}`);
          await this.sendAlertNotification(alert);
          break;
        case 'high':
          console.log(`⚠️  HIGH: ${alert.message}`);
          await this.sendAlertNotification(alert);
          break;
        case 'medium':
          console.log(`📢 MEDIUM: ${alert.message}`);
          break;
        case 'low':
          console.log(`ℹ️  LOW: ${alert.message}`);
          break;
      }
    }

    // Clean up old alerts (older than 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.state.alerts = this.state.alerts.filter(alert => alert.timestamp > oneDayAgo);
  }

  /**
   * Send alert notification (e.g., to webhook, email, etc.)
   */
  private async sendAlertNotification(alert: Alert): Promise<void> {
    if (!this.config.alertWebhook) {
      return;
    }

    try {
      // In a real implementation, you would send the alert to a webhook
      // For now, just log it
      console.log(`📤 Sending alert notification: ${alert.id}`);

      // Example webhook payload
      const payload = {
        alert,
        timestamp: new Date().toISOString(),
        system: 'DeepBook Data Monitor',
      };

      // fetch(this.config.alertWebhook, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });

    } catch (error) {
      console.error('❌ Failed to send alert notification:', error);
    }
  }

  /**
   * Add alert to state
   */
  private addAlert(alert: Alert): void {
    this.state.alerts.push(alert);
  }

  /**
   * Get severity level based on thresholds
   */
  private getSeverityLevel(value: number, thresholds: [number, number, number]): 'low' | 'medium' | 'high' | 'critical' {
    if (value >= thresholds[2]) return 'critical';
    if (value >= thresholds[1]) return 'high';
    if (value >= thresholds[0]) return 'medium';
    return 'low';
  }

  /**
   * Get historical data for a pool
   */
  getHistoricalData(poolKey: string): MarketDataPoint[] {
    return [...(this.state.history[poolKey] || [])];
  }

  /**
   * Get current alerts
   */
  getAlerts(): Alert[] {
    return [...this.state.alerts];
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.state.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Get monitor state
   */
  getState(): MonitorState {
    return { ...this.state };
  }

  /**
   * Stop the data monitor
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping data monitor...');
    console.log(`   Total checks performed: ${this.state.totalChecks}`);
    console.log(`   Active alerts: ${this.state.alerts.filter(a => !a.acknowledged).length}`);
    console.log('✅ Data monitor stopped');
  }

  /**
   * Generate market analysis report
   */
  generateReport(): string {
    let report = `# DeepBook Market Analysis Report\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    for (const pool of this.config.pools) {
      const history = this.state.history[pool.key];
      if (history.length === 0) continue;

      const current = history[history.length - 1];
      const first = history[0];

      const priceChange = ((current.midPrice - first.midPrice) / first.midPrice * 100);
      const avgSpread = history.reduce((sum, dp) => sum + dp.spreadPercent, 0) / history.length;

      report += `## ${pool.name} (${pool.key})\n`;
      report += `- Current Price: ${current.midPrice.toFixed(6)}\n`;
      report += `- Price Change: ${priceChange.toFixed(2)}%\n`;
      report += `- Current Spread: ${current.spreadPercent.toFixed(4)}%\n`;
      report += `- Average Spread: ${avgSpread.toFixed(4)}%\n`;
      report += `- Bid Depth: ${current.bidDepth.toFixed(2)}\n`;
      report += `- Ask Depth: ${current.askDepth.toFixed(2)}\n`;
      report += `- Data Points: ${history.length}\n\n`;
    }

    return report;
  }

  /**
   * Sleep helper function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example usage of the data monitor template
 */
export async function runDataMonitorExample(): Promise<void> {
  console.log('🏃‍♂️ Running data monitor example...\n');

  // Configuration
  const config: MonitorConfig = {
    pools: [
      {
        key: 'SUI_DBUSDC',
        name: 'SUI/USDC Pool',
        alertThresholds: {
          spreadPercent: 0.5, // Alert if spread changes by 0.5%
          volumeChangePercent: 50, // Alert if volume changes by 50%
          priceChangePercent: 5, // Alert if price changes by 5%
          liquidityDropPercent: 30, // Alert if liquidity drops by 30%
        },
      },
      {
        key: 'SUI_USDT',
        name: 'SUI/USDT Pool',
        alertThresholds: {
          spreadPercent: 0.5,
          volumeChangePercent: 50,
          priceChangePercent: 5,
          liquidityDropPercent: 30,
        },
      },
    ],
    checkInterval: 30000, // 30 seconds
    historySize: 2880, // 24 hours of data (2880 points at 30-second intervals)
    alertWebhook: 'https://hooks.example.com/alerts',
  };

  console.log('📋 Data monitor configuration:');
  console.log(`   Pools monitored: ${config.pools.map(p => p.name).join(', ')}`);
  console.log(`   Check interval: ${config.checkInterval}ms`);
  console.log(`   History size: ${config.historySize} data points per pool`);
  console.log(`   Alert webhook: ${config.alertWebhook || 'Not configured'}\n`);

  console.log('💡 This is a template. To run:');
  console.log('   1. Initialize DeepBookTradingClient with your credentials');
  console.log('   2. Create a DataMonitor instance with the client and config');
  console.log('   3. Call monitor.start() to begin monitoring');
  console.log('   4. Use monitor.getHistoricalData() to access collected data');
  console.log('   5. Use monitor.generateReport() to generate analysis reports\n');

  console.log('📊 Monitoring capabilities:');
  console.log('   • Real-time price tracking and analysis');
  console.log('   • Spread monitoring and anomaly detection');
  console.log('   • Liquidity depth tracking');
  console.log('   • Alert system with configurable thresholds');
  console.log('   • Historical data collection and analysis');
  console.log('   • Automated reporting\n');

  console.log('⚠️  Important considerations:');
  console.log('   • Adjust check intervals based on your needs');
  console.log('   • Set appropriate alert thresholds');
  console.log('   • Consider rate limits on RPC endpoints');
  console.log('   • Implement proper error handling');
  console.log('   • Have backup monitoring systems\n');

  console.log('✅ Data monitor example completed');
}