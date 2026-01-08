# Workflows

Complete end-to-end workflows for common transaction building scenarios. These workflows demonstrate practical applications of transaction building concepts.

## Workflow 1: Simple SUI Transfer

Transfer SUI tokens between addresses:

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function transferSUI(
  client: SuiClient,
  signer: Ed25519Keypair,
  recipient: string,
  amount: number
) {
  const tx = new Transaction();

  // Split specified amount from gas coin
  const [coin] = tx.splitCoins(tx.gas, [amount]);

  // Transfer coin
  tx.transferObjects([coin], recipient);

  // Execute transaction
  return await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true },
  });
}

// Usage example
async function main() {
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
  const keypair = Ed25519Keypair.fromSecretKey('your-secret-key');
  const recipient = '0xrecipient...';

  try {
    const result = await transferSUI(client, keypair, recipient, 100_000_000); // 0.1 SUI
    console.log('Transfer successful:', result.digest);

    // Wait for confirmation
    await client.waitForTransaction({ digest: result.digest });
    console.log('Transaction confirmed');

  } catch (error) {
    console.error('Transfer failed:', error.message);
  }
}
```

### Enhanced Transfer with Validation

```typescript
async function safeTransferSUI(
  client: SuiClient,
  signer: Ed25519Keypair,
  recipient: string,
  amount: number
) {
  // Validate inputs
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (!recipient.match(/^0x[0-9a-f]{64}$/)) {
    throw new Error('Invalid recipient address');
  }

  // Check sender balance
  const senderBalance = await client.getBalance({
    owner: signer.toSuiAddress(),
  });

  if (parseInt(senderBalance.totalBalance) < amount) {
    throw new Error(`Insufficient balance: ${senderBalance.totalBalance} < ${amount}`);
  }

  // Build transaction
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], recipient);

  // Dry run to estimate gas
  const dryRun = await client.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client }),
    sender: signer.toSuiAddress(),
  });

  if (dryRun.effects.status.status !== 'success') {
    throw new Error(`Transaction would fail: ${dryRun.effects.status.error}`);
  }

  // Execute with gas buffer
  const gasNeeded = dryRun.effects.gasUsed.computationCost +
                   dryRun.effects.gasUsed.storageCost;
  const gasWithBuffer = Math.ceil(gasNeeded * 1.2);

  // Check if sender has enough for gas
  if (parseInt(senderBalance.totalBalance) < amount + gasWithBuffer) {
    throw new Error(`Insufficient balance for amount + gas`);
  }

  // Execute transaction
  return await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true },
  });
}
```

## Workflow 2: Batch NFT Minting and Distribution

Mint multiple NFTs and distribute them to different recipients:

```typescript
import { Transaction } from '@mysten/sui/transactions';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Record<string, string>;
}

async function batchMintNFTs(
  client: SuiClient,
  signer: Keypair,
  recipients: string[],
  metadata: NFTMetadata[]
) {
  if (recipients.length !== metadata.length) {
    throw new Error('Recipients and metadata arrays must have same length');
  }

  const tx = new Transaction();

  // Batch mint NFTs
  const nfts = [];
  for (let i = 0; i < recipients.length; i++) {
    const [nft] = tx.moveCall({
      target: '0x2::devnet_nft::mint',
      arguments: [
        tx.pure.string(metadata[i].name),
        tx.pure.string(metadata[i].description),
        tx.pure.string(metadata[i].image),
      ],
    });
    nfts.push(nft);
  }

  // Distribute NFTs to corresponding recipients
  recipients.forEach((recipient, index) => {
    tx.transferObjects([nfts[index]], recipient);
  });

  return await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
  });
}

