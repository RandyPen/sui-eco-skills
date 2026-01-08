# Advanced Features

Advanced transaction features enable complex use cases like sponsored transactions, transaction intents, and plugin systems.

## Transaction Intents

Transaction intents make it easier for third-party SDKs and transaction plugins to add complex operations to transactions.

### CoinWithBalance Intent

Create coins with specific balances without explicit splitting:

```typescript
import { coinWithBalance, Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

// Set sender (required when not using gas coin)
tx.setSender(keypair.toSuiAddress());

tx.transferObjects(
  [
    // Create SUI coin (balance unit: MIST)
    coinWithBalance({ balance: 100 }),
    // Create other type of coin
    coinWithBalance({ balance: 100, type: '0x123::foo::Bar' }),
  ],
  recipient,
);

// Sponsored transaction: don't use gas coin
coinWithBalance({ balance: 100, useGasCoin: false });
```

### Custom Intents

Create custom transaction intents:

```typescript
import { Transaction, Intent } from '@mysten/sui/transactions';

// Define custom intent
const customIntent = Intent('custom-action', {
  action: 'mint-nft',
  metadata: { name: 'My NFT', image: 'ipfs://...' },
});

// Use in transaction
const tx = new Transaction();
const [nft] = tx.intent(customIntent);
tx.transferObjects([nft], recipient);
```

## Sponsored Transactions

Sponsored transactions allow one party to pay gas fees for another party's transaction.

### Building Sponsored Transactions

```typescript
const tx = new Transaction();
// ... Add transaction commands

// Build transaction kind bytes (without gas data)
const kindBytes = await tx.build({ provider, onlyTransactionKind: true });

// Build sponsored transaction from kind bytes
const sponsoredTx = Transaction.fromKind(kindBytes);

// Set sponsored transaction data
sponsoredTx.setSender(sender);
sponsoredTx.setGasOwner(sponsor);
sponsoredTx.setGasPayment(sponsorCoins);

// Sponsor signs and executes
const sponsorResult = await client.signAndExecuteTransaction({
  transaction: sponsoredTx,
  signer: sponsorKeypair,
});
```

### Sponsor Verification

```typescript
// Verify transaction before sponsoring
async function verifyTransactionForSponsorship(
  kindBytes: Uint8Array,
  sender: string,
  expectedActions: string[]
) {
  const tx = Transaction.fromKind(kindBytes);

  // Verify sender
  if (tx.getSender() && tx.getSender() !== sender) {
    throw new Error('Sender mismatch');
  }

  // Verify commands
  const commands = tx.getCommands();
  const commandTypes = commands.map(cmd => cmd.$kind);

  // Check for allowed actions
  const hasDisallowedAction = commandTypes.some(type =>
    !expectedActions.includes(type)
  );

  if (hasDisallowedAction) {
    throw new Error('Transaction contains disallowed actions');
  }

  return { tx, commands, commandTypes };
}
```

## Plugin System

Transaction supports a plugin system for extending functionality:

### Build Plugins

Transform transaction data during build phase:

```typescript
import { Transaction, TransactionPlugin } from '@mysten/sui/transactions';

// Define build plugin
const analyticsPlugin: TransactionPlugin = {
  name: 'analytics',
  async transform(txData) {
    // Add analytics metadata
    return {
      ...txData,
      metadata: {
        ...txData.metadata,
        analytics: {
          timestamp: Date.now(),
          commandCount: txData.commands.length,
          inputCount: txData.inputs.length,
        },
      },
    };
  },
};

// Use plugin
const tx = new Transaction();
tx.use(analyticsPlugin);
// ... add commands
```

### Serialization Plugins

Handle serialization-specific logic:

```typescript
const compressionPlugin: TransactionPlugin = {
  name: 'compression',
  async serialize(txData) {
    // Compress large pure values
    const compressedInputs = txData.inputs.map(input => {
      if (input.$kind === 'Pure' && input.value.length > 1000) {
        // Compress large pure values
        return {
          ...input,
          value: compress(input.value),
          compressed: true,
        };
      }
      return input;
    });

    return {
      ...txData,
      inputs: compressedInputs,
    };
  },
};
```

### Intent Resolvers

Resolve transaction intents into concrete operations:

