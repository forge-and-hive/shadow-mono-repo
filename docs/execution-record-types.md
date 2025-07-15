# Execution Record Types and Structure

## Overview

The Execution Record is the central data structure in the ForgeHive task execution system that captures all information about a task execution, including inputs, outputs, errors, boundary calls, timing information, and custom metrics. This document provides a comprehensive overview of the types and structure of execution records.

## Core Types

### ExecutionRecord Interface

The main execution record interface captures the complete state of a task execution:

```typescript
interface ExecutionRecord<InputType = unknown, OutputType = unknown, B extends Boundaries = Boundaries> {
  /** The input arguments passed to the task */
  input: InputType
  /** The output returned by the task (if successful) */
  output?: OutputType | null
  /** The error message if the task failed */
  error?: string
  /** Boundary execution data */
  boundaries: BoundaryLogsFor<B>
  /** The name of the task (if set) */
  taskName?: string
  /** Additional context metadata */
  metadata?: Record<string, string>
  /** The type of execution record - computed from output/error state */
  type: 'success' | 'error' | 'pending'
}
```

### Enhanced Base Execution Record

The `BaseExecutionRecord` interface includes the new timing and metrics functionality:

```typescript
interface BaseExecutionRecord<InputType = unknown, OutputType = unknown, B = unknown> {
  /** The input arguments passed to the task */
  input: InputType
  /** The output returned by the task (if successful) */
  output?: OutputType | null
  /** The error message if the task failed */
  error?: string
  /** Boundary execution data */
  boundaries?: B
  /** The name of the task (if set) */
  taskName?: string
  /** Additional context metadata */
  metadata?: Record<string, string>
  /** Array of collected metrics */
  metrics?: Metric[]
  /** Main function execution timing */
  timing?: TimingInfo
  /** The type of execution record - computed from output/error state */
  type: 'success' | 'error' | 'pending'
}
```

## Timing and Metrics Types

### TimingInfo

Captures timing information for performance analysis:

```typescript
interface TimingInfo {
  /** Unix timestamp in milliseconds when execution started */
  startTime: number
  /** Unix timestamp in milliseconds when execution ended */
  endTime: number
  /** Computed duration in milliseconds (endTime - startTime) */
  duration?: number
}
```

**Example:**
```typescript
{
  startTime: 1675123456789,
  endTime: 1675123456850,
  duration: 61
}
```

### Metric

Represents custom metrics collected during task execution:

```typescript
interface Metric {
  /** Category of metric (e.g., "performance", "business", "error") */
  type: string
  /** Specific metric name (e.g., "response_time", "items_processed") */
  name: string
  /** Numeric value of the metric */
  value: number
}
```

**Examples:**
```typescript
// Performance metric
{
  type: "performance",
  name: "api_response_time",
  value: 245
}

// Business metric
{
  type: "business",
  name: "items_processed",
  value: 1250
}

// Error metric
{
  type: "error",
  name: "retry_attempts",
  value: 3
}
```

### TimingTracker Utility

A utility class for capturing timing information:

```typescript
class TimingTracker {
  start(): void
  end(): TimingInfo | null
  static create(): TimingTracker
}
```

**Usage:**
```typescript
const timer = TimingTracker.create()
timer.start()
// ... perform work ...
const timing = timer.end()
```

## Boundary Types

### BoundaryRecord

Represents a single boundary function call with timing information:

```typescript
type BoundaryRecord<TInput = unknown[], TOutput = unknown> =
  BoundarySuccessRecord<TInput, TOutput> | BoundaryErrorRecord<TInput>
```

### BoundarySuccessRecord

Records successful boundary calls:

```typescript
type BoundarySuccessRecord<TInput = unknown[], TOutput = unknown> = {
  input: TInput
  output: TOutput
  error?: null
  timing: TimingInfo
}
```

### BoundaryErrorRecord

Records failed boundary calls:

```typescript
type BoundaryErrorRecord<TInput = unknown[]> = {
  input: TInput
  output?: null
  error: string
  timing: TimingInfo
}
```

### BoundaryLogsFor

Maps boundary definitions to their execution logs:

```typescript
type BoundaryLogsFor<B extends Boundaries> = {
  [K in keyof B]: B[K] extends (...args: infer I) => Promise<infer O>
    ? BoundaryLog<I, O>[]
    : BoundaryLog[]
}
```

## Execution Record Types

### Success Record

When a task completes successfully:

