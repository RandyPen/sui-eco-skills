// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DeepBookClient, DeepBookConfig } from '@mysten/deepbook-v3';
import type { SuiClient } from '@mysten/sui/client';
import type { SimplifiedConfig, Environment } from './types/index.js';

// Import wrapper classes (they will be created in separate files)
import { DeepBookTradingWrapper } from './transaction-wrapper.js';
import { DeepBookQueryWrapper } from './query-wrapper.js';
import { DeepBookFlashLoanWrapper } from './flash-loan-wrapper.js';
import { DeepBookBalanceManagerWrapper } from './balance-manager-wrapper.js';

/**
 * Main client class for DeepBook trading operations
 * Provides simplified interfaces for common trading tasks
 */
export class DeepBookTradingClient {
  private client: DeepBookClient;
  private tradingWrapper: DeepBookTradingWrapper;
  private queryWrapper: DeepBookQueryWrapper;
  private flashLoanWrapper: DeepBookFlashLoanWrapper;
  private balanceManagerWrapper: DeepBookBalanceManagerWrapper;

  /**
   * Create a new DeepBookTradingClient
   * @param config Configuration including SuiClient, address, and environment
   */
  constructor(config: SimplifiedConfig) {
    const { suiClient, address, environment, balanceManagers } = config;

    // Create the underlying DeepBookClient
    this.client = new DeepBookClient({
      client: suiClient,
      address,
      env: environment,
      balanceManagers,
      // Load default configurations for the environment
      coins: this.getDefaultCoins(environment),
      pools: this.getDefaultPools(environment),
    });

    // Initialize wrapper classes
    this.tradingWrapper = new DeepBookTradingWrapper(this.client);
    this.queryWrapper = new DeepBookQueryWrapper(this.client);
    this.flashLoanWrapper = new DeepBookFlashLoanWrapper(this.client);
    this.balanceManagerWrapper = new DeepBookBalanceManagerWrapper(this.client);
  }

  /**
   * Get the trading functionality wrapper
   */
  get trading(): DeepBookTradingWrapper {
    return this.tradingWrapper;
  }

  /**
   * Get the query functionality wrapper
   */
  get queries(): DeepBookQueryWrapper {
    return this.queryWrapper;
  }

  /**
   * Get the flash loan functionality wrapper
   */
  get flashLoans(): DeepBookFlashLoanWrapper {
    return this.flashLoanWrapper;
  }

  /**
   * Get the balance manager functionality wrapper
   */
  get balanceManager(): DeepBookBalanceManagerWrapper {
    return this.balanceManagerWrapper;
  }

  /**
   * Get the raw DeepBookClient for advanced operations
   */
  get rawClient(): DeepBookClient {
    return this.client;
  }

  /**
   * Get default coin configurations for the specified environment
   * @param env Environment (mainnet, testnet, devnet)
   * @returns Coin configuration map
   */
  private getDefaultCoins(env: Environment): any {
    // This would load from a configuration file
    // For now, return empty object - actual implementation would load from JSON
    return {};
  }

  /**
   * Get default pool configurations for the specified environment
   * @param env Environment (mainnet, testnet, devnet)
   * @returns Pool configuration map
   */
  private getDefaultPools(env: Environment): any {
    // This would load from a configuration file
    // For now, return empty object - actual implementation would load from JSON
    return {};
  }

  /**
   * Helper method to get all available pool keys for the current environment
   */
  getAvailablePoolKeys(): string[] {
    const pools = this.getDefaultPools(this.rawClient['#config'].env);
    return Object.keys(pools || {});
  }

  /**
   * Helper method to get all available coin keys for the current environment
   */
  getAvailableCoinKeys(): string[] {
    const coins = this.getDefaultCoins(this.rawClient['#config'].env);
    return Object.keys(coins || {});
  }
}