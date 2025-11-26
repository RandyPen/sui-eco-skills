import {
  createSuiClient,
  executeTransaction,
  createTransferTransaction,
  waitForTransaction,
  getCoins
} from '../src/index';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Transaction examples for SuiClient
 */
async function transactionExamples() {
  // Create client connected to testnet (use testnet for testing)
  const client = createSuiClient({ network: 'testnet' });

  console.log('=== Transaction Examples ===\n');

  // Note: For actual execution, you need a funded keypair
  // This example shows the structure but won't execute without valid credentials

  // Example 1: Create a keypair (for demonstration)
  const keypair = new Ed25519Keypair();
  const address = keypair.getPublicKey().toSuiAddress();
  console.log(`Generated address: ${address}`);

  // Example 2: Check coins (replace with actual address)
  try {
    const coins = await getCoins(client, address);
    console.log(`\nCoins for ${address}:`, {
      count: coins.data.length,
      totalBalance: coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n)
    });
  } catch (error) {
    console.log(`Failed to get coins for ${address}:`, error.message);
  }

  // Example 3: Create transfer transaction (structure only)
  const recipient = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const amount = 1000; // 1000 MIST

  const transferTx = createTransferTransaction(recipient, amount);
  console.log('\nTransfer transaction created (not executed)');
  console.log(`- Recipient: ${recipient}`);
  console.log(`- Amount: ${amount} MIST`);

  // Example 4: Dry run transaction (if you have a valid transaction)
  // try {
  //   const builtTx = await transferTx.build({ client });
  //   const dryRunResult = await client.dryRunTransactionBlock({
  //     transactionBlock: builtTx
  //   });
  //   console.log('Dry run result:', dryRunResult.effects?.status);
  // } catch (error) {
  //   console.log('Dry run failed:', error.message);
  // }

  // Example 5: Wait for transaction (example with fake digest)
  const fakeDigest = 'fake-digest-for-demonstration';
  console.log('\nNote: Transaction execution requires a funded keypair and valid recipient address');
  console.log('To execute a real transaction:');
  console.log('1. Fund your keypair with testnet SUI');
  console.log('2. Replace recipient with a valid address');
  console.log('3. Uncomment the execution code');
}

// Run examples
transactionExamples().catch(console.error);