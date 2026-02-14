# Error Handling Reference

This document provides a complete error handling guide for the Cetus DLMM SDK. All error handling is based on the actual code in the `@cetusprotocol/dlmm-sdk` package.

## Overview

The DLMM SDK uses a unified error handling system that provides:
- **Typed error codes**: Using enums to define all possible errors
- **Rich error information**: Including method names, request parameters, and stack information
- **Consistent error handling patterns**: All modules use the same error handling mechanism
- **Debug-friendly error format**: Easy for problem diagnosis and resolution

## Error Types

### DlmmErrorCode - Error Code Enum
Defines all error codes that the DLMM SDK may return.

```typescript
enum DlmmErrorCode {
  // Network and request errors
  FetchError = 'FetchError',           // Network request failed
  GetObjectError = 'GetObjectError',   // Failed to get on-chain object

  // Data errors
  ParseError = 'ParseError',           // Data parsing failed
  NotFound = 'NotFound',               // Resource not found

  // Parameter errors
  InvalidParams = 'InvalidParams',     // Invalid parameters
  InvalidStrategyParams = 'InvalidStrategyParams', // Invalid strategy parameters
  InvalidCoinTypeSequence = 'InvalidCoinTypeSequence', // Invalid coin type sequence

  // Bin-related errors
  InvalidBinId = 'InvalidBinId',       // Invalid Bin ID
  InvalidBinWidth = 'InvalidBinWidth', // Invalid Bin width

  // Liquidity errors
  InsufficientLiquidity = 'InsufficientLiquidity', // Insufficient liquidity
  LiquiditySupplyIsZero = 'LiquiditySupplyIsZero', // Liquidity supply is zero
  InvalidDeltaLiquidity = 'InvalidDeltaLiquidity', // Invalid liquidity change

  // Amount errors
  AmountTooSmall = 'AmountTooSmall',   // Amount too small
}
```

### ZapErrorCode - Zap Package Error Codes (Optional)
Additional error codes defined by the DLMM Zap package.

```typescript
enum ZapErrorCode {
  UnsupportedDepositMode = 'UnsupportedDepositMode', // Unsupported deposit mode
  PositionIdUndefined = 'PositionIdUndefined',       // Position ID undefined
  ParameterError = 'ParameterError',                 // Parameter error
  ReachMaxIterations = 'ReachMaxIterations',         // Reached maximum iterations
  BestLiquidityIsZero = 'BestLiquidityIsZero',       // Best liquidity is zero
  SwapAmountError = 'SwapAmountError',               // Swap amount error
  AggregatorError = 'AggregatorError',               // Aggregator error
}
```

## Error Classes

### BaseError - Error Base Class
The base class for all errors, providing a unified error format.

```typescript
abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Partial<ErrorDetails>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  // Convert to JSON format
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }

  // Check error code
  static isErrorCode<T extends BaseError>(error: any, code: string): error is T {
    return error instanceof BaseError && error.code === code;
  }
}
```

### DlmmError - DLMM Error Class
DLMM SDK-specific error class.

```typescript
class DlmmError extends BaseError {
  constructor(message: string, error_code?: DlmmErrorCode, details?: Record<string, any>) {
    super(message, error_code || 'UnknownError', details);
  }

  // Check specific DLMM error codes
  static isDlmmErrorCode(e: any, code: DlmmErrorCode): boolean {
    return this.isErrorCode<DlmmError>(e, code);
  }
}
```

### ErrorDetails - Error Details Type
Type for detailed information included in errors.

```typescript
type ErrorDetails = {
  requestParams?: Record<string, any>  // Request parameters
  methodName?: string                  // Method name
  stack?: string                       // Stack information
  // Other custom detail fields
}

// Error detail key constants
const DETAILS_KEYS = {
  REQUEST_PARAMS: 'requestParams',
  METHOD_NAME: 'methodName',
} as const;
```

## Error Handling Helper Functions

### handleError - Unified Error Handling
Unified error handling function used in the DLMM SDK.

```typescript
const handleError = (code: DlmmErrorCode, error: Error | string, details?: Record<string, any>) => {
  const errorDetails = {
    ...details,
    stack: error instanceof Error ? error.stack : undefined,
  };

  if (error instanceof Error) {
    throw new DlmmError(error.message, code, errorDetails);
  } else {
    throw new DlmmError(error, code, errorDetails);
  }
};
```

