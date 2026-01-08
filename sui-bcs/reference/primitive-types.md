# Primitive Types

## Integer Types

```typescript
// Unsigned integers
bcs.u8().serialize(255);      // 0-255
bcs.u16().serialize(65535);   // 0-65535
bcs.u32().serialize(4294967295); // 0-4294967295
bcs.u64().serialize(18446744073709551615n); // BigInt
bcs.u128().serialize(340282366920938463463374607431768211455n);
bcs.u256().serialize(115792089237316195423570985008687907853269984665640564039457584007913129639935n);

// LEB128 encoding (variable length)
bcs.uleb128().serialize(128); // Compressed encoding
```

## Boolean and String Types

```typescript
// Boolean values
bcs.bool().serialize(true);
bcs.bool().serialize(false);

// String (UTF-8 encoded)
bcs.string().serialize("Hello, 世界!");
bcs.string().serialize(""); // Empty string
```

## Usage Notes

### Integer Ranges
- `u8`: 0-255
- `u16`: 0-65535
- `u32`: 0-4294967295
- `u64`, `u128`, `u256`: Use `BigInt` for values beyond JavaScript's safe integer range

### String Encoding
- Strings are UTF-8 encoded
- Length is encoded as LEB128 before the string data
- Supports Unicode characters and emojis

### LEB128 Encoding
- Variable-length encoding for integers
- More efficient for small values
- Used internally for string lengths and other variable-length data

### Type Safety
- Runtime validation of value ranges
- TypeScript type checking for compile-time safety
- Error messages for out-of-range values