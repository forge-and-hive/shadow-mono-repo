// Global test setup - mocks for problematic ES modules

// Mock archiver to avoid ES module issues
jest.mock('archiver', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    pipe: jest.fn(),
    finalize: jest.fn(),
    directory: jest.fn(),
    file: jest.fn(),
    on: jest.fn(),
    pointer: jest.fn(() => 0)
  }))
}))
