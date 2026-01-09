// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DeepBookClient } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
import type { FlashLoanParams } from './types/index.js';

/**
 * Wrapper class for DeepBook flash loan operations
 * Simplifies flash loan borrowing and arbitrage strategies
 */
export class DeepBookFlashLoanWrapper {
  constructor(private client: DeepBookClient) {}

  /**
   * Create a flash loan arbitrage transaction
   * @param params Flash loan parameters
   * @returns Transaction object ready for execution
   */
  async createFlashLoanArbitrage(params: FlashLoanParams): Promise<Transaction> {
    const tx = new Transaction();
    const { borrowPoolKey, tradePoolKey, borrowAmount, tradeAmount, isBaseAsset } = params;

    // 1. Borrow asset from flash loan pool
    const [borrowedAsset, flashLoan] = isBaseAsset
      ? tx.add(this.client.flashLoans.borrowBaseAsset(borrowPoolKey, borrowAmount))
      : tx.add(this.client.flashLoans.borrowQuoteAsset(borrowPoolKey, borrowAmount));

    // 2. Execute trade in target pool
    const tradeResult = isBaseAsset
      ? tx.add(this.client.deepBook.swapExactBaseForQuote({
          poolKey: tradePoolKey,
          amount: tradeAmount,
          deepAmount: 0,
          minOut: 0,
        }))
      : tx.add(this.client.deepBook.swapExactQuoteForBase({
          poolKey: tradePoolKey,
          amount: tradeAmount,
          deepAmount: 0,
          minOut: 0,
        }));

    // 3. Return borrowed asset to flash loan pool
    const remaining = isBaseAsset
      ? tx.add(this.client.flashLoans.returnBaseAsset(
          borrowPoolKey, borrowAmount, borrowedAsset, flashLoan
        ))
      : tx.add(this.client.flashLoans.returnQuoteAsset(
          borrowPoolKey, borrowAmount, borrowedAsset, flashLoan
        ));

    // 4. Transfer profit to sender
    // Note: In a real arbitrage, profit would be calculated from tradeResult
    // This is a simplified version
    tx.transferObjects([...tradeResult, remaining], tx.pure.address(this.client.address));

    return tx;
  }

  /**
   * Borrow base asset from flash loan pool
   * @param poolKey Pool key
   * @param amount Amount to borrow
   * @returns Transaction with borrowed asset
   */
  async borrowBaseAsset(poolKey: string, amount: number): Promise<Transaction> {
    const tx = new Transaction();

    const [borrowedAsset, flashLoan] = tx.add(
      this.client.flashLoans.borrowBaseAsset(poolKey, amount)
    );

    // Store references for later return
    tx.add({
      kind: 'moveCall',
      target: '0x2::transfer::public_share_object',
      typeArguments: [],
      arguments: [
        tx.object(flashLoan),
        tx.pure.address(this.client.address),
      ],
    });

    return tx;
  }

  /**
   * Borrow quote asset from flash loan pool
   * @param poolKey Pool key
   * @param amount Amount to borrow
   * @returns Transaction with borrowed asset
   */
  async borrowQuoteAsset(poolKey: string, amount: number): Promise<Transaction> {
    const tx = new Transaction();

    const [borrowedAsset, flashLoan] = tx.add(
      this.client.flashLoans.borrowQuoteAsset(poolKey, amount)
    );

    // Store references for later return
    tx.add({
      kind: 'moveCall',
      target: '0x2::transfer::public_share_object',
      typeArguments: [],
      arguments: [
        tx.object(flashLoan),
        tx.pure.address(this.client.address),
      ],
    });

    return tx;
  }

  /**
   * Return borrowed base asset
   * @param poolKey Pool key
   * @param amount Amount to return
   * @param borrowedAsset Borrowed asset object
   * @param flashLoan Flash loan object
   * @returns Transaction for returning asset
   */
  async returnBaseAsset(
    poolKey: string,
    amount: number,
    borrowedAsset: any,
    flashLoan: any
  ): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(this.client.flashLoans.returnBaseAsset(
      poolKey,
      amount,
      borrowedAsset,
      flashLoan
    ));

    return tx;
  }

  /**
   * Return borrowed quote asset
   * @param poolKey Pool key
   * @param amount Amount to return
   * @param borrowedAsset Borrowed asset object
   * @param flashLoan Flash loan object
   * @returns Transaction for returning asset
   */
  async returnQuoteAsset(
    poolKey: string,
    amount: number,
    borrowedAsset: any,
    flashLoan: any
  ): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(this.client.flashLoans.returnQuoteAsset(
      poolKey,
      amount,
      borrowedAsset,
      flashLoan
    ));

    return tx;
  }

  /**
   * Calculate potential arbitrage profit between two pools
   * @param poolA First pool key
   * @param poolB Second pool key
   * @param amount Amount to test
   * @param isBaseAsset Whether testing with base asset
   * @returns Estimated profit if any
   */
  async calculateArbitrageProfit(
    poolA: string,
    poolB: string,
    amount: number,
    isBaseAsset: boolean
  ): Promise<{ profit: number; profitable: boolean; details: any }> {
    try {
      // Get conversion rates from both pools
      const conversionA = await this.client.getQuantityOut(poolA, isBaseAsset ? amount : 0, isBaseAsset ? 0 : amount);
      const conversionB = await this.client.getQuantityOut(poolB, isBaseAsset ? 0 : conversionA.quoteOut, isBaseAsset ? conversionA.baseOut : 0);

      let profit = 0;
      if (isBaseAsset) {
        // Base -> Quote in poolA, then Quote -> Base in poolB
        profit = conversionB.baseOut - amount;
      } else {
        // Quote -> Base in poolA, then Base -> Quote in poolB
        profit = conversionB.quoteOut - amount;
      }

      return {
        profit,
        profitable: profit > 0,
        details: {
          poolAConversion: conversionA,
          poolBConversion: conversionB,
          netProfit: profit,
          profitPercentage: (profit / amount) * 100,
        },
      };
    } catch (error) {
      throw new Error(`Failed to calculate arbitrage profit: ${error}`);
    }
  }

  /**
   * Check if flash loan is available for a pool
   * @param poolKey Pool key
   * @returns Whether flash loan is available
   */
  async isFlashLoanAvailable(poolKey: string): Promise<boolean> {
    try {
      // Check if pool has sufficient liquidity
      const vaultBalances = await this.client.vaultBalances(poolKey);
      const minLiquidity = 1000; // Minimum liquidity threshold

      if (vaultBalances.base > minLiquidity && vaultBalances.quote > minLiquidity) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`Failed to check flash loan availability for ${poolKey}: ${error}`);
      return false;
    }
  }
}