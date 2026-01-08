# Performance Considerations

## Size Prediction

```typescript
const schema = bcs.struct('Data', {
  id: bcs.u64(),
  data: bcs.byteVector(),
});

// Predict serialization size
const size = schema.serializedSize({
  id: 123n,
  data: new Uint8Array([1, 2, 3]),
});
console.log(`Estimated size: ${size} bytes`);
```

## Zero-Copy Operations

```typescript
// Use Uint8Array views to avoid data copying
const data = new Uint8Array([1, 2, 3, 4, 5]);

// Byte vector directly uses existing buffer
const ByteVectorType = bcs.byteVector();
const serialized = ByteVectorType.serialize(data);

// Returns Uint8Array view when parsing
const parsed = ByteVectorType.parse(serialized);
```

## Cache Optimization

```typescript
// Reuse BCS type instances
const PersonType = bcs.struct('Person', {
  name: bcs.string(),
  age: bcs.u8(),
});

// Reuse across multiple serializations
const people = [...];
const serializedPeople = people.map(person => PersonType.serialize(person));
```

## Memory Management

### Buffer Reuse
```typescript
// Reuse buffers for repeated serialization
const buffer = new Uint8Array(1024);
const writer = new BcsWriter(buffer);

function serializeToBuffer<T>(type: BcsType<T>, data: T): Uint8Array {
  writer.reset();
  type.write(data, writer);
  return writer.toBytes();
}
```

### Lazy Evaluation
```typescript
// Use lazy evaluation for recursive or complex types
const TreeType = bcs.struct('Tree', {
  value: bcs.u64(),
  children: bcs.lazy(() => bcs.vector(TreeType)),
});

// Lazy evaluation avoids circular dependency issues
const GraphNode = bcs.struct('GraphNode', {
  id: bcs.u64(),
  neighbors: bcs.lazy(() => bcs.vector(GraphNode)),
});
```

## Performance Benchmarks

### Serialization Speed
```typescript
function benchmarkSerialization<T>(type: BcsType<T>, data: T, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    type.serialize(data);
  }
  const end = performance.now();
  return end - start;
}

// Example benchmark
const simpleData = { id: 123n, name: "test" };
const SimpleType = bcs.struct('Simple', {
  id: bcs.u64(),
  name: bcs.string(),
});

const time = benchmarkSerialization(SimpleType, simpleData, 1000);
console.log(`Average serialization time: ${time / 1000}ms`);
```

### Memory Usage
```typescript
function measureMemoryUsage<T>(type: BcsType<T>, data: T): number {
  const before = performance.memory?.usedJSHeapSize || 0;
  const serialized = type.serialize(data);
  const after = performance.memory?.usedJSHeapSize || 0;
  return after - before;
}
```

## Optimization Strategies

### 1. Type Instance Reuse
```typescript
// Bad: Creating new type instances repeatedly
function badSerialize(data: any) {
  const type = bcs.struct('Temp', { /* fields */ });
  return type.serialize(data);
}

// Good: Reusing type instances
const ReusableType = bcs.struct('Reusable', { /* fields */ });
function goodSerialize(data: any) {
  return ReusableType.serialize(data);
}
```

### 2. Batch Operations
```typescript
// Process data in batches to reduce overhead
function serializeBatch<T>(type: BcsType<T>, items: T[]): Uint8Array[] {
  const results = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    results[i] = type.serialize(items[i]).toBytes();
  }
  return results;
}
```

### 3. Pre-allocated Buffers
```typescript
// Pre-allocate buffers for known maximum sizes
const MAX_DATA_SIZE = 1024 * 1024; // 1MB
const sharedBuffer = new Uint8Array(MAX_DATA_SIZE);

function serializeWithSharedBuffer<T>(type: BcsType<T>, data: T): Uint8Array {
  const writer = new BcsWriter(sharedBuffer);
  type.write(data, writer);
  return writer.toBytes();
}
```

## Common Performance Pitfalls

### 1. Unnecessary Type Creation
```typescript
// Avoid creating types inside loops
for (let i = 0; i < 1000; i++) {
  // Bad: Creates new type each iteration
  const type = bcs.struct('Item', { value: bcs.u32() });
  type.serialize({ value: i });
}

// Good: Create type once
const ItemType = bcs.struct('Item', { value: bcs.u32() });
for (let i = 0; i < 1000; i++) {
  ItemType.serialize({ value: i });
}
```

### 2. Excessive Validation
```typescript
// Only validate when necessary
const FastType = bcs.struct('Fast', {
  // Minimal validation for trusted data
  id: bcs.u64(),
  data: bcs.byteVector(),
});

const ValidatedType = bcs.struct('Validated', {
  // Additional validation for untrusted data
  id: bcs.u64().transform({
    input: (val) => {
      if (val < 0) throw new Error('Invalid ID');
      return val;
    },
    output: (val) => val,
  }),
  data: bcs.byteVector(),
});
```

### 3. Large String Operations
```typescript
// Be careful with large strings
const LargeStringType = bcs.string();

// Consider chunking for very large strings
function serializeLargeString(str: string, chunkSize: number = 65536): Uint8Array[] {
  const chunks = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    const chunk = str.slice(i, i + chunkSize);
    chunks.push(LargeStringType.serialize(chunk).toBytes());
  }
  return chunks;
}
```