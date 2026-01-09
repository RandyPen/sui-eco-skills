// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Main exports for DeepBook trading skill
 * Provides simplified interfaces for DeepBook V3 SDK operations
 */

// Export main client class
export { DeepBookTradingClient } from './client-wrapper.js';

// Export wrapper classes for specific functionality
export { DeepBookTradingWrapper } from './transaction-wrapper.js';
export { DeepBookQueryWrapper } from './query-wrapper.js';
export { DeepBookFlashLoanWrapper } from './flash-loan-wrapper.js';
export { DeepBookBalanceManagerWrapper } from './balance-manager-wrapper.js';

// Export all type definitions
export * from './types/index.js';

// Export constants and utilities
export {
  DEEP_SCALAR,
  FLOAT_SCALAR,
  GAS_BUDGET,
  MAX_TIMESTAMP,
  POOL_CREATION_FEE,
  PRICE_INFO_OBJECT_MAX_AGE,
} from './utils/config.js';

// Export configuration helpers
export { getDefaultCoins, getDefaultPools } from './utils/constants.js';