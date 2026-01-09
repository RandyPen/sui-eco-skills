// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Type definitions for DeepBook trading skill
 * Export all types used across the skill
 */

// Re-export types from DeepBook SDK
export type { SuiClient } from '@mysten/sui/client';
export type { Environment, BalanceManager, Coin, Pool, MarginManager } from '@mysten/deepbook-v3';

// Export custom types for the skill
export interface SimplifiedConfig {
  suiClient: SuiClient;
  address: string;
  environment: Environment;
  balanceManagers?: Record<string, { address: string; tradeCap?: string }>;
}

export type OrderType = 'limit' | 'market' | 'ioc' | 'fok';
export type Side = 'buy' | 'sell';

// Trading parameters
export interface OrderParams {
  poolKey: string;
  balanceManagerKey: string;
  price: number;
  quantity: number;
  isBid: boolean;
  clientOrderId?: string;
  orderType?: OrderType;
  expiration?: number;
}

export interface MarketOrderParams {
  poolKey: string;
  balanceManagerKey: string;
  quantity: number;
  isBid: boolean;
}

export interface SwapParams {
  poolKey: string;
  amount: number;
  isExactBase: boolean;
  minOut?: number;
}

// Query parameters
export interface OrderBookQueryParams {
  poolKey: string;
  depth?: number;
  includeStats?: boolean;
}

export interface AccountQueryParams {
  poolKey: string;
  balanceManagerKey: string;
}

// Flash loan parameters
export interface FlashLoanParams {
  borrowPoolKey: string;
  tradePoolKey: string;
  borrowAmount: number;
  tradeAmount: number;
  isBaseAsset: boolean;
}

// Balance manager operations
export interface DepositParams {
  managerKey: string;
  coinKey: string;
  amount: number;
}

export interface WithdrawParams {
  managerKey: string;
  coinKey: string;
  amount: number;
}

// Error types
export class DeepBookTradingError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DeepBookTradingError';
  }
}

export class TransactionError extends DeepBookTradingError {
  constructor(message: string, public txDigest?: string) {
    super(message, 'TRANSACTION_ERROR');
    this.name = 'TransactionError';
  }
}

export class QueryError extends DeepBookTradingError {
  constructor(message: string) {
    super(message, 'QUERY_ERROR');
    this.name = 'QueryError';
  }
}