# Gas Configuration

Gas configuration controls how transactions pay for execution on the Sui network. Proper gas configuration ensures transactions execute successfully without overpaying.

## Gas Coin Usage

`tx.gas` is used to access the gas coin in the transaction and can be used in any command that accepts reference parameters:

```typescript
// Split from gas coin
const [coin] = tx.splitCoins(tx.gas, [100]);

// Merge into gas coin
tx.mergeCoins(tx.gas, [tx.object(coin1), tx.object(coin2)]);

// Transfer gas coin (transfers all balance)
tx.transferObjects([tx.gas], recipientAddress);
```

## Gas Price Setting

Defaults to network reference gas price, can be explicitly set:

```typescript
// Get current gas price from network
const gasPrice = await client.getReferenceGasPrice();

// Set custom gas price (in MIST)
tx.setGasPrice(gasPrice);

// Set specific value
tx.setGasPrice(1000); // 1000 MIST per gas unit
```

## Gas Budget Setting

Defaults to automatic derivation through transaction dry-run, can be explicitly set:

```typescript
// Set gas budget (unit: MIST)
tx.setGasBudget(gasBudgetAmount);

// Example: Set 0.1 SUI budget (100,000,000 MIST)
tx.setGasBudget(100_000_000);

// Get recommended budget from dry run
const dryRunResult = await client.dryRunTransactionBlock({
  transactionBlock: await tx.build({ client }),
});
const recommendedBudget = dryRunResult.effects.gasUsed.computationCost +
                         dryRunResult.effects.gasUsed.storageCost +
                         dryRunResult.effects.gasUsed.storageRebate;
tx.setGasBudget(recommendedBudget);
```

## Gas Payment Setting

Defaults to automatic determination by SDK, can be explicitly specified:

```typescript
// Ensure coins don't overlap with transaction input objects
tx.setGasPayment([coin1, coin2]);

// Use multiple gas coins
const gasCoins = await client.getCoins({
  owner: senderAddress,
  coinType: '0x2::sui::SUI',
});
tx.setGasPayment(gasCoins.data.slice(0, 2)); // Use first 2 coins
```

Gas coins should be objects containing coin object ID, version, and digest:

```typescript
const coinRef = {
  objectId: '0x...',
  version: '123',
  digest: 'base64digest...',
};
tx.setGasPayment([coinRef]);

// Get coin reference from RPC
const coin = await client.getObject({
  id: coinId,
  options: { showContent: true },
});
const coinRef = {
  objectId: coin.data.objectId,
  version: coin.data.version,
  digest: coin.data.digest,
};
tx.setGasPayment([coinRef]);
```

## Automatic Gas Configuration

The SDK can automatically handle gas configuration:

```typescript
// Automatic gas selection (default)
const tx = new Transaction();
// ... add commands
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});

// With explicit sender for better gas estimation
tx.setSender(senderAddress);
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

## Gas Optimization

### Minimizing Gas Costs

```typescript
// 1. Use appropriate gas price
const referenceGasPrice = await client.getReferenceGasPrice();
tx.setGasPrice(referenceGasPrice);

// 2. Set reasonable gas budget
// Too low: transaction fails
// Too high: wastes SUI
tx.setGasBudget(50_000_000); // 0.05 SUI for simple transactions

// 3. Use single gas coin when possible
// Multiple gas coins increase transaction size
const [primaryGasCoin] = await client.getCoins({
  owner: senderAddress,
  coinType: '0x2::sui::SUI',
  limit: 1,
});
tx.setGasPayment([primaryGasCoin]);

// 4. Avoid using gas coin in transaction commands
// Using tx.gas in commands prevents gas optimization
// Instead, split coins first:
const [transferCoin] = tx.splitCoins(tx.gas, [amount]);
tx.transferObjects([transferCoin], recipient);
```

### Gas Estimation

```typescript
async function estimateGas(tx: Transaction, client: SuiClient, sender: string) {
  // Dry run to estimate gas
  const dryRunResult = await client.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client }),
    sender,
  });

  const computationCost = dryRunResult.effects.gasUsed.computationCost;
  const storageCost = dryRunResult.effects.gasUsed.storageCost;
  const storageRebate = dryRunResult.effects.gasUsed.storageRebate;

  // Total gas needed
  const totalGasNeeded = computationCost + storageCost - storageRebate;

  // Add buffer (20%)
  const gasWithBuffer = Math.ceil(totalGasNeeded * 1.2);

  return {
    computationCost,
    storageCost,
    storageRebate,
    totalGasNeeded,
    gasWithBuffer,
    dryRunResult,
  };
}
```

## Common Gas Issues

### Insufficient Gas

```typescript
try {
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });
} catch (error) {
  if (error.message.includes('InsufficientGas')) {
    // Increase gas budget
    const currentBudget = 50_000_000;
    tx.setGasBudget(currentBudget * 2);

    // Or use more gas coins
    const moreCoins = await client.getCoins({
      owner: senderAddress,
      coinType: '0x2::sui::SUI',
    });
    tx.setGasPayment(moreCoins.data.slice(0, 3));
  }
}
```

### Gas Coin Selection

```typescript
// Select gas coins with sufficient balance
async function selectGasCoins(client: SuiClient, owner: string, requiredBalance: number) {
  const coins = await client.getCoins({
    owner,
    coinType: '0x2::sui::SUI',
  });

  // Sort by balance (descending)
  const sortedCoins = coins.data.sort((a, b) =>
    parseInt(b.balance) - parseInt(a.balance)
  );

  // Find coins with sufficient total balance
  let totalBalance = 0;
  const selectedCoins = [];

  for (const coin of sortedCoins) {
    selectedCoins.push(coin);
    totalBalance += parseInt(coin.balance);

    if (totalBalance >= requiredBalance) {
      break;
    }
  }

  if (totalBalance < requiredBalance) {
    throw new Error(`Insufficient balance: ${totalBalance} < ${requiredBalance}`);
  }

  return selectedCoins.map(coin => ({
    objectId: coin.coinObjectId,
    version: coin.version,
    digest: coin.digest,
  }));
}
```

## Best Practices

1. **Use automatic gas estimation**: Let SDK handle gas when possible
2. **Add buffer**: Add 20-30% buffer to estimated gas
3. **Monitor gas prices**: Check network gas prices during high congestion
4. **Consolidate coins**: Merge small coins to reduce gas payment complexity
5. **Test with dry run**: Always dry run complex transactions first