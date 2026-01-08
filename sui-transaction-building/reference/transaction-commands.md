# Transaction Commands

Transaction commands are the core operations that can be performed in a Sui transaction. The Transaction class provides methods for all standard Sui commands.

## SplitCoins - Split Coin

Split a coin into multiple smaller coins:

```typescript
// Create new coin from gas coin
const [coin] = tx.splitCoins(tx.gas, [100]);

// Split multiple amounts
const [coin1, coin2] = tx.splitCoins(tx.gas, [100, 200]);

// Use plain JavaScript values
const amounts = [100, 200, 300];
const coins = tx.splitCoins(tx.gas, amounts);
```

## MergeCoins - Merge Coins

Merge multiple coins into a target coin:

```typescript
// Merge multiple coins into target coin
tx.mergeCoins(tx.object(coin1), [tx.object(coin2), tx.object(coin3)]);
```

## TransferObjects - Transfer Objects

Transfer objects between addresses:

```typescript
// Transfer single object
tx.transferObjects([tx.object('0xObjectId')], '0xRecipientAddress');

// Transfer multiple objects
tx.transferObjects([tx.object(id1), tx.object(id2)], recipientAddress);

// Transfer split coin
const [coin] = tx.splitCoins(tx.gas, [100]);
tx.transferObjects([coin], recipientAddress);
```

## MoveCall - Execute Move Call

Execute Move smart contract functions:

```typescript
// Basic Move call
tx.moveCall({
  target: '0x2::coin::transfer',
  arguments: [
    tx.object(coinObjectId),
    tx.pure.address(recipientAddress),
  ],
});

// Move call with type parameters
tx.moveCall({
  target: '0x2::devnet_nft::mint',
  arguments: [
    tx.pure.string(name),
    tx.pure.string(description),
    tx.pure.string(imageUrl),
  ],
});
```

## MakeMoveVec - Create Move Vector

Create Move vectors for batch operations:

```typescript
// Create object vector
tx.makeMoveVec({
  elements: [tx.object(id1), tx.object(id2)],
});

// Use in Move call
tx.moveCall({
  target: '0x2::example::batch_process',
  arguments: [
    tx.makeMoveVec({ elements: objects }),
  ],
});
```

## Publish - Publish Move Package

Publish Move modules to the blockchain:

```typescript
// Publish Move module
const upgradeCap = tx.publish({
  modules: [moveBytecode],
  dependencies: ['0x1', '0x2'],
});
```

## Command Chaining

Transaction commands can be chained together:

```typescript
const tx = new Transaction();

// Chain multiple commands
const [coin] = tx.splitCoins(tx.gas, [100])
  .transferObjects([coin], recipientAddress)
  .moveCall({
    target: '0x2::example::function',
    arguments: [tx.object(someObject)],
  });
```

## Command Results

Most commands return results that can be used in subsequent commands:

```typescript
// Use split coin result in transfer
const [coin] = tx.splitCoins(tx.gas, [100]);
tx.transferObjects([coin], recipientAddress);

// Use move call result
const [nft] = tx.moveCall({
  target: '0x2::nft::mint',
  arguments: [tx.pure.string('My NFT')],
});
tx.transferObjects([nft], recipientAddress);
```

## Error Handling

Handle command-specific errors:

```typescript
try {
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  // ... other commands
} catch (error) {
  if (error.message.includes('insufficient balance')) {
    console.error('Insufficient gas coin balance');
  }
  throw error;
}
```

## Best Practices

1. **Batch operations**: Use `splitCoins` with multiple amounts instead of multiple calls
2. **Reuse results**: Store command results for use in subsequent operations
3. **Validate inputs**: Ensure object IDs and addresses are valid before use
4. **Check gas**: Consider gas costs when planning complex command sequences