```typescript
const nftMintResolver: TransactionPlugin = {
  name: 'nft-mint-resolver',
  async resolve(intent, tx) {
    if (intent.$kind === 'nft-mint') {
      const [nft] = tx.moveCall({
        target: `${intent.package}::nft::mint`,
        arguments: [
          tx.pure.string(intent.metadata.name),
          tx.pure.string(intent.metadata.description),
          tx.pure.string(intent.metadata.image),
        ],
      });
      return nft;
    }
    return null;
  },
};
```

## Async Transaction Support

Supports async transaction thunks and Promise-based execution flow.

### Async Command Building

```typescript
// Async command generation
async function buildComplexTransaction(client: SuiClient) {
  const tx = new Transaction();

  // Fetch data async and use in transaction
  const nfts = await client.getOwnedObjects({
    owner: senderAddress,
    filter: { StructType: '0x2::nft::NFT' },
  });

  // Use async data in transaction
  nfts.data.forEach(nft => {
    tx.transferObjects([tx.object(nft.data.objectId)], recipient);
  });

  return tx;
}

// Async input resolution
const tx = new Transaction();
const dynamicInput = await fetchDynamicInput();
tx.moveCall({
  target: '0x2::example::process',
  arguments: [tx.pure(dynamicInput)],
});
```

### Promise-based Flow

```typescript
// Chain async operations
async function createAndExecuteTransaction() {
  const tx = new Transaction();

  // Async command that returns a promise
  const coinPromise = tx.splitCoins(tx.gas, [100]);

  // Continue building while promise resolves
  tx.moveCall({
    target: '0x2::example::operation',
    arguments: [tx.object(someObject)],
  });

  // Use resolved coin
  const [coin] = await coinPromise;
  tx.transferObjects([coin], recipient);

  // Execute
  return await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });
}
```

## Transaction Hooks

Add hooks for transaction lifecycle events:

```typescript
// Custom transaction class with hooks
class MonitoredTransaction extends Transaction {
  private hooks = {
    beforeBuild: [] as Array<() => void>,
    afterBuild: [] as Array<(bytes: Uint8Array) => void>,
  };

  on(event: 'beforeBuild' | 'afterBuild', callback: any) {
    this.hooks[event].push(callback);
    return this;
  }

  async build(options?: any) {
    // Run beforeBuild hooks
    this.hooks.beforeBuild.forEach(hook => hook());

    const bytes = await super.build(options);

    // Run afterBuild hooks
    this.hooks.afterBuild.forEach(hook => hook(bytes));

    return bytes;
  }
}

// Usage
const tx = new MonitoredTransaction();
tx.on('beforeBuild', () => console.log('Building transaction...'));
tx.on('afterBuild', (bytes) => console.log(`Built ${bytes.length} bytes`));
```

## Multi-signature Transactions

Build transactions requiring multiple signatures:

```typescript
// Build multi-sig transaction
async function buildMultiSigTransaction(
  client: SuiClient,
  senders: string[],
  threshold: number
) {
  const tx = new Transaction();

  // Transaction requires approval from multiple parties
  tx.setSender(senders[0]); // Primary sender

  // Add multi-sig metadata
  tx.moveCall({
    target: '0x2::multisig::create_proposal',
    arguments: [
      tx.pure.vector('address', senders),
      tx.pure.u8(threshold),
      // ... proposal details
    ],
  });

  // Build for each signer to sign
  const bytes = await tx.build({ client });

  return {
    bytes,
    signers: senders,
    threshold,
  };
}
```

## Transaction Simulation

Simulate transaction execution without committing:

```typescript
async function simulateTransaction(tx: Transaction, client: SuiClient, sender: string) {
  // Dry run for effects
  const dryRun = await client.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client }),
    sender,
  });

  // Dev inspect for detailed execution
  const devInspect = await client.devInspectTransactionBlock({
    transactionBlock: await tx.build({ client }),
    sender,
  });

  return {
    dryRun,
    devInspect,
    success: dryRun.effects.status.status === 'success',
    gasUsed: dryRun.effects.gasUsed,
    events: dryRun.effects.events,
    objectChanges: dryRun.effects.objectChanges,
    returnValues: devInspect.results?.[0]?.returnValues,
  };
}
```

## Best Practices

1. **Use intents for abstraction**: Hide complex logic behind simple intent interfaces
2. **Validate sponsored transactions**: Always verify transaction content before sponsoring
3. **Test plugins thoroughly**: Plugins can affect transaction serialization and execution
4. **Handle async errors**: Ensure proper error handling in async command building
5. **Monitor transaction lifecycle**: Use hooks for debugging and monitoring