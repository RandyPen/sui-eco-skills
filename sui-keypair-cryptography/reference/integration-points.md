# Integration Points

## Integration with Transactions

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const keypair = new Ed25519Keypair();
const tx = new Transaction();

// Build transaction
tx.transferObjects([tx.object('0x...')], keypair.toSuiAddress());

// Sign and execute
const result = await keypair.signAndExecuteTransaction({
  transaction: tx,
  client,
});
```

## Integration with Wallets

1. **Standard Interface**: Compatible with wallet standards
2. **Multi-Scheme Support**: Works with different signature schemes
3. **Key Management**: Supports various key storage methods

```typescript
// Wallet adapter example
class MyWalletAdapter {
  async signTransaction(txBytes: Uint8Array): Promise<Uint8Array> {
    const keypair = await this.getKeypair();
    return await keypair.signTransaction(txBytes);
  }

  async getAddress(): Promise<string> {
    const keypair = await this.getKeypair();
    return keypair.toSuiAddress();
  }

  private async getKeypair(): Promise<Ed25519Keypair> {
    // Get keypair from secure storage
    return this.storedKeypair;
  }
}
```

## Integration with Blockchain Operations

1. **Address Verification**: Verify address format and derivation
2. **Signature Verification**: Verify signatures on-chain
3. **Gas Estimation**: Consider signature scheme in gas costs