// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Configuration constants for DeepBook trading
 */

// Scalar values for token amounts
export const DEEP_SCALAR = 1_000_000_000; // 9 decimals
export const FLOAT_SCALAR = 1_000_000_000; // 9 decimal precision for floats

// Transaction constants
export const GAS_BUDGET = 50_000_000; // 50 million MIST
export const MAX_TIMESTAMP = 18_446_744_073_709_551_615; // Max u64 timestamp

// Pool creation constants
export const POOL_CREATION_FEE = 100_000_000; // 100 SUI for pool creation

// Price oracle constants
export const PRICE_INFO_OBJECT_MAX_AGE = 5 * 60 * 1000; // 5 minutes in milliseconds

// Default environment configurations
export const DEFAULT_ENVIRONMENTS = {
  mainnet: {
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    wormholeStateId: '0xceabff0f4e2f3bc6f5d5c27b6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b',
    pythStateId: '0xceabff0f4e2f3bc6f5d5c27b6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b',
  },
  testnet: {
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    wormholeStateId: '0xceabff0f4e2f3bc6f5d5c27b6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b',
    pythStateId: '0xceabff0f4e2f3bc6f5d5c27b6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b',
  },
  devnet: {
    rpcUrl: 'https://fullnode.devnet.sui.io:443',
    wormholeStateId: '0xceabff0f4e2f3bc6f5d5c27b6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b',
    pythStateId: '0xceabff0f4e2f3bc6f5d5c27b6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b5c6b',
  },
};

// Order types
export const ORDER_TYPES = {
  LIMIT: 'limit',
  MARKET: 'market',
  IOC: 'ioc', // Immediate or Cancel
  FOK: 'fok', // Fill or Kill
} as const;

// Self-matching options
export const SELF_MATCHING_OPTIONS = {
  CANCEL_MAKER: 'cancel_maker',
  CANCEL_TAKER: 'cancel_taker',
  BOTH: 'both',
  NONE: 'none',
} as const;