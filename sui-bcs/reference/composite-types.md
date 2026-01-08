# Composite Types

## Struct

```typescript
// Define a struct
const Person = bcs.struct('Person', {
  name: bcs.string(),
  age: bcs.u8(),
  balance: bcs.u64(),
});

// Type-safe serialization
const serialized = Person.serialize({
  name: "Alice",
  age: 30,
  balance: 1000n,
});

// Deserialization
const person = Person.parse(serialized);
console.log(person.name, person.age, person.balance);
```

## Enum

```typescript
// Define an enum
const Status = bcs.enum('Status', {
  Pending: null,           // No associated data
  Active: bcs.u64(),       // Associated u64 value
  Inactive: bcs.string(),  // Associated string value
});

// Serialize enum values
Status.serialize({ Pending: null });
Status.serialize({ Active: 123n });
Status.serialize({ Inactive: "reason" });

// Deserialize
const status = Status.parse(bytes);
if ('Pending' in status) {
  console.log('Pending');
} else if ('Active' in status) {
  console.log('Active:', status.Active);
} else if ('Inactive' in status) {
  console.log('Inactive:', status.Inactive);
}
```

## Vector

```typescript
// Number vector
const NumberVector = bcs.vector(bcs.u32());
NumberVector.serialize([1, 2, 3, 4, 5]);

// String vector
const StringVector = bcs.vector(bcs.string());
StringVector.serialize(["a", "b", "c"]);

// Struct vector
const PeopleVector = bcs.vector(Person);
PeopleVector.serialize([
  { name: "Alice", age: 30, balance: 1000n },
  { name: "Bob", age: 25, balance: 2000n },
]);
```

## Tuple

```typescript
// Pair tuple
const Pair = bcs.tuple([bcs.string(), bcs.u64()]);
Pair.serialize(["Alice", 1000n]);

// Triple tuple
const Triple = bcs.tuple([bcs.string(), bcs.u8(), bcs.bool()]);
Triple.serialize(["Bob", 25, true]);
```

## Option

```typescript
// Optional integer
const OptionalNumber = bcs.option(bcs.u64());
OptionalNumber.serialize(123n);  // Some(123)
OptionalNumber.serialize(null);  // None

// Optional string
const OptionalString = bcs.option(bcs.string());
OptionalString.serialize("hello"); // Some("hello")
OptionalString.serialize(null);    // None
```

## Map

```typescript
// String to number map
const StringToNumberMap = bcs.map(bcs.string(), bcs.u32());
StringToNumberMap.serialize(new Map([
  ["Alice", 100],
  ["Bob", 200],
  ["Charlie", 300],
]));

// Using plain object (automatic conversion)
StringToNumberMap.serialize({
  Alice: 100,
  Bob: 200,
  Charlie: 300,
});
```

## Usage Notes

### Struct Definition
- Field order matters for serialization
- All fields must be provided during serialization
- Field names are preserved during deserialization

### Enum Variants
- Variants can have associated data or be null
- First byte encodes the variant index
- Associated data follows the variant byte

### Vector Operations
- Supports any BCS type as element type
- Length is encoded as LEB128
- Empty vectors are supported

### Tuple Characteristics
- Fixed number of elements
- Element types can be different
- Access by index after deserialization

### Option Type
- Represents optional values
- `null` represents `None`
- Non-null values represent `Some(value)`

### Map Serialization
- Keys and values can be any BCS type
- Supports both `Map` objects and plain objects
- Keys are sorted during serialization for determinism