```typescript
{
  input: { userId: "123", limit: 10 },
  output: { users: [...], total: 25 },
  error: undefined,
  boundaries: {
    fetchUsers: [{
      input: ["123", 10],
      output: [...],
      timing: { startTime: 1675123456789, endTime: 1675123456850, duration: 61 }
    }]
  },
  taskName: "getUserList",
  metadata: { version: "1.0.0" },
  metrics: [
    { type: "performance", name: "db_query_time", value: 45 },
    { type: "business", name: "users_returned", value: 25 }
  ],
  timing: { startTime: 1675123456780, endTime: 1675123456860, duration: 80 },
  type: "success"
}
```

### Error Record

When a task fails:

```typescript
{
  input: { userId: "invalid" },
  output: null,
  error: "User not found",
  boundaries: {
    fetchUser: [{
      input: ["invalid"],
      error: "Database connection failed",
      timing: { startTime: 1675123456789, endTime: 1675123456820, duration: 31 }
    }]
  },
  taskName: "getUser",
  metadata: { version: "1.0.0" },
  metrics: [
    { type: "error", name: "failed_attempts", value: 1 }
  ],
  timing: { startTime: 1675123456780, endTime: 1675123456825, duration: 45 },
  type: "error"
}
```

## Working with Execution Records

### Type Determination

The `type` field is computed based on the presence of output and error:

```typescript
function getExecutionRecordType(record: Partial<ExecutionRecord>): 'success' | 'error' | 'pending' {
  if (record.error) return 'error'
  if (record.output !== undefined && record.output !== null) return 'success'
  return 'pending'
}
```

### Boundary Data Access

Access boundary execution data using type-safe methods:

```typescript
// Get all calls to a specific boundary
const fetchUserCalls = executionRecord.boundaries.fetchUser

// Get the first call's timing
const firstCallTiming = fetchUserCalls[0]?.timing

// Check if a boundary call failed
const hasError = fetchUserCalls.some(call => call.error)
```

### Metrics Analysis

Filter and analyze collected metrics:

```typescript
// Get all performance metrics
const performanceMetrics = executionRecord.metrics?.filter(m => m.type === 'performance') || []

// Calculate total processing time
const totalTime = performanceMetrics
  .filter(m => m.name.includes('time'))
  .reduce((sum, m) => sum + m.value, 0)

// Get business metrics
const businessMetrics = executionRecord.metrics?.filter(m => m.type === 'business') || []
```

### Timing Analysis

Analyze timing data for performance insights:

```typescript
// Main function execution time
const mainExecutionTime = executionRecord.timing?.duration || 0

// Total boundary execution time
const boundaryTime = Object.values(executionRecord.boundaries)
  .flat()
  .reduce((sum, call) => sum + (call.timing?.duration || 0), 0)

// Calculate overhead
const overhead = mainExecutionTime - boundaryTime
```

## Best Practices

### Metric Collection

1. **Consistent Naming**: Use consistent naming conventions for metric types and names
2. **Meaningful Categories**: Use descriptive type categories (`performance`, `business`, `error`, `system`)
3. **Granular Metrics**: Collect specific, actionable metrics rather than generic ones

### Timing Usage

1. **Boundary Timing**: Automatic timing is captured for all boundary calls
2. **Custom Timing**: Use `TimingTracker` for measuring specific operations
3. **Performance Analysis**: Use timing data to identify bottlenecks and optimization opportunities

### Error Handling

1. **Detailed Errors**: Include descriptive error messages in boundary records
2. **Error Metrics**: Track error counts and patterns using metrics
3. **Graceful Degradation**: Handle missing timing or metrics data gracefully

### Type Safety

1. **Generic Types**: Use generic type parameters for better type safety
2. **Boundary Typing**: Define specific types for boundary inputs and outputs
3. **Validation**: Validate execution record structure before processing

## Migration Notes

When upgrading to execution records with timing and metrics:

1. **Optional Fields**: New fields (`timing`, `metrics`) are optional for backward compatibility
2. **Test Updates**: Update test expectations to include timing information
3. **Type Updates**: Update type definitions to include new fields where needed
4. **Data Processing**: Update data processing logic to handle new fields

## Related Documentation

- [Task and Boundaries Design](./task-and-boundaries-design.md)
- [Testing with Boundary Mocks](./testing-with-boundary-mocks.md)
- [Task API Documentation](./task-api-docs.md)
- [Sending Logs to Hive](./sending-logs-to-hive.md)