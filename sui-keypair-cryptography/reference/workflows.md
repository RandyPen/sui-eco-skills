# Workflows

## Workflow 1: Secure Key Generation and Backup

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { mnemonicToSeed, encodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { generateMnemonic } from '@scure/bip39';

async function createAndBackupWallet(): Promise<{
  keypair: Ed25519Keypair;
  mnemonic: string;
  encodedPrivateKey: string;
}> {
  // 1. Generate mnemonic
  const mnemonic = generateMnemonic();

  // 2. Generate seed from mnemonic
  const seed = await mnemonicToSeed(mnemonic);

  // 3. Generate keypair from seed
  const keypair = Ed25519Keypair.fromSeed(seed.slice(0, 32));

  // 4. Encode private key for backup
  const encodedPrivateKey = encodeSuiPrivateKey(
    keypair.getSecretKey(),
    'ED25519'
  );

  return {
    keypair,
    mnemonic,
    encodedPrivateKey,
  };
}
```

## Workflow 2: Transaction Signing and Verification

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function signAndVerifyTransaction(
  client: SuiClient,
  keypair: Ed25519Keypair,
  recipient: string,
  amount: number
) {
  const tx = new Transaction();

  // Build transaction
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], recipient);

  // Build transaction bytes
  const txBytes = await tx.build({ client });

  // Sign
  const signature = await keypair.signTransaction(txBytes);

  // Verify signature
  const publicKey = keypair.getPublicKey();
  const isValid = await publicKey.verifyTransaction(txBytes, signature);

  if (!isValid) {
    throw new Error('Signature verification failed');
  }

  // Execute transaction
  const result = await client.executeTransactionBlock({
    transactionBlock: txBytes,
    signature: signature.toString(),
    options: { showEffects: true },
  });

  return result;
}
```

## Workflow 3: Key Recovery

```typescript
import { decodeSuiPrivateKey, mnemonicToSeed } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function recoverKeypair(
  backupMethod: 'mnemonic' | 'encodedKey',
  backupData: string
): Promise<Ed25519Keypair> {
  if (backupMethod === 'mnemonic') {
    // Recover from mnemonic
    const seed = await mnemonicToSeed(backupData);
    return Ed25519Keypair.fromSeed(seed.slice(0, 32));
  } else {
    // Recover from encoded private key
    const decoded = decodeSuiPrivateKey(backupData);

    if (decoded.scheme !== 'ED25519') {
      throw new Error(`Unsupported key scheme: ${decoded.scheme}`);
    }

    return Ed25519Keypair.fromSecretKey(decoded.privateKey);
  }
}
```