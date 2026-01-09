// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Default constants for DeepBook trading skill
 * Coin and pool configurations for different environments
 */

import type { CoinMap, PoolMap } from '@mysten/deepbook-v3';

// Helper function to get default coins for environment
export function getDefaultCoins(environment: string): CoinMap {
  const coins: Record<string, CoinMap> = {
    mainnet: MAINNET_COINS,
    testnet: TESTNET_COINS,
    devnet: DEVNET_COINS,
  };

  return coins[environment] || {};
}

// Helper function to get default pools for environment
export function getDefaultPools(environment: string): PoolMap {
  const pools: Record<string, PoolMap> = {
    mainnet: MAINNET_POOLS,
    testnet: TESTNET_POOLS,
    devnet: DEVNET_POOLS,
  };

  return pools[environment] || {};
}

// Mainnet coin configurations
export const MAINNET_COINS: CoinMap = {
  SUI: {
    type: '0x2::sui::SUI',
    scalar: 1_000_000_000,
    decimals: 9,
    feed: '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6c0b722a', // SUI/USD
  },
  USDC: {
    type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    scalar: 1_000_000,
    decimals: 6,
    feed: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC/USD
  },
  DBUSDC: {
    type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    scalar: 1_000_000,
    decimals: 6,
    feed: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC/USD
  },
  DEEP: {
    type: '0xdeeb7d6f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c',
    scalar: 1_000_000_000,
    decimals: 9,
    feed: '0x0000000000000000000000000000000000000000000000000000000000000000', // No feed
  },
};

// Testnet coin configurations
export const TESTNET_COINS: CoinMap = {
  SUI: {
    type: '0x2::sui::SUI',
    scalar: 1_000_000_000,
    decimals: 9,
    feed: '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6c0b722a', // SUI/USD testnet
  },
  USDC: {
    type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    scalar: 1_000_000,
    decimals: 6,
    feed: '0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722', // USDC/USD testnet
  },
  DBUSDC: {
    type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    scalar: 1_000_000,
    decimals: 6,
    feed: '0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722', // USDC/USD testnet
  },
};

// Devnet coin configurations
export const DEVNET_COINS: CoinMap = {
  SUI: {
    type: '0x2::sui::SUI',
    scalar: 1_000_000_000,
    decimals: 9,
    feed: '0x0000000000000000000000000000000000000000000000000000000000000000',
  },
  USDC: {
    type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    scalar: 1_000_000,
    decimals: 6,
    feed: '0x0000000000000000000000000000000000000000000000000000000000000000',
  },
};

// Mainnet pool configurations
export const MAINNET_POOLS: PoolMap = {
  SUI_USDC: {
    poolKey: 'SUI_USDC',
    baseCoin: 'SUI',
    quoteCoin: 'USDC',
    address: '0xdeeb7d6f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c',
  },
  SUI_DBUSDC: {
    poolKey: 'SUI_DBUSDC',
    baseCoin: 'SUI',
    quoteCoin: 'DBUSDC',
    address: '0xdeeb7d6f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c',
  },
  DEEP_USDC: {
    poolKey: 'DEEP_USDC',
    baseCoin: 'DEEP',
    quoteCoin: 'USDC',
    address: '0xdeeb7d6f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c',
  },
};

// Testnet pool configurations
export const TESTNET_POOLS: PoolMap = {
  SUI_DBUSDC: {
    poolKey: 'SUI_DBUSDC',
    baseCoin: 'SUI',
    quoteCoin: 'DBUSDC',
    address: '0xdeeb7d6f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c',
  },
  TEST_USDC: {
    poolKey: 'TEST_USDC',
    baseCoin: 'SUI',
    quoteCoin: 'USDC',
    address: '0xdeeb7d6f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c',
  },
};

// Devnet pool configurations
export const DEVNET_POOLS: PoolMap = {
  DEV_SUI_USDC: {
    poolKey: 'DEV_SUI_USDC',
    baseCoin: 'SUI',
    quoteCoin: 'USDC',
    address: '0xdeeb7d6f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c4f2c',
  },
};

// Common trading pairs
export const COMMON_PAIRS = [
  'SUI_USDC',
  'SUI_DBUSDC',
  'DEEP_USDC',
];

// Default pool for testing
export const DEFAULT_POOL = 'SUI_DBUSDC';

// Default balance manager key
export const DEFAULT_BALANCE_MANAGER = 'MAIN';