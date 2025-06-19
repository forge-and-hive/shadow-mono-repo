import axios from 'axios'
import { HiveLogClient, Quality } from '../index'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('HiveLogClient setQuality', () => {
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

  describe('successful setQuality', () => {
    it('should set quality successfully and return true', async () => {
      // Mock successful axios response
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const quality: Quality = {
        score: 8.5,
        reason: 'Good performance with minor improvements needed',
        suggestions: 'Consider optimizing the database query for better performance'
      }

      const result = await client.setQuality('test-task', 'test-uuid-123', quality)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/test-task/logs/test-uuid-123/set-quality',
        {
          quality
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key:test-api-secret',
            'Content-Type': 'application/json'
          }
        }
      )
    })

    it('should handle perfect score quality', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const perfectQuality: Quality = {
        score: 10,
        reason: 'Excellent implementation with no issues found',
        suggestions: 'No improvements needed, great work!'
      }

      const result = await client.setQuality('perfect-task', 'perfect-uuid', perfectQuality)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/perfect-task/logs/perfect-uuid/set-quality',
        {
          quality: perfectQuality
        },
        expect.any(Object)
      )
    })

    it('should handle poor score quality with detailed suggestions', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const poorQuality: Quality = {
        score: 2.0,
        reason: 'Multiple issues found including performance problems and code quality issues',
        suggestions: 'Refactor the main function, add error handling, optimize database queries, and improve variable naming conventions'
      }

      const result = await client.setQuality('poor-task', 'poor-uuid', poorQuality)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/poor-task/logs/poor-uuid/set-quality',
        {
          quality: poorQuality
        },
        expect.any(Object)
      )
    })

    it('should handle edge case scores', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const edgeCaseQuality: Quality = {
        score: 0,
        reason: 'Critical failure in implementation',
        suggestions: 'Complete rewrite required'
      }

      const result = await client.setQuality('edge-task', 'edge-uuid', edgeCaseQuality)

      expect(result).toBe(true)
    })
  })

  describe('failed setQuality', () => {
    it('should return false when axios throws an error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock axios to throw an error
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      const quality: Quality = {
        score: 7.0,
        reason: 'Test quality',
        suggestions: 'Test suggestions'
      }

      const result = await client.setQuality('test-task', 'test-uuid', quality)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to set quality in Hive:',
        'Network error'
      )

      consoleSpy.mockRestore()
    })

    it('should return false when server returns 404', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock axios to throw a 404 error
      const notFoundError = new Error('Request failed with status code 404')
      mockedAxios.post.mockRejectedValueOnce(notFoundError)

      const quality: Quality = {
        score: 5.0,
        reason: 'Not found test',
        suggestions: 'Test suggestions for not found'
      }

      const result = await client.setQuality('non-existent-task', 'non-existent-uuid', quality)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to set quality in Hive:',
        'Request failed with status code 404'
      )

      consoleSpy.mockRestore()
    })

    it('should return false when server returns 500', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock axios to throw a server error
      const serverError = new Error('Internal Server Error')
      mockedAxios.post.mockRejectedValueOnce(serverError)

      const quality: Quality = {
        score: 6.0,
        reason: 'Server error test',
        suggestions: 'Test suggestions for server error'
      }

      const result = await client.setQuality('test-task', 'test-uuid', quality)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to set quality in Hive:',
        'Internal Server Error'
      )

      consoleSpy.mockRestore()
    })

    it('should return false when unauthorized', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock axios to throw an unauthorized error
      const unauthorizedError = new Error('Request failed with status code 401')
      mockedAxios.post.mockRejectedValueOnce(unauthorizedError)

      const quality: Quality = {
        score: 3.0,
        reason: 'Unauthorized test',
        suggestions: 'Check API credentials'
      }

      const result = await client.setQuality('test-task', 'test-uuid', quality)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to set quality in Hive:',
        'Request failed with status code 401'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('setQuality parameters', () => {
    it('should handle special characters in taskName and uuid', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const quality: Quality = {
        score: 4.5,
        reason: 'Special characters test',
        suggestions: 'Handle special characters properly'
      }

      const result = await client.setQuality('task-with-special-chars-!@#', 'uuid-with-special-chars-!@#', quality)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/task-with-special-chars-!@#/logs/uuid-with-special-chars-!@#/set-quality',
        { quality },
        expect.any(Object)
      )
    })

    it('should handle decimal scores correctly', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const quality: Quality = {
        score: 7.123456789,
        reason: 'Decimal precision test',
        suggestions: 'Maintain precision in quality scores'
      }

      const result = await client.setQuality('decimal-task', 'decimal-uuid', quality)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/decimal-task/logs/decimal-uuid/set-quality',
        { quality },
        expect.any(Object)
      )
    })

    it('should handle long reason and suggestions', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      const longReason = 'This is a very long reason that explains in detail what went wrong with the implementation and why the score is what it is. '.repeat(5)
      const longSuggestions = 'Here are detailed suggestions for improvement: 1. Refactor the main function, 2. Add comprehensive error handling, 3. Optimize database queries, 4. Improve code documentation, 5. Add unit tests. '.repeat(3)

      const quality: Quality = {
        score: 3.5,
        reason: longReason,
        suggestions: longSuggestions
      }

      const result = await client.setQuality('long-text-task', 'long-text-uuid', quality)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-host.com/api/tasks/long-text-task/logs/long-text-uuid/set-quality',
        { quality },
        expect.any(Object)
      )
    })
  })
})
