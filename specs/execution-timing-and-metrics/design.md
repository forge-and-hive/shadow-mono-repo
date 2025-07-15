# Design Document

## Overview

This design enhances the task execution system with comprehensive timing information and metrics collection capabilities. The solution involves extending the existing execution record structure, adding timing tracking to boundary calls and main function execution, implementing a new `setMetrics` execution boundary, and refactoring execution records for better maintainability across packages.

## Architecture

### Core Components

1. **Enhanced Execution Record**: Extended with timing and metrics fields
2. **Timing Tracker**: Utility for capturing start/end timestamps
3. **Metrics Boundary**: New execution boundary for collecting custom metrics
4. **Shared Types Package**: Common execution record types for consistency
5. **Enhanced Boundary System**: Modified to capture timing information

### Package Structure

```
packages/
├── task/                      # Task execution engine
│   └── src/
│       ├── utils/
│       │   ├── boundary.ts       # Enhanced with timing
│       │   └── timing.ts         # Timing utilities
│       ├── types.ts              # Common execution record types
│       └── index.ts              # Updated execution record, exports types
└── hive-sdk/                  # Hive client SDK
    └── src/index.ts              # Imports execution record types from task package
```

## Components and Interfaces

### Enhanced Execution Record

The execution record will be extended with timing and metrics information:

```typescript
// In packages/task/src/types.ts
export interface TimingInfo {
  startTime: number;  // Unix timestamp in milliseconds
  endTime: number;    // Unix timestamp in milliseconds
  duration?: number;  // Computed duration in milliseconds
}

export interface Metric {
  type: string;
  name: string;
  value: number;
}

export interface BoundaryTimingRecord<TInput = unknown[], TOutput = unknown> {
  input: TInput;
  output?: TOutput;
  error?: string;
  timing: TimingInfo;
}

export interface BaseExecutionRecord<InputType = unknown, OutputType = unknown, B = unknown> {
  input: InputType;
  output?: OutputType | null;
  error?: string;
  boundaries?: B;
  taskName?: string;
  metadata?: Record<string, string>;
  metrics?: Metric[];
  timing?: TimingInfo;  // Main function timing
  type: 'success' | 'error' | 'pending';
}
```

### Timing Tracker Utility

A utility class for managing timing information:

```typescript
// In packages/task/src/utils/timing.ts
export class TimingTracker {
  private startTime: number | null = null;
  
  start(): void {
    this.startTime = Date.now();
  }
  
  end(): TimingInfo | null {
    if (this.startTime === null) return null;
    
    const endTime = Date.now();
    return {
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime
    };
  }
  
  static create(): TimingTracker {
    return new TimingTracker();
  }
}
```

### Enhanced Boundary System

The boundary system will be modified to capture timing information:

```typescript
// Enhanced BoundaryRecord in packages/task/src/utils/boundary.ts
export type BoundaryRecord<TInput = unknown[], TOutput = unknown> = {
  input: TInput;
  output?: TOutput;
  error?: string;
  timing: TimingInfo;
}

// Enhanced WrappedBoundaryFunction
export interface WrappedBoundaryFunction<Func extends BoundaryFunction = BoundaryFunction> {
  (...args: Parameters<Func>): Promise<ReturnType<Func>>
  // ... existing methods
  getTimingData: () => Array<BoundaryRecord<Parameters<Func>, Awaited<ReturnType<Func>>>>
}
```

### Metrics Execution Boundary

A new execution boundary for collecting metrics:

```typescript
// In packages/task/src/index.ts - ExecutionRecordBoundaries
export type ExecutionRecordBoundaries = {
  setMetadata: (key: string, value: string) => Promise<void>
  setMetrics: (metric: Metric) => Promise<void>
  // Or alternative API:
  // setMetrics: (type: string, name: string, value: number) => Promise<void>
}
```

## Data Models

### Metric Data Model

```typescript
export interface Metric {
  type: string;    // Category of metric (e.g., "performance", "business", "error")
  name: string;    // Specific metric name (e.g., "response_time", "items_processed")
  value: number;   // Numeric value of the metric
}
```

### Enhanced Execution Record

