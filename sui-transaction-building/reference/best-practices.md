# Best Practices

Following best practices ensures reliable, efficient, and secure transaction building on Sui.

## Performance Optimization

### 1. Use Unresolved Object IDs

Prefer `tx.object(id)` over fully resolved object references when possible:

```typescript
// Good: Uses cached object versions
tx.object('0x123');

// Avoid unless necessary: requires full object data
tx.object(Inputs.ObjectRef({ digest, objectId, version }));
```

**Why**: Unresolved object IDs allow executors to use cached object versions, reducing RPC calls and improving performance.

### 2. Batch Operations

Combine multiple operations into single transactions:

```typescript
// Good: Single split with multiple amounts
const amounts = [100, 200, 300];
const coins = tx.splitCoins(tx.gas, amounts);

// Avoid: Multiple individual splits
const coin1 = tx.splitCoins(tx.gas, [100])[0];
const coin2 = tx.splitCoins(tx.gas, [200])[0];
const coin3 = tx.splitCoins(tx.gas, [300])[0];
```

**Why**: Batch operations reduce transaction count, saving gas and improving throughput.

### 3. Appropriate Gas Configuration

Only override default gas configuration when necessary:

```typescript
// Good: Let SDK handle gas estimation
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});

// Use only when you have specific requirements
tx.setGasBudget(customBudget);
tx.setGasPrice(customPrice);
```

**Why**: Automatic gas estimation is optimized for current network conditions.

### 4. Minimize Transaction Size

Keep transactions lean:

```typescript
// Good: Compact representation
const data = { a: 1, b: 2, c: 3 };
tx.pure(bcs.serialize(data));

// Avoid: Large inline data
tx.pure.string(JSON.stringify(veryLargeObject));
```

**Why**: Smaller transactions cost less gas and execute faster.

## Error Handling

### 1. Comprehensive Error Handling

```typescript
try {
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });

  // Wait for transaction completion
  await client.waitForTransaction({ digest: result.digest });

  return result;

} catch (error) {
  // Handle specific error types
  if (error instanceof SuiHTTPStatusError) {
    console.error('HTTP error:', error.status, error.message);
    // Retry logic for transient errors
  } else if (error instanceof SuiObjectNotFoundError) {
    console.error('Object not found');
    // Refresh object data or notify user
  } else if (error.message.includes('InsufficientGas')) {
    console.error('Insufficient gas');
    // Adjust gas configuration
  } else if (error.message.includes('MoveAbort')) {
    console.error('Move execution failed:', error.message);
    // Fix transaction logic
  } else {
    console.error('Unknown error:', error);
    // Generic error handling
  }
  throw error;
}
```

### 2. Pre-execution Validation

```typescript
async function validateBeforeExecution(tx: Transaction, client: SuiClient, sender: string) {
  // Dry run to catch errors early
  const dryRun = await client.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client }),
    sender,
  });

  if (dryRun.effects.status.status !== 'success') {
    throw new Error(`Transaction validation failed: ${dryRun.effects.status.error}`);
  }

  // Check gas estimate
  const gasEstimate = dryRun.effects.gasUsed.computationCost +
                     dryRun.effects.gasUsed.storageCost;

  if (gasEstimate > MAX_ALLOWED_GAS) {
    throw new Error(`Gas estimate too high: ${gasEstimate}`);
  }

  return dryRun;
}
```

### 3. Retry Logic

```typescript
async function executeWithRetry(
  tx: Transaction,
  client: SuiClient,
  signer: Keypair,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.signAndExecuteTransaction({
        transaction: tx,
        signer,
      });
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Refresh transaction data if needed
      if (error.message.includes('ObjectNotFound')) {
        tx = await refreshTransaction(tx, client);
      }
    }
  }
}
```

## Security Considerations

### 1. Verify Object Ownership

Ensure objects used in transactions belong to the sender:

```typescript
async function verifyObjectOwnership(
  objectId: string,
  expectedOwner: string,
  client: SuiClient
) {
  const object = await client.getObject({
    id: objectId,
    options: { showOwner: true },
  });

  if (!object.data.owner) {
    throw new Error(`Object ${objectId} has no owner`);
  }

  const ownerAddress = typeof object.data.owner === 'string'
    ? object.data.owner
    : object.data.owner.AddressOwner;

  if (ownerAddress !== expectedOwner) {
    throw new Error(`Object ${objectId} owned by ${ownerAddress}, expected ${expectedOwner}`);
  }

  return true;
}
```

