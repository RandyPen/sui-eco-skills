import {
  createSuiClient,
  queryEvents,
  getStakes,
  getObjects,
  waitForTransaction
} from '../src/index';

/**
 * Advanced usage examples for SuiClient
 */
async function advancedExamples() {
  const client = createSuiClient({ network: 'mainnet' });

  console.log('=== Advanced SuiClient Examples ===\n');

  // Example 1: Query events
  try {
    const events = await queryEvents(client, {
      MoveEventType: '0x3::validator::StakingRequestEvent'
    }, 5);

    console.log('Recent staking events:', {
      count: events.data.length,
      events: events.data.map(e => ({
        type: e.type,
        timestamp: e.timestampMs
      }))
    });
  } catch (error) {
    console.log('Failed to query events:', error.message);
  }

  // Example 2: Get stakes for address
  const exampleOwner = '0x0000000000000000000000000000000000000000000000000000000000000000';
  try {
    const stakes = await getStakes(client, exampleOwner);
    console.log('\nStaking information:', {
      activeStakes: stakes.length,
      totalStaked: stakes.reduce((sum, stake) => {
        const principal = stake.principal?.value || '0';
        return sum + BigInt(principal);
      }, 0n)
    });
  } catch (error) {
    console.log(`Failed to get stakes for ${exampleOwner}:`, error.message);
  }

  // Example 3: Batch get objects
  const exampleObjectIds = [
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000001'
  ];

  try {
    const objects = await getObjects(client, exampleObjectIds, { showType: true });
    console.log('\nBatch object results:', {
      found: objects.filter(o => o.data).length,
      notFound: objects.filter(o => o.error).length
    });
  } catch (error) {
    console.log('Failed to batch get objects:', error.message);
  }

  // Example 4: Network information
  try {
    const protocolConfig = await client.getProtocolConfig();
    const chainId = await client.getChainIdentifier();
    const currentEpoch = await client.getCurrentEpoch();

    console.log('\nNetwork information:', {
      chainId,
      protocolVersion: protocolConfig.attributes.protocolVersion,
      currentEpoch: currentEpoch.epoch
    });
  } catch (error) {
    console.log('Failed to get network information:', error.message);
  }

  // Example 5: Error handling patterns
  console.log('\n=== Error Handling Examples ===');

  const invalidObjectId = '0xinvalid';
  try {
    await client.getObject({ id: invalidObjectId });
  } catch (error) {
    console.log('Error handling example:');
    console.log(`- Error type: ${error.constructor.name}`);
    console.log(`- Error message: ${error.message}`);

    // Check for specific error types
    if (error.message?.includes('not found')) {
      console.log('- Object not found error');
    } else if (error.message?.includes('invalid')) {
      console.log('- Invalid input error');
    }
  }
}

// Run examples
advancedExamples().catch(console.error);