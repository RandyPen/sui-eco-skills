# Usage Patterns

Common patterns and best practices for building Sui transactions in real-world applications.

## Basic Transaction Building

Simple transaction patterns for common operations:

```typescript
// Basic SUI transfer
const tx = new Transaction();
const [coin] = tx.splitCoins(tx.gas, [amount]);
tx.transferObjects([coin], recipientAddress);

// Basic Move call
tx.moveCall({
  package: '0x2',
  module: 'coin',
  function: 'transfer',
  arguments: [coin, recipient],
});

// Object transfer
tx.transferObjects([tx.object(objectId)], recipientAddress);
```

## Complex Transaction: Batch Transfers

Efficient batch processing patterns:

```typescript
interface Transfer {
  to: string;
  amount: number;
}

const transfers: Transfer[] = getTransfers();
const tx = new Transaction();

// Split multiple coins from gas coin
const coins = tx.splitCoins(
  tx.gas,
  transfers.map((transfer) => transfer.amount),
);

// Create transfer command for each coin
transfers.forEach((transfer, index) => {
  tx.transferObjects([coins[index]], transfer.to);
});

// Alternative: Use MakeMoveVec for batch operations
const amounts = transfers.map(t => tx.pure.u64(t.amount));
const recipients = transfers.map(t => tx.pure.address(t.to));

tx.moveCall({
  target: '0x2::batch::transfer_many',
  arguments: [
    tx.makeMoveVec({ elements: amounts }),
    tx.makeMoveVec({ elements: recipients }),
  ],
});
```

## Transaction Signing and Execution

Different approaches to signing and executing transactions:

### Method 1: Direct Sign and Execute

```typescript
// Most common pattern
const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
  options: {
    showEffects: true,
    showObjectChanges: true,
    showEvents: true,
    showBalanceChanges: true,
    showInput: false,
  },
});

// Access results
console.log('Transaction digest:', result.digest);
console.log('Effects:', result.effects);
console.log('Object changes:', result.objectChanges);
```

### Method 2: Separate Sign and Execute

```typescript
// Separate signing for advanced use cases
const { bytes, signature } = await tx.sign({
  client,
  signer: keypair,
});

// Can store or transmit signed transaction
const result = await client.executeTransactionBlock({
  transactionBlock: bytes,
  signature,
  options: { showEffects: true },
});
```

### Method 3: Serialized Transaction

```typescript
// Build, sign, and execute separately
const bytes = await tx.build({ client });
const signature = await keypair.signTransaction(bytes);

const result = await client.executeTransactionBlock({
  transactionBlock: bytes,
  signature: signature.signature,
  options: { showEffects: true },
});
```

## Transaction Testing

Test transactions before execution:

### Dry Run Transaction

```typescript
// Dry run to test execution without committing
const dryRunResult = await client.dryRunTransactionBlock({
  transactionBlock: await tx.build({ client }),
});

// Check results
if (dryRunResult.effects.status.status === 'success') {
  console.log('Transaction would succeed');
  console.log('Gas estimate:', dryRunResult.effects.gasUsed);
} else {
  console.log('Transaction would fail:', dryRunResult.effects.status.error);
  console.log('Diagnostics:', dryRunResult.effects.status.diagnostics);
}
```

### Dev Inspect Transaction

```typescript
// Dev inspect for detailed execution information
const devInspectResult = await client.devInspectTransactionBlock({
  transactionBlock: await tx.build({ client }),
  sender: '0xsender...',
});

// Access detailed results
console.log('Return values:', devInspectResult.results?.[0]?.returnValues);
console.log('Events:', devInspectResult.events);
console.log('Error:', devInspectResult.error);
```

## Waiting for Transaction Completion

Handle transaction confirmation and indexing:

```typescript
const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx
});

// Wait for transaction to be indexed
await client.waitForTransaction({ digest: result.digest });

// All subsequent RPC calls will reflect transaction effects
const balances = await client.getBalance({ owner: address });

// With timeout and polling options
await client.waitForTransaction({
  digest: result.digest,
  timeout: 30000, // 30 seconds
  pollInterval: 1000, // Check every second
});
```

## Error Handling Patterns

Robust error handling for transaction execution:

```typescript
async function executeTransactionWithRetry(
  tx: Transaction,
  client: SuiClient,
  signer: Keypair,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer,
      });

      await client.waitForTransaction({ digest: result.digest });
      return result;

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // Handle specific errors
      if (error.message.includes('ObjectNotFound')) {
        // Refresh object data and retry
        await refreshObjectData(tx);
      } else if (error.message.includes('InsufficientGas')) {
        // Adjust gas and retry
        await adjustGasConfiguration(tx, client);
      } else if (error.message.includes('MoveAbort')) {
        // Transaction logic error, don't retry
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

## Transaction Building Utilities

Helper functions for common patterns:

```typescript
// Batch transaction builder
async function buildBatchTransactions(
  operations: Array<() => Promise<Transaction>>,
  client: SuiClient
) {
  const transactions = await Promise.all(operations.map(op => op()));

  // Combine into single transaction if possible
  const combinedTx = new Transaction();
  transactions.forEach(tx => {
    const commands = tx.getCommands();
    const inputs = tx.getInputs();

    // Add commands and inputs from each transaction
    commands.forEach(cmd => combinedTx.addCommand(cmd));
    inputs.forEach(input => combinedTx.addInput(input));
  });

  return combinedTx;
}

