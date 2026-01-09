// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DeepBookClient } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
import type { OrderParams, MarketOrderParams, SwapParams } from './types/index.js';

/**
 * Wrapper class for DeepBook trading operations
 * Simplifies common trading tasks
 */
export class DeepBookTradingWrapper {
  constructor(private client: DeepBookClient) {}

  /**
   * Place a limit order on the order book
   * @param params Order parameters including price, quantity, and direction
   * @returns Transaction object ready for execution
   */
  async placeLimitOrder(params: OrderParams): Promise<Transaction> {
    const tx = new Transaction();

    // Generate client order ID if not provided
    const clientOrderId = params.clientOrderId || this.generateOrderId();
    const expiration = params.expiration || this.getDefaultExpiration();

    tx.add(this.client.deepBook.placeLimitOrder({
      poolKey: params.poolKey,
      balanceManagerKey: params.balanceManagerKey,
      clientOrderId,
      price: params.price,
      quantity: params.quantity,
      isBid: params.isBid,
      orderType: params.orderType || 'limit',
      expiration,
    }));

    return tx;
  }

  /**
   * Place a market order
   * @param params Market order parameters
   * @returns Transaction object ready for execution
   */
  async placeMarketOrder(params: MarketOrderParams): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(this.client.deepBook.placeMarketOrder({
      poolKey: params.poolKey,
      balanceManagerKey: params.balanceManagerKey,
      quantity: params.quantity,
      isBid: params.isBid,
    }));

    return tx;
  }

  /**
   * Cancel an existing order
   * @param poolKey Pool key where the order exists
   * @param balanceManagerKey Balance manager key
   * @param orderId Order ID to cancel
   * @returns Transaction object ready for execution
   */
  async cancelOrder(
    poolKey: string,
    balanceManagerKey: string,
    orderId: string
  ): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(this.client.deepBook.cancelOrder({
      poolKey,
      balanceManagerKey,
      orderId,
    }));

    return tx;
  }

  /**
   * Swap exact base amount for quote
   * @param params Swap parameters
   * @returns Transaction object ready for execution
   */
  async swapExactBaseForQuote(params: SwapParams): Promise<Transaction> {
    const tx = new Transaction();
    const minOut = params.minOut || 0;

    tx.add(this.client.deepBook.swapExactBaseForQuote({
      poolKey: params.poolKey,
      amount: params.amount,
      deepAmount: 0, // Can be configured if needed
      minOut,
    }));

    return tx;
  }

  /**
   * Swap exact quote amount for base
   * @param params Swap parameters
   * @returns Transaction object ready for execution
   */
  async swapExactQuoteForBase(params: SwapParams): Promise<Transaction> {
    const tx = new Transaction();
    const minOut = params.minOut || 0;

    tx.add(this.client.deepBook.swapExactQuoteForBase({
      poolKey: params.poolKey,
      amount: params.amount,
      deepAmount: 0, // Can be configured if needed
      minOut,
    }));

    return tx;
  }

  /**
   * Batch cancel multiple orders
   * @param poolKey Pool key
   * @param balanceManagerKey Balance manager key
   * @param orderIds Array of order IDs to cancel
   * @returns Transaction object ready for execution
   */
  async batchCancelOrders(
    poolKey: string,
    balanceManagerKey: string,
    orderIds: string[]
  ): Promise<Transaction> {
    const tx = new Transaction();

    for (const orderId of orderIds) {
      tx.add(this.client.deepBook.cancelOrder({
        poolKey,
        balanceManagerKey,
        orderId,
      }));
    }

    return tx;
  }

  /**
   * Generate a unique order ID
   * @returns Unique order ID string
   */
  private generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `order_${timestamp}_${random}`;
  }

  /**
   * Get default expiration timestamp (24 hours from now)
   * @returns Expiration timestamp in seconds
   */
  private getDefaultExpiration(): number {
    // Default to 24 hours from now
    return Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  }

  /**
   * Helper to calculate required DEEP stake for an order
   * @param poolKey Pool key
   * @param quantity Order quantity
   * @param isBid Whether it's a bid order
   * @returns Promise resolving to required DEEP amount
   */
  async calculateRequiredDeep(
    poolKey: string,
    quantity: number,
    isBid: boolean
  ): Promise<number> {
    if (isBid) {
      const result = await this.client.getQuoteQuantityOut(poolKey, quantity);
      return result.deepRequired;
    } else {
      const result = await this.client.getBaseQuantityOut(poolKey, quantity);
      return result.deepRequired;
    }
  }
}