```typescript
export interface ExecutionRecord<InputType = unknown, OutputType = unknown, B extends Boundaries = Boundaries> {
  // Existing fields
  input: InputType;
  output?: OutputType | null;
  error?: string;
  boundaries: BoundaryLogsFor<B>;
  taskName?: string;
  metadata?: Record<string, string>;
  type: 'success' | 'error' | 'pending';
  
  // New fields
  metrics: Metric[];           // Array of collected metrics
  timing: TimingInfo;          // Main function execution timing
}
```

### Enhanced Boundary Logs

```typescript
export type BoundaryLog<I extends unknown[] = unknown[], O = unknown> = {
  input: I;
  output?: O;
  error?: string;
  timing: TimingInfo;  // Timing for this specific boundary call
};
```

## Error Handling

### Timing Error Handling

- If timing capture fails, the system continues execution without timing data
- Missing timing information is represented as `null` or `undefined`
- Helper methods gracefully handle missing timing data

### Metrics Validation

```typescript
function validateMetric(metric: Metric): boolean {
  return (
    typeof metric.type === 'string' && metric.type.length > 0 &&
    typeof metric.name === 'string' && metric.name.length > 0 &&
    typeof metric.value === 'number' && !isNaN(metric.value)
  );
}
```

### Error Scenarios

1. **Invalid Metric Format**: Reject with descriptive error message
2. **Timing Capture Failure**: Continue execution, log warning
3. **Boundary Timing Failure**: Record boundary call without timing
4. **Serialization Errors**: Gracefully handle timing/metrics serialization

## Testing Strategy

### Unit Tests

1. **Timing Tracker Tests**
   - Test start/end timing capture
   - Test duration calculation
   - Test edge cases (multiple starts, end without start)

2. **Metrics Boundary Tests**
   - Test metric collection and validation
   - Test multiple metrics accumulation
   - Test invalid metric rejection

3. **Enhanced Boundary Tests**
   - Test boundary timing capture
   - Test boundary execution with timing
   - Test timing in different boundary modes

### Integration Tests

1. **End-to-End Timing Tests**
   - Test complete task execution with timing
   - Test boundary timing in complex scenarios
   - Test timing data in execution records

2. **Metrics Integration Tests**
   - Test metrics collection during task execution
   - Test metrics in error scenarios
   - Test metrics with boundary mocking

3. **Cross-Package Compatibility Tests**
   - Test execution record compatibility between task and hive-sdk
   - Test serialization/deserialization consistency
   - Test type compatibility across packages

### Performance Tests

1. **Timing Overhead Tests**
   - Measure performance impact of timing capture
   - Test with high-frequency boundary calls
   - Validate minimal performance degradation

2. **Memory Usage Tests**
   - Test memory usage with large numbers of metrics
   - Test memory usage with extensive timing data
   - Validate no memory leaks in timing tracking

## Implementation Phases

### Phase 1: Shared Types and Timing Utilities
- Create shared execution record types in task package (types.ts)
- Implement timing tracker utility
- Update type exports and dependencies

### Phase 2: Enhanced Boundary System
- Modify boundary system to capture timing
- Update boundary record types
- Implement timing in boundary execution

### Phase 3: Metrics Boundary Implementation
- Implement setMetrics execution boundary
- Add metrics validation
- Update execution record to include metrics

### Phase 4: Task Package Integration
- Update task execution to capture main function timing
- Integrate metrics collection
- Update execution record creation

### Phase 5: Hive SDK Integration
- Update hive-sdk to use shared execution record types
- Ensure compatibility with enhanced execution records
- Update serialization/deserialization

### Phase 6: Testing and Documentation
- Comprehensive test suite
- Performance validation
- Documentation updates

## Migration Strategy

### Backward Compatibility

- New fields (timing, metrics) are optional in execution records
- Existing code continues to work without modification
- Gradual adoption of new features

### Breaking Changes

- Minimal breaking changes through careful interface design
- Version bumps for packages with breaking changes
- Clear migration guide for any required changes

### Rollout Plan

1. **Internal Testing**: Validate with existing test suites
2. **Gradual Rollout**: Enable features incrementally
3. **Monitoring**: Track performance impact and adoption
4. **Full Deployment**: Complete feature availability