// Transaction validator
async function validateTransaction(
  tx: Transaction,
  client: SuiClient,
  sender: string
): Promise<ValidationResult> {
  const validation: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    gasEstimate: null,
  };

  try {
    // Dry run for basic validation
    const dryRun = await client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client }),
      sender,
    });

    if (dryRun.effects.status.status !== 'success') {
      validation.isValid = false;
      validation.errors.push(dryRun.effects.status.error);
    }

    validation.gasEstimate = dryRun.effects.gasUsed;

    // Check for common issues
    const commands = tx.getCommands();
    if (commands.length > 50) {
      validation.warnings.push('Large transaction: may have high gas costs');
    }

    // Check object ownership
    const inputs = tx.getInputs();
    const objectInputs = inputs.filter(input => input.$kind === 'Object');

    for (const input of objectInputs) {
      try {
        const object = await client.getObject({
          id: input.value.objectId,
          options: { showOwner: true },
        });

        if (object.data.owner !== sender) {
          validation.warnings.push(
            `Object ${input.value.objectId} not owned by sender`
          );
        }
      } catch (error) {
        validation.errors.push(`Object ${input.value.objectId} not found`);
      }
    }

  } catch (error) {
    validation.isValid = false;
    validation.errors.push(error.message);
  }

  return validation;
}
```

## Performance Optimization Patterns

Optimize transaction building for performance:

```typescript
// Pre-fetch pattern for multiple transactions
async function buildTransactionsWithPrefetch(
  operations: Array<{ type: string, params: any }>,
  client: SuiClient
) {
  // Identify all object IDs needed
  const objectIds = new Set<string>();
  operations.forEach(op => {
    if (op.type === 'transfer' && op.params.objectId) {
      objectIds.add(op.params.objectId);
    }
    // Add other object ID extraction logic
  });

  // Pre-fetch all objects
  const objects = await Promise.all(
    Array.from(objectIds).map(id =>
      client.getObject({ id, options: { showContent: true } })
    )
  );

  const objectMap = new Map(
    objects.map(obj => [obj.data.objectId, obj.data])
  );

  // Build transactions with cached objects
  const transactions = operations.map(op => {
    const tx = new Transaction();

    switch (op.type) {
      case 'transfer':
        const objectData = objectMap.get(op.params.objectId);
        if (objectData) {
          tx.transferObjects([tx.object(objectData)], op.params.recipient);
        }
        break;
      // Handle other operation types
    }

    return tx;
  });

  return transactions;
}
```

## Transaction Monitoring

Monitor transaction execution and performance:

```typescript
class TransactionMonitor {
  private metrics = {
    startTime: 0,
    endTime: 0,
    gasUsed: 0,
    success: false,
    errors: [] as string[],
  };

  async executeWithMonitoring(
    tx: Transaction,
    client: SuiClient,
    signer: Keypair
  ) {
    this.metrics.startTime = Date.now();

    try {
      // Dry run for gas estimation
      const dryRun = await client.dryRunTransactionBlock({
        transactionBlock: await tx.build({ client }),
        sender: signer.toSuiAddress(),
      });

      this.metrics.gasUsed = dryRun.effects.gasUsed.computationCost +
                            dryRun.effects.gasUsed.storageCost;

      // Execute
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer,
      });

      await client.waitForTransaction({ digest: result.digest });

      this.metrics.endTime = Date.now();
      this.metrics.success = true;

      return result;

    } catch (error) {
      this.metrics.endTime = Date.now();
      this.metrics.success = false;
      this.metrics.errors.push(error.message);
      throw error;
    } finally {
      this.logMetrics();
    }
  }

  private logMetrics() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    console.log({
      duration: `${duration}ms`,
      gasUsed: this.metrics.gasUsed,
      success: this.metrics.success,
      errors: this.metrics.errors,
    });
  }
}
```

## Best Practices

1. **Always test with dry run**: Prevent failed transactions and wasted gas
2. **Use appropriate signing method**: Choose based on use case requirements
3. **Implement proper error handling**: Handle network errors, object not found, etc.
4. **Monitor transaction performance**: Track gas usage and execution time
5. **Batch operations when possible**: Reduce gas costs and improve efficiency
6. **Validate inputs before building**: Check object ownership and parameter validity