### Usage Example
```typescript
// Example usage inside SDK
try {
  const result = await someAsyncOperation()
  return result
} catch (error) {
  return handleError(DlmmErrorCode.FetchError, error as Error, {
    [DETAILS_KEYS.METHOD_NAME]: 'someAsyncOperation',
    [DETAILS_KEYS.REQUEST_PARAMS]: params,
  })
}
```

## Common Error Scenarios

### 1. Network Request Failure (FetchError)
**Trigger conditions**: RPC call failure, network connection issues, etc.

```typescript
try {
  const pool = await sdk.Pool.getPool(poolId)
} catch (error) {
  if (DlmmError.isDlmmErrorCode(error, DlmmErrorCode.FetchError)) {
    console.error('Network request failed:', error.message)
    console.error('Request parameters:', error.details?.requestParams)
    console.error('Method name:', error.details?.methodName)

    // Retry logic
    await retryWithBackoff(() => sdk.Pool.getPool(poolId))
  }
}
```

### 2. Parameter Validation Failure (InvalidParams)
**Trigger conditions**: Parameter format error, out of range, etc.

```typescript
async function createPool(option: CreatePoolOption) {
  // Parameter validation
  if (option.bin_step <= 0) {
    throw new DlmmError('Bin step must be greater than 0', DlmmErrorCode.InvalidParams, {
      [DETAILS_KEYS.METHOD_NAME]: 'createPool',
      [DETAILS_KEYS.REQUEST_PARAMS]: option
    })
  }

  // Continue execution...
}
```

### 3. Insufficient Liquidity (InsufficientLiquidity)
**Trigger conditions**: Pool liquidity insufficient or removing more liquidity than available.

```typescript
async function removeLiquidity(option: RemoveLiquidityOption) {
  const position = await sdk.Position.getPosition(option.position_id)

  // Check if liquidity is sufficient
  if (parseInt(option.remove_liquidity) > parseInt(position.total_liquidity)) {
    throw new DlmmError('Removing more liquidity than position total', DlmmErrorCode.InsufficientLiquidity, {
      [DETAILS_KEYS.METHOD_NAME]: 'removeLiquidity',
      [DETAILS_KEYS.REQUEST_PARAMS]: option,
      availableLiquidity: position.total_liquidity,
      requestedLiquidity: option.remove_liquidity
    })
  }
}
```

### 4. Amount Too Small (AmountTooSmall)
**Trigger conditions**: Amount less than minimum unit or calculated amount less than 1.

```typescript
function calculateFee(amount: string, rate: number): string {
  const result = parseInt(amount) * rate

  if (result > 0 && result < 1) {
    throw new DlmmError(
      `Calculation result ${result} is less than 1`,
      DlmmErrorCode.AmountTooSmall,
      {
        amount,
        rate,
        result
      }
    )
  }

  return Math.floor(result).toString()
}
```

## Error Handling Patterns

### Pattern 1: try-catch Wrapping
All potentially failing asynchronous operations should be wrapped with try-catch.

```typescript
class SafePoolOperations {
  async getPoolSafe(poolId: string): Promise<DlmmPool | null> {
    try {
      return await sdk.Pool.getPool(poolId)
    } catch (error) {
      console.error('Failed to get pool information:', error)
      return null
    }
  }

  async addLiquiditySafe(option: AddLiquidityOption): Promise<Transaction | null> {
    try {
      return await sdk.Position.addLiquidityPayload(option)
    } catch (error) {
      if (DlmmError.isDlmmErrorCode(error, DlmmErrorCode.InsufficientLiquidity)) {
        console.error('Insufficient liquidity, please adjust amount')
      } else if (DlmmError.isDlmmErrorCode(error, DlmmErrorCode.InvalidParams)) {
        console.error('Invalid parameters, please check:', error.details?.requestParams)
      } else {
        console.error('Unknown error:', error)
      }
      return null
    }
  }
}
```

### Pattern 2: Error Recovery and Retry
Implement retry mechanisms for temporary errors (such as network errors).

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Only retry network errors
      if (DlmmError.isDlmmErrorCode(error, DlmmErrorCode.FetchError)) {
        console.warn(`Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delayMs}ms`)

        if (attempt < maxRetries - 1) {
          await sleep(delayMs)
          delayMs *= 2 // Exponential backoff
          continue
        }
      }

      // Throw other errors immediately
      throw error
    }
  }

  throw lastError
}