### 2. Check Gas Balance

Ensure sufficient SUI to pay gas fees:

```typescript
async function checkGasBalance(
  owner: string,
  requiredGas: number,
  client: SuiClient
) {
  const balance = await client.getBalance({ owner });

  if (parseInt(balance.totalBalance) < requiredGas) {
    throw new Error(
      `Insufficient gas balance: ${balance.totalBalance} < ${requiredGas}`
    );
  }

  return parseInt(balance.totalBalance);
}
```

### 3. Validate Recipient Addresses

Confirm recipient address format is correct:

```typescript
function validateSuiAddress(address: string): boolean {
  // Sui addresses are 32 bytes, hex encoded with 0x prefix
  const pattern = /^0x[0-9a-f]{64}$/i;
  return pattern.test(address);
}

function validateAndNormalizeAddress(address: string): string {
  if (!validateSuiAddress(address)) {
    throw new Error(`Invalid Sui address: ${address}`);
  }
  return address.toLowerCase(); // Normalize to lowercase
}
```

### 4. Use Latest Object Versions

Avoid using outdated object versions:

```typescript
async function getLatestObjectVersion(
  objectId: string,
  client: SuiClient
) {
  const object = await client.getObject({
    id: objectId,
    options: { showPreviousTransaction: true },
  });

  return {
    objectId: object.data.objectId,
    version: object.data.version,
    digest: object.data.digest,
    lastTransaction: object.data.previousTransaction,
  };
}
```

## Code Quality

### 1. Type Safety

Use TypeScript to catch errors at compile time:

```typescript
// Define interfaces for transaction parameters
interface TransferParams {
  recipient: string;
  amount: number;
  coinId?: string;
}

interface MoveCallParams {
  target: string;
  arguments: Array<{
    type: 'object' | 'pure';
    value: any;
  }>;
  typeArguments?: string[];
}

// Use interfaces in functions
async function buildTransferTransaction(
  params: TransferParams
): Promise<Transaction> {
  const tx = new Transaction();

  if (params.coinId) {
    // Transfer specific coin
    tx.transferObjects([tx.object(params.coinId)], params.recipient);
  } else {
    // Split from gas coin
    const [coin] = tx.splitCoins(tx.gas, [params.amount]);
    tx.transferObjects([coin], params.recipient);
  }

  return tx;
}
```

### 2. Code Organization

Organize transaction building logic:

```typescript
// Transaction builders for different operations
class TransactionBuilders {
  static transferSUI(
    recipient: string,
    amount: number
  ): Transaction {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.transferObjects([coin], recipient);
    return tx;
  }

  static transferObject(
    objectId: string,
    recipient: string
  ): Transaction {
    const tx = new Transaction();
    tx.transferObjects([tx.object(objectId)], recipient);
    return tx;
  }

  static moveCall(
    target: string,
    args: any[],
    typeArgs?: string[]
  ): Transaction {
    const tx = new Transaction();
    tx.moveCall({ target, arguments: args, typeArguments: typeArgs });
    return tx;
  }
}
```

### 3. Documentation

Document complex transaction logic:

```typescript
/**
 * Builds a transaction for batch NFT minting and distribution.
 *
 * @param recipients - Array of recipient addresses
 * @param metadata - Array of NFT metadata objects
 * @param options - Additional options for the transaction
 *
 * @returns Transaction ready for execution
 *
 * @example
 * ```typescript
 * const tx = buildBatchNFTTransaction(
 *   ['0xrecipient1', '0xrecipient2'],
 *   [
 *     { name: 'NFT 1', image: 'ipfs://...' },
 *     { name: 'NFT 2', image: 'ipfs://...' },
 *   ]
 * );
 * ```
 */
function buildBatchNFTTransaction(
  recipients: string[],
  metadata: NFTMetadata[],
  options?: BatchOptions
): Transaction {
  // Implementation
}
```

## Testing Practices

### 1. Unit Testing

```typescript
describe('Transaction Building', () => {
  test('should build transfer transaction', () => {
    const tx = TransactionBuilders.transferSUI('0xrecipient', 100);

    const commands = tx.getCommands();
    expect(commands).toHaveLength(2);
    expect(commands[0].$kind).toBe('SplitCoins');
    expect(commands[1].$kind).toBe('TransferObjects');
  });

  test('should validate transaction before execution', async () => {
    const tx = new Transaction();
    tx.transferObjects([tx.object('0xtest')], '0xrecipient');

    // Mock client for testing
    const mockClient = {
      dryRunTransactionBlock: jest.fn().mockResolvedValue({
        effects: { status: { status: 'success' } },
      }),
    };

    await validateBeforeExecution(tx, mockClient as any, '0xsender');
    expect(mockClient.dryRunTransactionBlock).toHaveBeenCalled();
  });
});
```

