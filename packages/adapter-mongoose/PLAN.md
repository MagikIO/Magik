# Plan: Fix Mongoose Adapter Type Errors

## Summary of Issues

The `packages/adapter-mongoose/src/index.ts` file has **11 errors** to fix:

### 1. Biome Errors: Async Functions Without Await (5 errors)
- **Lines 29-43**: `findById` - returns promise without await
- **Lines 45-52**: `findOne` - returns promise without await
- **Lines 54-58**: `findMany` - returns promise without await
- **Lines 70-75**: `update` - returns promise without await
- **Lines 97-99**: `count` - returns promise without await

### 2. TypeScript Errors: Query Type Incompatibilities (3 errors)
- **Line 39**: `query` assignment from `applyPopulate` loses type info
- **Line 50**: `q` assignment from `applyQueryOptions` loses type info
- **Line 56**: `q` assignment from `applyQueryOptions` loses type info

### 3. TypeScript Error: Document Type Mismatch (1 error)
- **Line 67**: `createMany` casts to `mongoose.Document` incorrectly

### 4. TypeScript Error: ConnectOptions Type (1 error)
- **Line 249**: `mongoOptions` is `unknown` but should be `ConnectOptions`

### 5. Spelling Warning (1 warning - can ignore)
- **Line 206**: "mydb" in example docstring

---

## Fix Plan

### Step 1: Fix `IMagikDatabaseAdapter` Type Parameters
**File**: `index.ts` line 218

The adapter doesn't specify the third type parameter `TConnectOptions` for the interface. Add `mongoose.ConnectOptions` as the third type parameter.

```typescript
// Before
export class MongooseAdapter<TServices extends string = string>
  implements IMagikDatabaseAdapter<Connection, TServices>

// After
export class MongooseAdapter<TServices extends string = string>
  implements IMagikDatabaseAdapter<Connection, TServices, mongoose.ConnectOptions>
```

### Step 2: Fix Helper Method Return Types
**File**: `index.ts` lines 115-160

The `applyQueryOptions` and `applyPopulate` methods use `Query<unknown, unknown>` which loses type information. Use generic type parameters to preserve types.

```typescript
// Before
private applyQueryOptions(
  query: mongoose.Query<unknown, unknown>,
  options?: QueryOptions<T>,
) { ... }

// After - use generic return type that matches input
private applyQueryOptions<TResult, TDoc>(
  query: mongoose.Query<TResult, TDoc>,
  options?: QueryOptions<T>,
): mongoose.Query<TResult, TDoc> { ... }
```

Same approach for `applyPopulate`.

### Step 3: Fix Async/Await Issues
**File**: `index.ts` lines 29, 45, 54, 70, 97

Two options:
- **Option A**: Add `await` before `.exec()` calls
- **Option B**: Remove `async` keyword since we're just returning the promise

**Recommended**: Option A (add `await`) for consistency and to make the async keyword meaningful.

```typescript
// Before
async findById(...): Promise<T | null> {
  ...
  return query.lean().exec() as Promise<T | null>;
}

// After
async findById(...): Promise<T | null> {
  ...
  return await query.lean().exec() as T | null;
}
```

### Step 4: Fix `createMany` Document Type
**File**: `index.ts` line 67

The `insertMany` result type doesn't match `mongoose.Document`. Use a simpler approach.

```typescript
// Before
return docs.map((d) => (d as mongoose.Document).toObject() as T);

// After
return docs.map((d) => d.toObject() as T);
```

The `insertMany` returns `HydratedDocument<T>[]` which already has `toObject()`.

### Step 5: Type the `options` Parameter in `connect`
**File**: `index.ts` line 229

Destructure with proper typing since we've now specified the type parameter.

```typescript
// The options will automatically be typed as ConnectOptions
// once we fix Step 1, but we may need to handle the type assertion
const { uri, serviceName, options: mongoOptions, hooks } = options;
// mongoOptions is now ConnectOptions | undefined
```

---

## Implementation Order

1. Fix the `IMagikDatabaseAdapter` type parameters (Step 1)
2. Fix helper method generics (Step 2)
3. Fix async/await in repository methods (Step 3)
4. Fix `createMany` type casting (Step 4)
5. Verify `connect` options typing (Step 5)
6. Run `pnpm build` to verify no errors
7. Delete this PLAN.md file

---

## Verification

After fixes, run:
```bash
cd packages/adapter-mongoose
pnpm build
```

Expected: Zero TypeScript errors, zero Biome errors.