// Usage example
const pool = await withRetry(() => sdk.Pool.getPool(poolId))
```

### Pattern 3: Error Aggregation
Aggregate multiple errors during batch operations.

```typescript
class BatchOperationManager {
  private errors: Array<{operation: string; error: DlmmError}> = []

  async batchAddLiquidity(options: AddLiquidityOption[]): Promise<Array<Transaction | null>> {
    const results = []

    for (const option of options) {
      try {
        const tx = await sdk.Position.addLiquidityPayload(option)
        results.push(tx)
      } catch (error) {
        this.errors.push({
          operation: `addLiquidity for pool ${option.pool_id}`,
          error: error as DlmmError
        })
        results.push(null)
      }
    }

    return results
  }

  getErrorReport(): string {
    if (this.errors.length === 0) return 'No errors'

    return this.errors.map(({operation, error}) =>
      `Operation: ${operation}\n` +
      `Error: ${error.message}\n` +
      `Code: ${error.code}\n` +
      `Details: ${JSON.stringify(error.details, null, 2)}\n`
    ).join('\n---\n')
  }
}
```

### Pattern 4: User-Friendly Error Messages
Convert technical errors to user-friendly messages.

```typescript
function getUserFriendlyError(error: DlmmError): string {
  switch (error.code) {
    case DlmmErrorCode.FetchError:
      return 'Network connection failed, please check your network and try again'

    case DlmmErrorCode.InsufficientLiquidity:
      return 'Insufficient liquidity, please reduce amount or choose another pool'

    case DlmmErrorCode.InvalidParams:
      return 'Parameter error, please check input values'

    case DlmmErrorCode.AmountTooSmall:
      return 'Amount too small, please increase amount'

    case DlmmErrorCode.NotFound:
      return 'Requested resource not found'

    default:
      return `Operation failed: ${error.message}`
  }
}

// Usage example
try {
  await sdk.Position.addLiquidityPayload(option)
} catch (error) {
  if (error instanceof DlmmError) {
    const userMessage = getUserFriendlyError(error)
    showNotification('error', userMessage)

    // Developers can still see the full error
    console.error('Full error details:', error)
  }
}
```

## Transaction Error Handling

### Transaction Simulation Failure
Always simulate transactions before executing actual transactions.

```typescript
async function simulateAndExecute(tx: Transaction, keyPair: KeyPair): Promise<any> {
  // 1. Simulate transaction
  const simResult = await sdk.FullClient.sendSimulationTransaction(tx, walletAddress)

  if (simResult.effects.status.status !== 'success') {
    const error = simResult.effects.status.error || 'Transaction simulation failed'

    throw new DlmmError(
      `Transaction simulation failed: ${error}`,
      DlmmErrorCode.InvalidParams,
      {
        simulationResult: simResult,
        transaction: tx,
        error
      }
    )
  }

  console.log('✅ Transaction simulation successful')

  // 2. Execute actual transaction
  try {
    const result = await sdk.FullClient.executeTx(keyPair, tx, true)
    console.log('✅ Transaction execution successful:', result)
    return result
  } catch (error) {
    // Error handling for execution failure
    throw new DlmmError(
      `Transaction execution failed: ${error.message}`,
      DlmmErrorCode.FetchError,
      {
        originalError: error,
        transaction: tx,
        simulationWasSuccessful: true
      }
    )
  }
}
```

### Insufficient Gas Budget
Handling gas budget-related errors.

```typescript
async function executeWithGasEstimation(tx: Transaction, keyPair: KeyPair): Promise<any> {
  // First get gas estimation
  const simResult = await sdk.FullClient.sendSimulationTransaction(tx, walletAddress)

  if (simResult.effects.status.status === 'success') {
    // Adjust gas budget based on simulation results
    const gasUsed = simResult.effects.gasUsed
    const safetyMultiplier = 1.5 // 50% safety margin

    const estimatedGas = Math.ceil(
      parseInt(gasUsed.computationCost) +
      parseInt(gasUsed.storageCost) +
      parseInt(gasUsed.storageRebate)
    )

    const gasBudget = Math.ceil(estimatedGas * safetyMultiplier)
    tx.setGasBudget(gasBudget)

    console.log(`Set gas budget: ${gasBudget} (estimated: ${estimatedGas})`)

    // Execute transaction
    return await sdk.FullClient.executeTx(keyPair, tx, true)
  } else {
    throw new DlmmError(
      'Transaction simulation failed, cannot estimate gas',
      DlmmErrorCode.InvalidParams,
      { simulationResult: simResult }
    )
  }
}
```

## Error Monitoring and Logging

### Structured Logging
Log structured error information for easy analysis and monitoring.

```typescript
interface ErrorLogEntry {
  timestamp: string
  operation: string
  errorCode: string
  errorMessage: string
  details: Record<string, any>
  severity: 'low' | 'medium' | 'high'
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = []

