# @forgehive/task

## Version 0.1.6

### Breaking Changes

- Removed `getBondariesRunLog` and `startRunLog` methods in favor of the new boundary data handling approach.
- The `run` method now delegates to `safeRun` and throws any errors returned.

### Major Features

#### Safe Execution with `safeRun`

Added a new `safeRun` method that returns a tuple of `[Error | null, Result | null, BoundaryLogs | null]`. This provides a more graceful way to handle errors and access boundary data. Check the documentation in `docs/task-api-docs.md` for usage examples.

#### Boundary Mocking for Testing

Added new methods for mocking boundaries in tests:

- `mockBoundary(name, mockFn)`: Replace a specific boundary with a mock function
- `resetMock(name)`: Restore the original implementation of a specific boundary
- `resetMocks()`: Restore all original boundary implementations

Check the documentation in `docs/testing-with-boundary-mocks.md` for implementation details and examples.

### Bug Fixes

- Fixed an issue where boundary instances weren't properly recreated on each task execution, potentially causing issues with boundary state sharing across multiple calls.
- Improved type safety throughout the boundary handling system.
- Enhanced error handling to properly capture and propagate errors from boundaries.

### Other Improvements

- Added comprehensive documentation for testing with mocked boundaries.
- Added more detailed type definitions for all task and boundary-related functions.