// Usage with error handling
async function mintAndDistributeNFTs() {
  const client = new SuiClient({ url: TESTNET_URL });
  const keypair = Ed25519Keypair.fromSecretKey('your-secret-key');

  const recipients = [
    '0xrecipient1...',
    '0xrecipient2...',
    '0xrecipient3...',
  ];

  const metadata = [
    { name: 'NFT #1', description: 'First NFT', image: 'ipfs://Qm...1' },
    { name: 'NFT #2', description: 'Second NFT', image: 'ipfs://Qm...2' },
    { name: 'NFT #3', description: 'Third NFT', image: 'ipfs://Qm...3' },
  ];

  try {
    console.log('Starting batch NFT minting...');

    const result = await batchMintNFTs(client, keypair, recipients, metadata);
    console.log('Batch mint successful:', result.digest);

    // Wait for confirmation
    await client.waitForTransaction({ digest: result.digest });

    // Verify NFTs were created
    for (let i = 0; i < recipients.length; i++) {
      const objects = await client.getOwnedObjects({
        owner: recipients[i],
        filter: { StructType: '0x2::devnet_nft::NFT' },
      });
      console.log(`Recipient ${i + 1} now has ${objects.data.length} NFTs`);
    }

  } catch (error) {
    console.error('Batch mint failed:', error.message);

    // Check if it's a gas issue
    if (error.message.includes('InsufficientGas')) {
      console.log('Try increasing gas budget or consolidating coins');
    }
  }
}
```

### Optimized Batch Minting

```typescript
async function optimizedBatchMint(
  client: SuiClient,
  signer: Keypair,
  recipients: string[],
  metadata: NFTMetadata[]
) {
  const tx = new Transaction();

  // Use a single Move call for batch minting if supported
  // This is more gas-efficient than multiple individual calls

  // Prepare batch arguments
  const names = metadata.map(m => tx.pure.string(m.name));
  const descriptions = metadata.map(m => tx.pure.string(m.description));
  const images = metadata.map(m => tx.pure.string(m.image));

  // Batch mint (assuming contract supports batch mint)
  const mintedNFTs = tx.moveCall({
    target: '0x2::nft::batch_mint',
    arguments: [
      tx.makeMoveVec({ elements: names }),
      tx.makeMoveVec({ elements: descriptions }),
      tx.makeMoveVec({ elements: images }),
    ],
  });

  // Distribute NFTs
  recipients.forEach((recipient, index) => {
    tx.transferObjects([mintedNFTs[index]], recipient);
  });

  // Estimate gas before execution
  const dryRun = await client.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client }),
    sender: signer.toSuiAddress(),
  });

  const gasEstimate = dryRun.effects.gasUsed.computationCost +
                     dryRun.effects.gasUsed.storageCost;

  console.log(`Estimated gas for ${recipients.length} NFTs: ${gasEstimate}`);

  // Execute
  return await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true, showObjectChanges: true },
  });
}
```

## Workflow 3: Offline Transaction Building

Build transactions without network access for signing elsewhere:

```typescript
import { Transaction, Inputs } from '@mysten/sui/transactions';

interface OfflineTransferParams {
  sender: string;
  recipient: string;
  coinRef: {
    objectId: string;
    version: string;
    digest: string;
  };
  amount?: number; // Optional: split specific amount
}

function buildOfflineTransaction(params: OfflineTransferParams): {
  tx: Transaction;
  bytes: Promise<Uint8Array>;
} {
  const tx = new Transaction();

  // Set sender (required for offline building)
  tx.setSender(params.sender);

  if (params.amount) {
    // Split specific amount from coin
    const coin = tx.object(Inputs.ObjectRef(params.coinRef));
    const [splitCoin] = tx.splitCoins(coin, [params.amount]);
    tx.transferObjects([splitCoin], params.recipient);
  } else {
    // Transfer entire coin
    tx.transferObjects([
      tx.object(Inputs.ObjectRef(params.coinRef))
    ], params.recipient);
  }

  // Set gas configuration for offline building
  // Note: Gas price and budget should be estimated based on network conditions
  tx.setGasPrice(1000); // Example gas price
  tx.setGasBudget(50_000_000); // Example budget

  // Return transaction and bytes promise
  return {
    tx,
    bytes: tx.build(), // No client parameter for offline build
  };
}

// Usage: Build offline, sign elsewhere, execute online
async function offlineWorkflow() {
  // Step 1: Build offline
  const params = {
    sender: '0xsender...',
    recipient: '0xrecipient...',
    coinRef: {
      objectId: '0xcoin...',
      version: '123',
      digest: 'base64digest...',
    },
    amount: 100_000_000, // 0.1 SUI
  };

  const { tx, bytes: bytesPromise } = buildOfflineTransaction(params);

  // Step 2: Get bytes (can be done offline)
  const bytes = await bytesPromise;

  // Step 3: Sign (can be done on secure device)
  const keypair = Ed25519Keypair.fromSecretKey('your-secret-key');
  const signature = await keypair.signTransaction(bytes);

  // Step 4: Execute online
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
  const result = await client.executeTransactionBlock({
    transactionBlock: bytes,
    signature,
  });

  return result;
}
```

### Offline Transaction with Multiple Operations

```typescript
interface OfflineBatchOperation {
  type: 'transfer' | 'moveCall' | 'split' | 'merge';
  params: any;
}