  logError(error: DlmmError, operation: string, severity: 'low' | 'medium' | 'high' = 'medium') {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      operation,
      errorCode: error.code,
      errorMessage: error.message,
      details: error.details || {},
      severity
    }

    this.logs.push(logEntry)

    // Take different actions based on severity
    switch (severity) {
      case 'high':
        this.sendAlert(logEntry)
        console.error('🔴 Critical error:', logEntry)
        break
      case 'medium':
        console.warn('🟡 Warning:', logEntry)
        break
      case 'low':
        console.log('🔵 Info:', logEntry)
        break
    }

    return logEntry
  }

  private sendAlert(entry: ErrorLogEntry) {
    // Send to monitoring system, Slack, email, etc.
    console.log('Sending alert:', entry)
  }

  getErrorReport(timeRange?: {start: Date; end: Date}) {
    let filteredLogs = this.logs

    if (timeRange) {
      filteredLogs = this.logs.filter(log => {
        const logTime = new Date(log.timestamp)
        return logTime >= timeRange.start && logTime <= timeRange.end
      })
    }

    const summary = {
      totalErrors: filteredLogs.length,
      bySeverity: {
        high: filteredLogs.filter(l => l.severity === 'high').length,
        medium: filteredLogs.filter(l => l.severity === 'medium').length,
        low: filteredLogs.filter(l => l.severity === 'low').length
      },
      byErrorCode: filteredLogs.reduce((acc, log) => {
        acc[log.errorCode] = (acc[log.errorCode] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recentErrors: filteredLogs.slice(-10) // Last 10 errors
    }

    return summary
  }
}
```

### Performance Monitoring Integration
Monitor error rates and performance metrics.

```typescript
class PerformanceMonitor {
  private metrics = {
    totalOperations: 0,
    failedOperations: 0,
    operationDurations: [] as number[],
    errorCounts: {} as Record<string, number>
  }

  async measureOperation<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    this.metrics.totalOperations++

    try {
      const result = await operation()
      const duration = Date.now() - startTime
      this.metrics.operationDurations.push(duration)

      console.log(`✅ ${operationName} completed, duration: ${duration}ms`)
      return result

    } catch (error) {
      this.metrics.failedOperations++

      if (error instanceof DlmmError) {
        this.metrics.errorCounts[error.code] = (this.metrics.errorCounts[error.code] || 0) + 1
      }

      const duration = Date.now() - startTime
      console.error(`❌ ${operationName} failed, duration: ${duration}ms`, error)

      throw error
    }
  }

  getMetrics() {
    const avgDuration = this.metrics.operationDurations.length > 0
      ? this.metrics.operationDurations.reduce((a, b) => a + b, 0) / this.metrics.operationDurations.length
      : 0

    const errorRate = this.metrics.totalOperations > 0
      ? (this.metrics.failedOperations / this.metrics.totalOperations) * 100
      : 0

    return {
      totalOperations: this.metrics.totalOperations,
      failedOperations: this.metrics.failedOperations,
      errorRate: `${errorRate.toFixed(2)}%`,
      averageDuration: `${avgDuration.toFixed(2)}ms`,
      errorDistribution: this.metrics.errorCounts,
      performanceScore: this.calculatePerformanceScore()
    }
  }

  private calculatePerformanceScore(): number {
    const errorRate = this.metrics.failedOperations / Math.max(this.metrics.totalOperations, 1)
    const avgDuration = this.metrics.operationDurations.length > 0
      ? this.metrics.operationDurations.reduce((a, b) => a + b, 0) / this.metrics.operationDurations.length
      : 1000

    // Simplified scoring logic
    const errorScore = Math.max(0, 100 - errorRate * 1000) // Higher score for lower error rate
    const speedScore = Math.max(0, 100 - avgDuration / 100) // Higher score for faster speed

    return (errorScore * 0.6 + speedScore * 0.4) // Weighted score
  }
}
```

## Best Practices

### 1. Always Use Typed Error Checking
```typescript
// Good: Use typed checking
if (DlmmError.isDlmmErrorCode(error, DlmmErrorCode.FetchError)) {
  // Handle network error
}

// Bad: Use string comparison
if (error.code === 'FetchError') {
  // Prone to typos, no type checking
}
```

### 2. Provide Rich Error Context
```typescript
try {
  await sdk.Position.addLiquidityPayload(option)
} catch (error) {
  throw new DlmmError(
    'Failed to add liquidity',
    DlmmErrorCode.InvalidParams,
    {
      originalError: error,
      operation: 'addLiquidity',
      poolId: option.pool_id,
      positionId: option.position_id,
      timestamp: new Date().toISOString(),
      // Other information helpful for debugging
    }
  )
}
```

### 3. Implement Graceful Error Recovery
```typescript
async function resilientOperation() {
  try {
    return await primaryOperation()
  } catch (error) {
    if (shouldRetry(error)) {
      console.warn('Primary operation failed, trying fallback')
      return await fallbackOperation()
    }
    throw error
  }
}

function shouldRetry(error: DlmmError): boolean {
  const retryableCodes = [
    DlmmErrorCode.FetchError,
    DlmmErrorCode.GetObjectError
  ]
  return retryableCodes.includes(error.code as DlmmErrorCode)
}
```

### 4. Log and Monitor Errors
```typescript
// Configure global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise rejection:', reason)

  if (reason instanceof DlmmError) {
    errorLogger.logError(reason, 'unhandledRejection', 'high')
  }

  // Can send to Sentry, DataDog, etc.
})

