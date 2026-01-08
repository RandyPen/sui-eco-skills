# Integration Points

Transaction building integrates with other Sui SDK components and external systems. Understanding these integration points is crucial for building complete applications.

## Integration with SuiClient

The primary integration point for executing transactions:

```typescript
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

// Create client for specific network
const client = new SuiClient({
  url: 'https://fullnode.mainnet.sui.io', // Mainnet
  // url: 'https://fullnode.testnet.sui.io', // Testnet
  // url: 'https://fullnode.devnet.sui.io', // Devnet
});

const tx = new Transaction();

// Execute transaction using client
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  options: {
    showEffects: true,
    showObjectChanges: true,
    showEvents: true,
  },
});

// Alternative execution methods
const bytes = await tx.build({ client });
const signature = await keypair.signTransaction(bytes);

const executeResult = await client.executeTransactionBlock({
  transactionBlock: bytes,
  signature,
  options: { showEffects: true },
});
```

### Client Configuration

```typescript
// Custom client configuration
const customClient = new SuiClient({
  url: process.env.SUI_NODE_URL,
  fetch: customFetch, // Custom fetch implementation
  headers: {
    'X-API-Key': process.env.API_KEY,
    'User-Agent': 'MyApp/1.0',
  },
});

// Multiple clients for different networks
const clients = {
  mainnet: new SuiClient({ url: 'https://fullnode.mainnet.sui.io' }),
  testnet: new SuiClient({ url: 'https://fullnode.testnet.sui.io' }),
  devnet: new SuiClient({ url: 'https://fullnode.devnet.sui.io' }),
  local: new SuiClient({ url: 'http://localhost:9000' }),
};
```

## Integration with BCS

BCS (Binary Canonical Serialization) integration for complex data types:

```typescript
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

// Use BCS in pure values
tx.moveCall({
  target: '0x2::example::function',
  arguments: [
    tx.pure(bcs.U64.serialize(100n)),
    tx.pure(bcs.Address.serialize('0xaddress')),
  ],
});

// Custom BCS types
const Person = bcs.struct('Person', {
  name: bcs.string(),
  age: bcs.u8(),
  address: bcs.Address,
});

tx.moveCall({
  target: '0x2::registry::register',
  arguments: [
    tx.pure(Person.serialize({
      name: 'Alice',
      age: 30,
      address: '0x123...',
    })),
  ],
});
```

### BCS Type Definitions

```typescript
// Define reusable BCS types
const MoveTypes = {
  // Basic types
  u8: bcs.u8(),
  u64: bcs.u64(),
  bool: bcs.bool(),
  string: bcs.string(),
  address: bcs.Address,

  // Complex types
  vector: <T>(type: T) => bcs.vector(type),
  option: <T>(type: T) => bcs.option(type),
  struct: (name: string, fields: any) => bcs.struct(name, fields),

  // Common Move types
  Coin: bcs.struct('Coin', {
    id: bcs.Address,
    balance: bcs.U64,
  }),

  NFT: bcs.struct('NFT', {
    id: bcs.Address,
    name: bcs.string(),
    description: bcs.string(),
    url: bcs.string(),
  }),
};

// Usage in transactions
tx.moveCall({
  target: '0x2::coin::transfer',
  arguments: [
    tx.pure(MoveTypes.Coin.serialize(coinData)),
    tx.pure(MoveTypes.address.serialize(recipient)),
  ],
});
```

## Integration with Keypair

Transaction signing with various keypair types:

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { Transaction } from '@mysten/sui/transactions';

// Create keypairs
const ed25519Keypair = new Ed25519Keypair();
const secp256k1Keypair = new Secp256k1Keypair();
const secp256r1Keypair = new Secp256r1Keypair();

const tx = new Transaction();

// Build and sign transaction
const bytes = await tx.build({ client });

// Sign with different keypair types
const ed25519Signature = await ed25519Keypair.signTransaction(bytes);
const secp256k1Signature = await secp256k1Keypair.signTransaction(bytes);
const secp256r1Signature = await secp256r1Keypair.signTransaction(bytes);

