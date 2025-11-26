import {
  createSuiClient,
  executeTransaction,
  createTransferTransaction,
  waitForTransaction
} from '../src/index';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Transfer transaction template
 * Replace placeholders with your actual values
 */

// Configuration
const CONFIG = {
  network: 'testnet' // Use testnet for testing
};

// Transaction details
const TRANSFER_DETAILS = {
  // Replace with your private key (be careful with security!)
  privateKey: 'YOUR_PRIVATE_KEY_HERE',
  // Replace with recipient address
  recipient: '0xRECIPIENT_ADDRESS_HERE',
  // Amount in MIST (1 SUI = 1,000,000,000 MIST)
  amount: 1000000000 // 1 SUI
};

async function executeTransfer() {
  // Create client
  const client = createSuiClient(CONFIG);

  try {
    // Create keypair from private key
    // Note: In practice, use proper key management
    const keypair = Ed25519Keypair.fromSecretKey(TRANSFER_DETAILS.privateKey);
    const senderAddress = keypair.getPublicKey().toSuiAddress();

    console.log(`Sender: ${senderAddress}`);
    console.log(`Recipient: ${TRANSFER_DETAILS.recipient}`);
    console.log(`Amount: ${TRANSFER_DETAILS.amount} MIST`);

    // Create transfer transaction
    const transaction = createTransferTransaction(
      TRANSFER_DETAILS.recipient,
      TRANSFER_DETAILS.amount
    );

    // Execute transaction
    console.log('Executing transaction...');
    const result = await executeTransaction(client, transaction, keypair, {
      showEffects: true,
      showObjectChanges: true
    });

    console.log(`Transaction digest: ${result.digest}`);

    // Wait for transaction confirmation
    console.log('Waiting for confirmation...');
    const confirmedResult = await waitForTransaction(client, result.digest, {
      showEffects: true
    });

    console.log('Transaction confirmed!');
    console.log('Status:', confirmedResult.effects?.status?.status);

  } catch (error) {
    console.error('Transaction failed:', error);
  }
}

// Security warning
console.log('⚠️  WARNING:');
console.log('- Never commit private keys to version control');
console.log('- Use environment variables for sensitive data');
console.log('- Test on testnet before using mainnet');
console.log('');

// Uncomment to run (after setting up proper credentials)
// executeTransfer().catch(console.error);