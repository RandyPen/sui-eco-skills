// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DeepBookClient } from '@mysten/deepbook-v3';
import type { OrderBookQueryParams, AccountQueryParams } from './types/index.js';

/**
 * Wrapper class for DeepBook data queries
 * Provides simplified interfaces for market data retrieval
 */
export class DeepBookQueryWrapper {
  constructor(private client: DeepBookClient) {}

  /**
   * Get order book data with specified depth
   * @param params Query parameters including pool key and depth
   * @returns Order book data with bids, asks, and statistics
   */
  async getOrderBook(params: OrderBookQueryParams) {
    const { poolKey, depth = 10, includeStats = true } = params;

    try {
      // Get Level 2 order book data
      const level2Data = await this.client.getLevel2TicksFromMid(poolKey, depth);

      // Get mid price
      const midPrice = await this.client.midPrice(poolKey);

      // Get pool statistics if requested
      const stats = includeStats ? await this.getPoolStats(poolKey) : null;

      return {
        bids: level2Data.bid_prices.map((price, index) => ({
          price,
          quantity: level2Data.bid_quantities[index],
          cumulativeQuantity: this.calculateCumulative(level2Data.bid_quantities, index, true),
        })),
        asks: level2Data.ask_prices.map((price, index) => ({
          price,
          quantity: level2Data.ask_quantities[index],
          cumulativeQuantity: this.calculateCumulative(level2Data.ask_quantities, index, false),
        })),
        midPrice,
        stats,
        timestamp: Date.now(),
        poolKey,
        depth,
      };
    } catch (error) {
      throw new Error(`Failed to get order book for pool ${poolKey}: ${error}`);
    }
  }

  /**
   * Get comprehensive pool statistics
   * @param poolKey Pool key
   * @returns Pool statistics including trade params, book params, and vault balances
   */
  async getPoolStats(poolKey: string) {
    try {
      const [tradeParams, bookParams, vaultBalances, whitelisted] = await Promise.all([
        this.client.poolTradeParams(poolKey),
        this.client.poolBookParams(poolKey),
        this.client.vaultBalances(poolKey),
        this.client.whitelisted(poolKey),
      ]);

      return {
        tradeParams,
        bookParams,
        vaultBalances,
        whitelisted,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to get pool stats for ${poolKey}: ${error}`);
    }
  }

  /**
   * Get account information for a specific pool and balance manager
   * @param params Account query parameters
   * @returns Account information including balances, orders, and stakes
   */
  async getAccountInfo(params: AccountQueryParams) {
    const { poolKey, balanceManagerKey } = params;

    try {
      const [accountInfo, openOrders, lockedBalance] = await Promise.all([
        this.client.account(poolKey, balanceManagerKey),
        this.client.accountOpenOrders(poolKey, balanceManagerKey),
        this.client.lockedBalance(poolKey, balanceManagerKey),
      ]);

      return {
        accountInfo,
        openOrders,
        lockedBalance,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to get account info for ${balanceManagerKey} in pool ${poolKey}: ${error}`);
    }
  }

  /**
   * Get order information with normalized data
   * @param poolKey Pool key
   * @param orderId Order ID
   * @returns Normalized order information
   */
  async getOrderNormalized(poolKey: string, orderId: string) {
    try {
      const orderInfo = await this.client.getOrderNormalized(poolKey, orderId);
      if (!orderInfo) {
        return null;
      }

      // Decode order ID for additional information
      const decoded = this.client.decodeOrderId(BigInt(orderInfo.order_id));

      return {
        ...orderInfo,
        ...decoded,
        normalizedPrice: orderInfo.normalized_price,
        filledPercentage: (Number(orderInfo.filled_quantity) / Number(orderInfo.quantity)) * 100,
        remainingQuantity: Number(orderInfo.quantity) - Number(orderInfo.filled_quantity),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to get order ${orderId} from pool ${poolKey}: ${error}`);
    }
  }

  /**
   * Get price conversion information
   * @param poolKey Pool key
   * @param amount Amount to convert
   * @param isBaseToQuote Whether converting from base to quote (true) or quote to base (false)
   * @returns Conversion result with input and output amounts
   */
  async getPriceConversion(
    poolKey: string,
    amount: number,
    isBaseToQuote: boolean
  ) {
    try {
      if (isBaseToQuote) {
        const result = await this.client.getQuoteQuantityOut(poolKey, amount);
        return {
          inputAmount: amount,
          inputType: 'base',
          outputAmount: result.quoteOut,
          outputType: 'quote',
          deepRequired: result.deepRequired,
          conversionRate: result.quoteOut / amount,
        };
      } else {
        const result = await this.client.getBaseQuantityOut(poolKey, amount);
        return {
          inputAmount: amount,
          inputType: 'quote',
          outputAmount: result.baseOut,
          outputType: 'base',
          deepRequired: result.deepRequired,
          conversionRate: amount / result.baseOut,
        };
      }
    } catch (error) {
      throw new Error(`Failed to get price conversion for ${amount} in pool ${poolKey}: ${error}`);
    }
  }

  /**
   * Get referral balances for a pool
   * @param poolKey Pool key
   * @param referralId Referral ID
   * @returns Referral balances in base, quote, and DEEP
   */
  async getReferralBalances(poolKey: string, referralId: string) {
    try {
      return await this.client.getReferralBalances(poolKey, referralId);
    } catch (error) {
      throw new Error(`Failed to get referral balances for ${referralId} in pool ${poolKey}: ${error}`);
    }
  }

  /**
   * Get all balance manager IDs for an owner
   * @param owner Owner address
   * @returns Array of balance manager IDs
   */
  async getBalanceManagerIds(owner: string): Promise<string[]> {
    try {
      return await this.client.getBalanceManagerIds(owner);
    } catch (error) {
      throw new Error(`Failed to get balance manager IDs for owner ${owner}: ${error}`);
    }
  }

  /**
   * Helper to calculate cumulative quantities for order book
   * @param quantities Array of quantities
   * @param index Current index
   * @param isBid Whether calculating for bids (true) or asks (false)
   * @returns Cumulative quantity up to current index
   */
  private calculateCumulative(
    quantities: number[],
    index: number,
    isBid: boolean
  ): number {
    if (isBid) {
      // For bids, cumulative from best bid (index 0) to current
      return quantities.slice(0, index + 1).reduce((sum, qty) => sum + qty, 0);
    } else {
      // For asks, cumulative from best ask (index 0) to current
      return quantities.slice(0, index + 1).reduce((sum, qty) => sum + qty, 0);
    }
  }
}