// Execute with signature
const result = await client.executeTransactionBlock({
  transactionBlock: bytes,
  signature: ed25519Signature.signature,
});
```

### Keypair Management

```typescript
// Keypair generation and management
class KeypairManager {
  private keypairs = new Map<string, Keypair>();

  generateKeypair(type: 'ed25519' | 'secp256k1' | 'secp256r1'): string {
    let keypair: Keypair;

    switch (type) {
      case 'ed25519':
        keypair = new Ed25519Keypair();
        break;
      case 'secp256k1':
        keypair = new Secp256k1Keypair();
        break;
      case 'secp256r1':
        keypair = new Secp256r1Keypair();
        break;
      default:
        throw new Error(`Unsupported keypair type: ${type}`);
    }

    const id = `keypair_${Date.now()}`;
    this.keypairs.set(id, keypair);

    return id;
  }

  async signTransaction(id: string, tx: Transaction, client: SuiClient) {
    const keypair = this.keypairs.get(id);
    if (!keypair) {
      throw new Error(`Keypair not found: ${id}`);
    }

    const bytes = await tx.build({ client });
    return await keypair.signTransaction(bytes);
  }

  getAddress(id: string): string {
    const keypair = this.keypairs.get(id);
    if (!keypair) {
      throw new Error(`Keypair not found: ${id}`);
    }
    return keypair.toSuiAddress();
  }
}
```

## Integration with Wallet

Wallet integration for user-facing applications:

```typescript
// Wallet interface abstraction
interface WalletAdapter {
  connect(): Promise<string>; // Returns address
  signTransaction(transaction: Uint8Array): Promise<Uint8Array>;
  disconnect(): Promise<void>;
}

// Transaction builder with wallet integration
class WalletTransactionBuilder {
  constructor(
    private wallet: WalletAdapter,
    private client: SuiClient
  ) {}

  async buildAndSign(tx: Transaction): Promise<{
    bytes: Uint8Array;
    signature: Uint8Array;
  }> {
    // Connect wallet if needed
    const sender = await this.wallet.connect();

    // Set sender address
    tx.setSender(sender);

    // Build transaction
    const bytes = await tx.build({ client: this.client });

    // Sign with wallet
    const signature = await this.wallet.signTransaction(bytes);

    return { bytes, signature };
  }

  async execute(tx: Transaction) {
    const { bytes, signature } = await this.buildAndSign(tx);

    return await this.client.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      options: { showEffects: true },
    });
  }
}
```

### Multi-wallet Support

```typescript
// Support multiple wallet types
enum WalletType {
  SuiWallet = 'sui-wallet',
  EthWallet = 'eth-wallet',
  Custom = 'custom',
}

class MultiWalletTransactionService {
  private wallets = new Map<WalletType, WalletAdapter>();

  registerWallet(type: WalletType, wallet: WalletAdapter) {
    this.wallets.set(type, wallet);
  }

  async executeTransaction(
    type: WalletType,
    tx: Transaction,
    client: SuiClient
  ) {
    const wallet = this.wallets.get(type);
    if (!wallet) {
      throw new Error(`Wallet not registered: ${type}`);
    }

    const sender = await wallet.connect();
    tx.setSender(sender);

    const bytes = await tx.build({ client });
    const signature = await wallet.signTransaction(bytes);

    return await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
    });
  }
}
```

## Integration with External Systems

Integrate transaction building with external services:

### Database Integration

```typescript
// Store transaction metadata in database
interface TransactionRecord {
  id: string;
  digest: string;
  sender: string;
  commands: any[];
  gasUsed: number;
  status: 'pending' | 'success' | 'failed';
  createdAt: Date;
  executedAt?: Date;
}

class DatabaseTransactionLogger {
  constructor(private db: Database) {}

