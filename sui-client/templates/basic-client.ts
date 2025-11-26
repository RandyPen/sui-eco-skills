import { createSuiClient, getBalance, getGasPrice } from '../src/index';

/**
 * Basic SuiClient template
 * Replace placeholders with your actual values
 */

// Configuration
const CONFIG = {
  // Choose one:
  network: 'mainnet', // 'mainnet' | 'testnet' | 'devnet' | 'localnet'
  // OR custom URL:
  // customUrl: 'https://your-custom-rpc.com'
};

// Your addresses
const ADDRESSES = {
  // Replace with your actual address
  myAddress: '0xYOUR_ADDRESS_HERE',
  // Example recipient
  recipient: '0xRECIPIENT_ADDRESS_HERE'
};

async function main() {
  // Create client
  const client = createSuiClient(CONFIG);

  try {
    // Get gas price
    const gasPrice = await getGasPrice(client);
    console.log(`Current gas price: ${gasPrice} MIST`);

    // Get balance
    const balance = await getBalance(client, ADDRESSES.myAddress);
    console.log(`Balance: ${balance.totalBalance} MIST`);

    // Get all coins
    const coins = await client.getCoins({
      owner: ADDRESSES.myAddress,
      coinType: '0x2::sui::SUI'
    });
    console.log(`Number of SUI coins: ${coins.data.length}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
main().catch(console.error);