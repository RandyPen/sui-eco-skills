// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DeepBookClient } from '@mysten/deepbook-v3';
import { Transaction } from '@mysten/sui/transactions';
import type { DepositParams, WithdrawParams } from './types/index.js';

/**
 * Wrapper class for DeepBook balance manager operations
 * Simplifies fund management tasks
 */
export class DeepBookBalanceManagerWrapper {
  constructor(private client: DeepBookClient) {}

  /**
   * Create a new balance manager for an owner
   * @param owner Owner address
   * @param referralCode Optional referral code
   * @returns Transaction object ready for execution
   */
  async createBalanceManager(
    owner: string,
    referralCode: string = ''
  ): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(this.client.balanceManager.createAndShareBalanceManager(
      owner,
      referralCode
    ));

    return tx;
  }

  /**
   * Deposit funds into a balance manager
   * @param params Deposit parameters
   * @returns Transaction object ready for execution
   */
  async deposit(params: DepositParams): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(this.client.balanceManager.depositIntoManager(
      params.managerKey,
      params.coinKey,
      params.amount
    ));

    return tx;
  }

  /**
   * Withdraw funds from a balance manager
   * @param params Withdraw parameters
   * @returns Transaction object ready for execution
   */
  async withdraw(params: WithdrawParams): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(this.client.balanceManager.withdrawFromManager(
      params.managerKey,
      params.coinKey,
      params.amount
    ));

    return tx;
  }

  /**
   * Check balance of a specific coin in a balance manager
   * @param managerKey Balance manager key
   * @param coinKey Coin key
   * @returns Balance information
   */
  async checkBalance(managerKey: string, coinKey: string) {
    try {
      return await this.client.checkManagerBalance(managerKey, coinKey);
    } catch (error) {
      throw new Error(`Failed to check balance for ${coinKey} in manager ${managerKey}: ${error}`);
    }
  }

  /**
   * Get all balances for a balance manager
   * @param managerKey Balance manager key
   * @returns Map of coin balances
   */
  async getAllBalances(managerKey: string): Promise<Record<string, { coinType: string; balance: number }>> {
    try {
      // Get available coin keys from configuration
      const coinKeys = this.getAvailableCoinKeys();
      const balances: Record<string, { coinType: string; balance: number }> = {};

      for (const coinKey of coinKeys) {
        try {
          const balance = await this.client.checkManagerBalance(managerKey, coinKey);
          balances[coinKey] = balance;
        } catch (error) {
          // Coin might not be supported by this manager
          console.debug(`Coin ${coinKey} not available in manager ${managerKey}`);
        }
      }

      return balances;
    } catch (error) {
      throw new Error(`Failed to get all balances for manager ${managerKey}: ${error}`);
    }
  }

  /**
   * Transfer balance manager ownership
   * @param managerKey Balance manager key
   * @param newOwner New owner address
   * @returns Transaction object ready for execution
   */
  async transferOwnership(managerKey: string, newOwner: string): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(this.client.balanceManager.transferBalanceManager(
      managerKey,
      newOwner
    ));

    return tx;
  }

  /**
   * Create a referral code
   * @param owner Owner address
   * @returns Transaction object ready for execution
   */
  async createReferral(owner: string): Promise<Transaction> {
    const tx = new Transaction();

    tx.add(this.client.balanceManager.createReferral(
      owner
    ));

    return tx;
  }

  /**
   * Get referral owner
   * @param referralId Referral ID
   * @returns Owner address
   */
  async getReferralOwner(referralId: string): Promise<string> {
    try {
      return await this.client.referralOwner(referralId);
    } catch (error) {
      throw new Error(`Failed to get referral owner for ${referralId}: ${error}`);
    }
  }

  /**
   * Batch deposit multiple coins
   * @param managerKey Balance manager key
   * @param deposits Array of deposit parameters
   * @returns Transaction object ready for execution
   */
  async batchDeposit(
    managerKey: string,
    deposits: Array<{ coinKey: string; amount: number }>
  ): Promise<Transaction> {
    const tx = new Transaction();

    for (const deposit of deposits) {
      tx.add(this.client.balanceManager.depositIntoManager(
        managerKey,
        deposit.coinKey,
        deposit.amount
      ));
    }

    return tx;
  }

  /**
   * Batch withdraw multiple coins
   * @param managerKey Balance manager key
   * @param withdrawals Array of withdraw parameters
   * @returns Transaction object ready for execution
   */
  async batchWithdraw(
    managerKey: string,
    withdrawals: Array<{ coinKey: string; amount: number }>
  ): Promise<Transaction> {
    const tx = new Transaction();

    for (const withdrawal of withdrawals) {
      tx.add(this.client.balanceManager.withdrawFromManager(
        managerKey,
        withdrawal.coinKey,
        withdrawal.amount
      ));
    }

    return tx;
  }

  /**
   * Get total portfolio value
   * @param managerKey Balance manager key
   * @param pricingFunction Function to get coin prices (optional)
   * @returns Total portfolio value in USD
   */
  async getPortfolioValue(
    managerKey: string,
    pricingFunction?: (coinKey: string) => Promise<number>
  ): Promise<{ totalValue: number; breakdown: Record<string, { balance: number; value: number }> }> {
    try {
      const balances = await this.getAllBalances(managerKey);
      const breakdown: Record<string, { balance: number; value: number }> = {};
      let totalValue = 0;

      for (const [coinKey, balanceInfo] of Object.entries(balances)) {
        let price = 1; // Default price
        if (pricingFunction) {
          price = await pricingFunction(coinKey);
        }

        const value = balanceInfo.balance * price;
        breakdown[coinKey] = {
          balance: balanceInfo.balance,
          value,
        };
        totalValue += value;
      }

      return {
        totalValue,
        breakdown,
      };
    } catch (error) {
      throw new Error(`Failed to get portfolio value for manager ${managerKey}: ${error}`);
    }
  }

  /**
   * Helper method to get available coin keys
   * @returns Array of available coin keys
   */
  private getAvailableCoinKeys(): string[] {
    // This would come from configuration
    // For now, return common coin keys
    return ['SUI', 'USDC', 'DBUSDC', 'DEEP'];
  }
}