async function buildComplexOfflineTransaction(
  sender: string,
  operations: OfflineBatchOperation[],
  gasConfig: {
    price: number;
    budget: number;
    payment?: any[]; // Fully resolved gas coin references
  }
): Promise<Uint8Array> {
  const tx = new Transaction();
  tx.setSender(sender);

  // Apply operations
  operations.forEach(op => {
    switch (op.type) {
      case 'transfer':
        tx.transferObjects(
          op.params.objects.map((obj: any) => tx.object(Inputs.ObjectRef(obj))),
          op.params.recipient
        );
        break;

      case 'moveCall':
        tx.moveCall({
          target: op.params.target,
          arguments: op.params.arguments.map((arg: any) => {
            if (arg.type === 'object') {
              return tx.object(Inputs.ObjectRef(arg.value));
            } else if (arg.type === 'pure') {
              return tx.pure(arg.value);
            }
            throw new Error(`Unknown argument type: ${arg.type}`);
          }),
        });
        break;

      case 'split':
        const coin = tx.object(Inputs.ObjectRef(op.params.coin));
        tx.splitCoins(coin, op.params.amounts);
        break;

      case 'merge':
        const target = tx.object(Inputs.ObjectRef(op.params.target));
        const sources = op.params.sources.map((src: any) =>
          tx.object(Inputs.ObjectRef(src))
        );
        tx.mergeCoins(target, sources);
        break;
    }
  });

  // Set gas configuration
  tx.setGasPrice(gasConfig.price);
  tx.setGasBudget(gasConfig.budget);
  if (gasConfig.payment) {
    tx.setGasPayment(gasConfig.payment.map(ref => Inputs.ObjectRef(ref)));
  }

  // Build offline
  return await tx.build();
}
```

## Workflow 4: Multi-step Transaction with Conditional Logic

Build transactions with conditional operations:

```typescript
async function conditionalTransaction(
  client: SuiClient,
  signer: Keypair,
  conditions: {
    checkBalance: boolean;
    minBalance?: number;
    createNFT?: boolean;
    transferIfCreated?: boolean;
  }
) {
  const tx = new Transaction();
  const sender = signer.toSuiAddress();

  // Step 1: Check balance if requested
  if (conditions.checkBalance && conditions.minBalance) {
    // Note: This check happens off-chain, transaction proceeds regardless
    const balance = await client.getBalance({ owner: sender });
    if (parseInt(balance.totalBalance) < conditions.minBalance) {
      throw new Error(`Balance below minimum: ${balance.totalBalance} < ${conditions.minBalance}`);
    }
  }

  // Step 2: Create NFT if requested
  let nftResult;
  if (conditions.createNFT) {
    [nftResult] = tx.moveCall({
      target: '0x2::devnet_nft::mint',
      arguments: [
        tx.pure.string('Conditional NFT'),
        tx.pure.string('Created based on conditions'),
        tx.pure.string('ipfs://Qm...'),
      ],
    });
  }

  // Step 3: Transfer NFT if created and requested
  if (conditions.createNFT && conditions.transferIfCreated && nftResult) {
    tx.transferObjects([nftResult], '0xrecipient...');
  }

  // Always transfer some SUI
  const [suiCoin] = tx.splitCoins(tx.gas, [10_000_000]); // 0.01 SUI
  tx.transferObjects([suiCoin], '0xrecipient...');

  // Execute
  return await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
  });
}
```

## Workflow 5: Transaction with Error Recovery

Build transactions with built-in error recovery mechanisms:

```typescript
async function resilientTransaction(
  client: SuiClient,
  signer: Keypair,
  primaryAction: () => Promise<Transaction>,
  fallbackAction?: () => Promise<Transaction>
) {
  let tx: Transaction;

  try {
    // Try primary action
    tx = await primaryAction();
  } catch (primaryError) {
    console.warn('Primary action failed, trying fallback:', primaryError.message);

    if (!fallbackAction) {
      throw primaryError;
    }

    // Try fallback action
    tx = await fallbackAction();
  }

  // Add recovery mechanism: split and keep some gas
  const [recoveryCoin] = tx.splitCoins(tx.gas, [1_000_000]); // Keep 0.001 SUI for recovery

  // Execute with enhanced error handling
  try {
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer,
    });

    // If successful, merge recovery coin back
    const recoveryTx = new Transaction();
    recoveryTx.mergeCoins(tx.gas, [recoveryCoin]);

    await client.signAndExecuteTransaction({
      transaction: recoveryTx,
      signer,
    });

    return result;

  } catch (executionError) {
    console.error('Transaction execution failed:', executionError.message);

    // Check if we have recovery coin
    const recoveryBalance = await client.getBalance({
      owner: signer.toSuiAddress(),
    });

    if (parseInt(recoveryBalance.totalBalance) < 2_000_000) {
      console.warn('Low balance after failed transaction, consider emergency recovery');
    }

    throw executionError;
  }
}
```

## Workflow 6: Scheduled Transaction Building

Prepare transactions for scheduled execution:

```typescript
interface ScheduledTransaction {
  id: string;
  tx: Transaction;
  executeAt: Date;
  conditions?: {
    minBalance?: number;
    maxGasPrice?: number;
    requiredObjects?: string[];
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

class TransactionScheduler {
  private scheduled: ScheduledTransaction[] = [];
  private client: SuiClient;

  constructor(client: SuiClient) {
    this.client = client;
  }

  schedule(transaction: ScheduledTransaction) {
    this.scheduled.push(transaction);
    this.scheduled.sort((a, b) => a.executeAt.getTime() - b.executeAt.getTime());
  }

  async processScheduled() {
    const now = new Date();
    const toExecute = this.scheduled.filter(st => st.executeAt <= now);

    for (const scheduled of toExecute) {
      try {
        // Check conditions
        if (scheduled.conditions) {
          const canExecute = await this.checkConditions(scheduled);
          if (!canExecute) {
            console.log(`Conditions not met for ${scheduled.id}, rescheduling`);
            scheduled.executeAt = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
            continue;
          }
        }

        // Execute transaction
        await this.executeWithRetry(scheduled);

        // Remove from scheduled list
        this.scheduled = this.scheduled.filter(st => st.id !== scheduled.id);

      } catch (error) {
        console.error(`Failed to execute scheduled transaction ${scheduled.id}:`, error.message);

        // Handle retries
        if (scheduled.retryConfig) {
          await this.handleRetry(scheduled, error);
        }
      }
    }
  }

  private async checkConditions(scheduled: ScheduledTransaction): Promise<boolean> {
    const conditions = scheduled.conditions!;
    const sender = scheduled.tx.getSender();

    if (!sender) {
      return false;
    }

    // Check balance condition
    if (conditions.minBalance) {
      const balance = await this.client.getBalance({ owner: sender });
      if (parseInt(balance.totalBalance) < conditions.minBalance) {
        return false;
      }
    }

    // Check gas price condition
    if (conditions.maxGasPrice) {
      const gasPrice = await this.client.getReferenceGasPrice();
      if (gasPrice > conditions.maxGasPrice) {
        return false;
      }
    }

    // Check required objects
    if (conditions.requiredObjects) {
      for (const objectId of conditions.requiredObjects) {
        try {
          await this.client.getObject({ id: objectId });
        } catch {
          return false; // Object not found or inaccessible
        }
      }
    }

    return true;
  }

  private async executeWithRetry(scheduled: ScheduledTransaction) {
    const retryConfig = scheduled.retryConfig || { maxRetries: 3, retryDelay: 1000 };

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // Rebuild transaction to get fresh object versions
        const freshTx = await this.rebuildTransaction(scheduled.tx);

        const result = await this.client.signAndExecuteTransaction({
          transaction: freshTx,
          signer: await this.getSigner(), // Implement signer retrieval
        });

        console.log(`Scheduled transaction ${scheduled.id} executed successfully`);
        return result;

      } catch (error) {
        if (attempt === retryConfig.maxRetries) {
          throw error;
        }

        console.log(`Attempt ${attempt} failed, retrying in ${retryConfig.retryDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay));
      }
    }
  }

  private async rebuildTransaction(tx: Transaction): Promise<Transaction> {
    // Create new transaction with same commands but fresh inputs
    const newTx = new Transaction();
    const commands = tx.getCommands();

    // Re-add commands with fresh object references
    // This is a simplified example - real implementation would need to
    // handle different command types and input resolutions
    commands.forEach(command => {
      // Implementation depends on command structure
    });

    return newTx;
  }

  private async handleRetry(scheduled: ScheduledTransaction, error: any) {
    // Implement retry logic
    const retryConfig = scheduled.retryConfig!;

    // Simple exponential backoff
    const delay = Math.min(
      retryConfig.retryDelay * Math.pow(2, scheduled.retryCount || 0),
      5 * 60 * 1000 // Max 5 minutes
    );

    scheduled.executeAt = new Date(Date.now() + delay);
    scheduled.retryCount = (scheduled.retryCount || 0) + 1;

    if (scheduled.retryCount > retryConfig.maxRetries) {
      console.error(`Max retries exceeded for ${scheduled.id}`);
      this.scheduled = this.scheduled.filter(st => st.id !== scheduled.id);
    }
  }
}
```

## Best Practices for Workflows

1. **Validate inputs early**: Check parameters before building transactions
2. **Estimate gas costs**: Use dry run to estimate gas before execution
3. **Implement error recovery**: Plan for partial failures and retries
4. **Monitor execution**: Track transaction success rates and performance
5. **Test thoroughly**: Test workflows with different inputs and conditions
6. **Document assumptions**: Clearly document any assumptions about network state or object availability