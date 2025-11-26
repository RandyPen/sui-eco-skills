import {
  createSuiClient,
  getBalance,
  getObject,
  getGasPrice,
  getSystemState,
  isValidSuiAddress
} from '../src/index';

/**
 * Basic usage examples for SuiClient
 */
async function basicUsageExamples() {
  // Create client connected to mainnet
  const client = createSuiClient({ network: 'mainnet' });

  console.log('=== Basic SuiClient Usage Examples ===\n');

  // Example 1: Check address validity
  const testAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';
  console.log(`Address ${testAddress} is valid: ${isValidSuiAddress(testAddress)}`);

  // Example 2: Get gas price
  try {
    const gasPrice = await getGasPrice(client);
    console.log(`Current gas price: ${gasPrice} MIST\n`);
  } catch (error) {
    console.log('Failed to get gas price:', error);
  }

  // Example 3: Get system state
  try {
    const systemState = await getSystemState(client);
    console.log('System state:', {
      epoch: systemState.epoch,
      protocolVersion: systemState.protocolVersion,
      totalStake: systemState.totalStake
    });
  } catch (error) {
    console.log('Failed to get system state:', error);
  }

  // Example 4: Get object (replace with actual object ID)
  const exampleObjectId = '0x0000000000000000000000000000000000000000000000000000000000000000';
  try {
    const object = await getObject(client, exampleObjectId, { showType: true });
    console.log('\nObject details:', {
      id: object.data?.objectId,
      type: object.data?.type,
      version: object.data?.version
    });
  } catch (error) {
    console.log(`Failed to get object ${exampleObjectId}:`, error.message);
  }
}

// Run examples
basicUsageExamples().catch(console.error);