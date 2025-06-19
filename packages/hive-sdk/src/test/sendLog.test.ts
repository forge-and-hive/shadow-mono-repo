import axios from 'axios'
import { HiveLogClient } from '../index'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('HiveLogClient sendLog', () => {
  const originalEnv = process.env
  let client: HiveLogClient

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }

    // Set up environment variables
    process.env.HIVE_API_KEY = 'test-api-key'
    process.env.HIVE_API_SECRET = 'test-api-secret'
    process.env.HIVE_HOST = 'https://test-host.com'

    // Create client instance
    client = new HiveLogClient('test-project')

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('successful sendLog', () => {
    it('should send log successfully and return true', async () => {
      // Mock successful axios response
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const logItem = { input: 'test-input', output: 'test-output' }
      const result = await client.sendLog('test-task', logItem)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'test-task',
          logItem: JSON.stringify(logItem)
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key:test-api-secret',
            'Content-Type': 'application/json'
          }
        }
      )
    })

    it('should handle complex log items', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const complexLogItem = {
        input: { userId: 123, action: 'login' },
        output: { success: true, sessionId: 'abc123' },
        error: null,
        boundaries: {
          database: [{ input: 'SELECT * FROM users', output: [{ id: 123 }], error: null }]
        }
      }

      const result = await client.sendLog('complex-task', complexLogItem)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'complex-task',
          logItem: JSON.stringify(complexLogItem)
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key:test-api-secret',
            'Content-Type': 'application/json'
          }
        }
      )
    })
  })

  describe('failed sendLog', () => {
    it('should return false when axios throws an error', async () => {
      // Mock axios to throw an error
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const logItem = { input: 'test-input' }
      const result = await client.sendLog('test-task', logItem)

      expect(result).toBe(false)
    })

    it('should return false when server returns 500', async () => {
      // Mock axios to throw a server error
      const serverError = new Error('Server Error')
      mockedAxios.post.mockRejectedValueOnce(serverError)

      const result = await client.sendLog('test-task', { input: 'test' })

      expect(result).toBe(false)
    })
  })

  describe('sendLog parameters', () => {
    it('should handle empty log items', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const result = await client.sendLog('empty-task', {})

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'empty-task',
          logItem: JSON.stringify({})
        },
        expect.any(Object)
      )
    })

    it('should handle null/undefined values in log items', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const logItem = { input: null, output: undefined, error: 'some error' }
      const result = await client.sendLog('null-task', logItem)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/log-ingest',
        {
          projectName: 'test-project',
          taskName: 'null-task',
          logItem: JSON.stringify(logItem)
        },
        expect.any(Object)
      )
    })
  })
})