### 2. Integration Testing

```typescript
describe('Transaction Execution', () => {
  let client: SuiClient;
  let keypair: Ed25519Keypair;

  beforeAll(async () => {
    client = new SuiClient({ url: TESTNET_URL });
    keypair = new Ed25519Keypair();
  });

  test('should execute transfer transaction', async () => {
    const tx = TransactionBuilders.transferSUI(
      keypair.toSuiAddress(),
      100_000_000 // 0.1 SUI
    );

    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
    });

    expect(result.digest).toBeDefined();
    expect(result.effects.status.status).toBe('success');
  }, 30000); // Longer timeout for network operations
});
```

### 3. Performance Testing

```typescript
describe('Transaction Performance', () => {
  test('should handle large batch operations efficiently', async () => {
    const startTime = Date.now();

    const tx = new Transaction();
    const amounts = Array.from({ length: 100 }, (_, i) => i + 1);
    const coins = tx.splitCoins(tx.gas, amounts);

    const buildTime = Date.now() - startTime;
    console.log(`Built transaction with 100 splits in ${buildTime}ms`);

    expect(buildTime).toBeLessThan(1000); // Should complete within 1 second
    expect(coins).toHaveLength(100);
  });
});
```

## Monitoring and Observability

### 1. Transaction Metrics

```typescript
interface TransactionMetrics {
  buildTime: number;
  executionTime: number;
  gasUsed: number;
  success: boolean;
  error?: string;
  commandCount: number;
  inputCount: number;
}

class TransactionMonitor {
  private metrics: TransactionMetrics[] = [];

  recordExecution(metrics: TransactionMetrics) {
    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getStats() {
    const successful = this.metrics.filter(m => m.success);
    const failed = this.metrics.filter(m => !m.success);

    return {
      total: this.metrics.length,
      successRate: successful.length / this.metrics.length,
      avgBuildTime: average(successful.map(m => m.buildTime)),
      avgExecutionTime: average(successful.map(m => m.executionTime)),
      avgGasUsed: average(successful.map(m => m.gasUsed)),
      commonErrors: this.getCommonErrors(failed),
    };
  }

  private getCommonErrors(failed: TransactionMetrics[]): string[] {
    const errorCounts = new Map<string, number>();
    failed.forEach(m => {
      if (m.error) {
        errorCounts.set(m.error, (errorCounts.get(m.error) || 0) + 1);
      }
    });

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => `${error} (${count} times)`);
  }
}
```

### 2. Alerting

```typescript
class TransactionAlerting {
  private config = {
    errorThreshold: 0.1, // 10% error rate
    highGasThreshold: 100_000_000, // 0.1 SUI
    slowBuildThreshold: 5000, // 5 seconds
  };

  checkForAlerts(metrics: TransactionMetrics[], monitor: TransactionMonitor) {
    const stats = monitor.getStats();

    if (stats.successRate < 1 - this.config.errorThreshold) {
      this.alert(`High error rate: ${(1 - stats.successRate) * 100}%`);
    }

    if (stats.avgGasUsed > this.config.highGasThreshold) {
      this.alert(`High gas usage: ${stats.avgGasUsed} MIST`);
    }

    if (stats.avgBuildTime > this.config.slowBuildThreshold) {
      this.alert(`Slow transaction building: ${stats.avgBuildTime}ms`);
    }
  }

  private alert(message: string) {
    // Send alert via preferred channel (email, Slack, etc.)
    console.error(`ALERT: ${message}`);
  }
}
```

## Summary of Key Practices

1. **Performance**: Use unresolved object IDs, batch operations, minimize transaction size
2. **Error Handling**: Validate before execution, implement retry logic, handle specific error types
3. **Security**: Verify object ownership, check gas balance, validate addresses, use latest object versions
4. **Code Quality**: Use TypeScript for type safety, organize code logically, document complex logic
5. **Testing**: Write unit tests, integration tests, and performance tests
6. **Monitoring**: Track metrics, set up alerting, analyze performance trends

Following these best practices will result in more reliable, efficient, and maintainable transaction building code.