// Set up global error boundary (frontend)
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    if (error instanceof DlmmError) {
      errorLogger.logError(error, 'react_error_boundary', 'high')
    }
  }
}
```

### 5. Test Error Scenarios
```typescript
// Unit test error handling
describe('Error handling tests', () => {
  it('should handle network errors correctly', async () => {
    // Mock network error
    jest.spyOn(sdk.Pool, 'getPool').mockRejectedValue(
      new DlmmError('Network error', DlmmErrorCode.FetchError)
    )

    await expect(safeOperations.getPoolSafe('test-pool'))
      .resolves.toBeNull()
  })

  it('should retry temporary errors', async () => {
    let callCount = 0
    const failingOperation = jest.fn()
      .mockRejectedValueOnce(new DlmmError('Temporary error', DlmmErrorCode.FetchError))
      .mockResolvedValueOnce('Success')

    const result = await withRetry(failingOperation)

    expect(result).toBe('Success')
    expect(failingOperation).toHaveBeenCalledTimes(2)
  })
})
```

## Troubleshooting Guide

### Common Issue Solutions

| Error Code | Possible Causes | Solutions |
|---------|---------|---------|
| **FetchError** | Network connection issues, RPC endpoint unavailable | 1. Check network connection<br>2. Verify RPC endpoint<br>3. Implement retry mechanism<br>4. Use backup RPC |
| **InvalidParams** | Parameter format error, out of range | 1. Validate all parameters<br>2. Check parameter types and ranges<br>3. Use SDK type definitions<br>4. Refer to API documentation |
| **InsufficientLiquidity** | Pool liquidity insufficient, amount too large | 1. Reduce operation amount<br>2. Choose pool with higher liquidity<br>3. Split into multiple operations<br>4. Monitor pool status |
| **AmountTooSmall** | Amount less than minimum unit | 1. Increase operation amount<br>2. Check token decimals<br>3. Use correct precision calculations |
| **NotFound** | Resource does not exist or has been deleted | 1. Verify resource ID<br>2. Check resource status<br>3. Handle resource non-existence |

### Debugging Steps
1. **Check error details**: View information in `error.details`
2. **Verify parameters**: Ensure all parameters meet requirements
3. **Test network connection**: Verify RPC endpoint availability
4. **Simplify operation**: Test with minimal reproducible case
5. **Check logs**: Review SDK and application logs
6. **Update SDK**: Ensure using latest version

### Getting Help
- View SDK documentation and type definitions
- Refer to examples in test files
- Ask questions in Cetus community
- Submit detailed error reports (including error details and reproduction steps)

---

**Note**: This document is based on the error handling implementation of Cetus DLMM SDK v1.0.3. For actual use, please refer to:
1. Specific implementation of the latest SDK version
2. Specific error information at runtime
3. Requirements of actual usage scenarios

Good error handling is key to building stable applications. It is recommended to implement appropriate error handling strategies based on specific needs.