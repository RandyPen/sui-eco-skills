import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFullnodeUrl } from '@mysten/sui/client';

export interface SuiClientConfig {
  url?: string;
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  customUrl?: string;
}

export interface GetObjectOptions {
  showContent?: boolean;
  showOwner?: boolean;
  showDisplay?: boolean;
  showBcs?: boolean;
  showType?: boolean;
  showStorageRebate?: boolean;
}

export interface TransactionOptions {
  showEffects?: boolean;
  showObjectChanges?: boolean;
  showEvents?: boolean;
  showInput?: boolean;
  showRawInput?: boolean;
  showBalanceChanges?: boolean;
}

/**
 * Create a SuiClient instance
 */
export function createSuiClient(config: SuiClientConfig = {}): SuiClient {
  let url: string;

  if (config.customUrl) {
    url = config.customUrl;
  } else if (config.network) {
    url = getFullnodeUrl(config.network);
  } else {
    url = config.url || getFullnodeUrl('mainnet');
  }

  return new SuiClient({ url });
}

/**
 * Get account balance
 */
export async function getBalance(
  client: SuiClient,
  owner: string,
  coinType: string = '0x2::sui::SUI'
) {
  return await client.getBalance({ owner, coinType });
}

/**
 * Get all coins for an address
 */
export async function getCoins(
  client: SuiClient,
  owner: string,
  coinType: string = '0x2::sui::SUI'
) {
  return await client.getCoins({ owner, coinType });
}

/**
 * Get object with options
 */
export async function getObject(
  client: SuiClient,
  id: string,
  options: GetObjectOptions = {}
) {
  return await client.getObject({ id, options });
}

/**
 * Get multiple objects
 */
export async function getObjects(
  client: SuiClient,
  ids: string[],
  options: GetObjectOptions = {}
) {
  return await client.multiGetObjects({ ids, options });
}

/**
 * Execute a transaction
 */
export async function executeTransaction(
  client: SuiClient,
  transaction: Transaction,
  signer: Ed25519Keypair,
  options: TransactionOptions = {}
) {
  return await client.signAndExecuteTransaction({
    transaction,
    signer,
    options
  });
}

/**
 * Wait for transaction completion
 */
export async function waitForTransaction(
  client: SuiClient,
  digest: string,
  options: TransactionOptions = {}
) {
  return await client.waitForTransaction({
    digest,
    options
  });
}

/**
 * Get current gas price
 */
export async function getGasPrice(client: SuiClient) {
  return await client.getReferenceGasPrice();
}

/**
 * Get latest system state
 */
export async function getSystemState(client: SuiClient) {
  return await client.getLatestSuiSystemState();
}

/**
 * Query events
 */
export async function queryEvents(
  client: SuiClient,
  query: any,
  limit: number = 10
) {
  return await client.queryEvents({ query, limit });
}

/**
 * Get staking information
 */
export async function getStakes(client: SuiClient, owner: string) {
  return await client.getStakes({ owner });
}

/**
 * Create a simple transfer transaction
 */
export function createTransferTransaction(
  recipient: string,
  amount: number
): Transaction {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
  tx.transferObjects([coin], tx.pure.address(recipient));
  return tx;
}

/**
 * Check if an address is valid
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

export {
  SuiClient,
  Transaction,
  Ed25519Keypair,
  getFullnodeUrl
};