  async logTransaction(
    tx: Transaction,
    result: any,
    status: 'success' | 'failed'
  ) {
    const record: TransactionRecord = {
      id: generateId(),
      digest: result.digest,
      sender: tx.getSender() || 'unknown',
      commands: tx.getCommands(),
      gasUsed: result.effects?.gasUsed?.computationCost || 0,
      status,
      createdAt: new Date(),
      executedAt: new Date(),
    };

    await this.db.transactions.insert(record);
    return record;
  }

  async getTransactionHistory(sender: string, limit = 100) {
    return await this.db.transactions
      .find({ sender })
      .sort({ executedAt: -1 })
      .limit(limit)
      .toArray();
  }
}
```

### API Gateway Integration

```typescript
// Expose transaction building as API
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/transactions/build', async (req, res) => {
  try {
    const { commands, sender, network = 'testnet' } = req.body;

    // Create transaction
    const tx = new Transaction();
    tx.setSender(sender);

    // Add commands from request
    commands.forEach((cmd: any) => {
      switch (cmd.type) {
        case 'transfer':
          tx.transferObjects(
            cmd.objects.map((id: string) => tx.object(id)),
            cmd.recipient
          );
          break;
        case 'moveCall':
          tx.moveCall({
            target: cmd.target,
            arguments: cmd.arguments,
          });
          break;
        // Add other command types
      }
    });

    // Build transaction
    const client = getClientForNetwork(network);
    const bytes = await tx.build({ client });

    // Return serialized transaction
    res.json({
      success: true,
      bytes: Buffer.from(bytes).toString('base64'),
      commands: tx.getCommands(),
      gasEstimate: await estimateGas(tx, client, sender),
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});
```

### Monitoring Integration

```typescript
// Integrate with monitoring systems
import { MetricsCollector } from './monitoring';

class MonitoredTransactionService {
  constructor(
    private client: SuiClient,
    private metrics: MetricsCollector
  ) {}

  async executeWithMonitoring(tx: Transaction, signer: Keypair) {
    const startTime = Date.now();

    try {
      // Record transaction start
      this.metrics.record('transaction_start', {
        command_count: tx.getCommands().length,
        sender: signer.toSuiAddress(),
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        transaction: tx,
        signer,
      });

      const duration = Date.now() - startTime;

      // Record success
      this.metrics.record('transaction_success', {
        digest: result.digest,
        duration,
        gas_used: result.effects.gasUsed.computationCost,
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failure
      this.metrics.record('transaction_failure', {
        error: error.message,
        duration,
        command_count: tx.getCommands().length,
      });

      throw error;
    }
  }
}
```

## Integration Testing

Test integration points:

```typescript
// Integration tests for transaction building
describe('Transaction Integration', () => {
  let client: SuiClient;
  let keypair: Ed25519Keypair;

  beforeAll(() => {
    client = new SuiClient({ url: TESTNET_URL });
    keypair = new Ed25519Keypair();
  });

  test('should integrate with SuiClient', async () => {
    const tx = new Transaction();
    tx.setSender(keypair.toSuiAddress());

    const [coin] = tx.splitCoins(tx.gas, [100]);
    tx.transferObjects([coin], keypair.toSuiAddress());

    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
    });

    expect(result.digest).toBeDefined();
    expect(result.effects.status.status).toBe('success');
  });

  test('should integrate with BCS serialization', async () => {
    const tx = new Transaction();

    // Use BCS for complex types
    const customData = bcs.struct('Custom', {
      id: bcs.Address,
      value: bcs.u64(),
    }).serialize({
      id: '0x123',
      value: 100n,
    });

    tx.moveCall({
      target: '0x2::example::process',
      arguments: [tx.pure(customData)],
    });

    // Transaction should build successfully
    const bytes = await tx.build({ client });
    expect(bytes.length).toBeGreaterThan(0);
  });
});
```

## Best Practices

1. **Abstract integration points**: Create clean interfaces between transaction building and other systems
2. **Handle network errors**: Implement retry logic and error recovery
3. **Monitor performance**: Track transaction success rates and gas usage
4. **Test integrations thoroughly**: Ensure all integration points work correctly
5. **Secure key management**: Never expose private keys in client-side code
6. **Validate external inputs**: Sanitize and validate all data from external systems