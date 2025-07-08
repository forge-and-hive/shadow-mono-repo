import axios from 'axios'
import { HiveLogClient, LogApiResponse, ApiError, isApiError } from '../index'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('HiveLogClient getLog', () => {
  const originalEnv = process.env
  let client: HiveLogClient

  const testConfig = {
    projectName: 'test-project',
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    host: 'https://test-host.com'
  }

  beforeEach(() => {
    jest.resetModules()

    // Create client instance with config
    client = new HiveLogClient(testConfig)

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('successful getLog', () => {
    it('should fetch log successfully and return LogApiResponse', async () => {
      const mockLogResponse: LogApiResponse = {
        uuid: 'test-uuid-123',
        taskName: 'test-task',
        projectName: 'test-project',
        logItem: {
          input: { userId: 123, action: 'login' },
          output: { success: true, sessionId: 'abc123' },
          error: null,
          boundaries: {
            database: [{ input: 'SELECT * FROM users', output: [{ id: 123 }], error: null }]
          }
        },
        replayFrom: 'some-replay-id',
        createdAt: '2023-12-01T10:00:00Z'
      }

      // Mock successful axios response
      mockedAxios.get.mockResolvedValueOnce({ data: mockLogResponse })

      const result = await client.getLog('test-task', 'test-uuid-123')

      expect(result).toEqual(mockLogResponse)
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/test-task/logs/test-uuid-123',
        {
          headers: {
            Authorization: 'Bearer test-api-key:test-api-secret',
            'Content-Type': 'application/json'
          }
        }
      )
    })

    it('should handle API error response', async () => {
      const mockErrorResponse: ApiError = {
        error: 'Log not found'
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockErrorResponse })

      const result = await client.getLog('test-task', 'non-existent-uuid')

      expect(result).toEqual(mockErrorResponse)
      expect(isApiError(result)).toBe(true)
    })

    it('should handle minimal log response', async () => {
      const mockMinimalResponse: LogApiResponse = {
        uuid: 'minimal-uuid',
        taskName: 'minimal-task',
        projectName: 'test-project',
        logItem: {
          input: 'simple input'
        },
        createdAt: '2023-12-01T10:00:00Z'
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockMinimalResponse })

      const result = await client.getLog('minimal-task', 'minimal-uuid')

      expect(result).toEqual(mockMinimalResponse)
      expect(isApiError(result)).toBe(false)
    })
  })

  describe('failed getLog', () => {
    it('should return null when axios throws an error', async () => {
      // Mock axios to throw an error
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

      const result = await client.getLog('test-task', 'test-uuid')

      expect(result).toBeNull()
    })

    it('should return null when server returns 404', async () => {
      // Mock axios to throw a 404 error
      const notFoundError = new Error('Request failed with status code 404')
      mockedAxios.get.mockRejectedValueOnce(notFoundError)

      const result = await client.getLog('test-task', 'non-existent-uuid')

      expect(result).toBeNull()
    })

    it('should return null when server returns 500', async () => {
      // Mock axios to throw a server error
      const serverError = new Error('Server Error')
      mockedAxios.get.mockRejectedValueOnce(serverError)

      const result = await client.getLog('test-task', 'test-uuid')

      expect(result).toBeNull()
    })
  })

  describe('getLog parameters', () => {
    it('should handle special characters in taskName and uuid', async () => {
      const mockResponse: LogApiResponse = {
        uuid: 'uuid-with-special-chars-!@#',
        taskName: 'task-with-special-chars-!@#',
        projectName: 'test-project',
        logItem: { input: 'test' },
        createdAt: '2023-12-01T10:00:00Z'
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await client.getLog('task-with-special-chars-!@#', 'uuid-with-special-chars-!@#')

      expect(result).toEqual(mockResponse)
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/task-with-special-chars-!@#/logs/uuid-with-special-chars-!@#',
        expect.any(Object)
      )
    })
  })
})

describe('isApiError type guard', () => {
  it('should return true for ApiError objects', () => {
    const apiError: ApiError = { error: 'Something went wrong' }
    expect(isApiError(apiError)).toBe(true)
  })

  it('should return false for LogApiResponse objects', () => {
    const logResponse: LogApiResponse = {
      uuid: 'test-uuid',
      taskName: 'test-task',
      projectName: 'test-project',
      logItem: { input: 'test' },
      createdAt: '2023-12-01T10:00:00Z'
    }
    expect(isApiError(logResponse)).toBe(false)
  })

  it('should return false for null or undefined', () => {
    expect(isApiError(null)).toBeFalsy()
    expect(isApiError(undefined)).toBeFalsy()
  })

  it('should return false for objects without error property', () => {
    expect(isApiError({ success: true })).toBe(false)
    expect(isApiError({ data: 'some data' })).toBe(false)
  })
})
