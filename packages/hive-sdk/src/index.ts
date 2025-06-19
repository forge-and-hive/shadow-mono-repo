import axios from 'axios'
import debug from 'debug'

const log = debug('hive-sdk')

// API Response Types
export interface LogApiResponse {
  uuid: string
  taskName: string
  projectName: string
  logItem: {
    input: unknown
    output?: unknown
    error?: unknown
    boundaries?: Record<string, Array<{ input: unknown; output: unknown, error: unknown }>>
  }
  replayFrom?: string
  createdAt: string
}

export interface ApiError {
  error: string
}

export interface LogApiSuccess extends LogApiResponse {}

export type LogApiResult = LogApiSuccess | ApiError

// Quality interface for setQuality method
export interface Quality {
  score: number
  reason: string
  suggestions: string
}

// Type guard to check if response is an error
export function isApiError(response: unknown): response is ApiError {
  return response !== null && typeof response === 'object' && 'error' in response
}

export class HiveLogClient {
  private apiKey: string
  private apiSecret: string
  private host: string
  private projectName: string

  constructor(projectName: string) {
    const apiKey = process.env.HIVE_API_KEY
    const apiSecret = process.env.HIVE_API_SECRET
    const host = process.env.HIVE_HOST

    if (!apiKey || !apiSecret || !host) {
      throw new Error('Missing Hive API credentials or host, get them at https://forgehive.dev')
    }

    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.host = host
    this.projectName = projectName

    log('HiveLogClient initialized for project "%s" with host "%s"', projectName, host)
  }

  async sendLog(taskName: string, logItem: unknown): Promise<boolean> {
    try {
      const logsUrl = `${this.host}/api/tasks/log-ingest`
      log('Sending log for task "%s" to %s', taskName, logsUrl)

      const authToken = `${this.apiKey}:${this.apiSecret}`

      await axios.post(logsUrl, {
        projectName: this.projectName,
        taskName,
        logItem: JSON.stringify(logItem)
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      log('Success: Sent log for task "%s"', taskName)
      return true
    } catch (e) {
      const error = e as Error
      log('Error: Failed to send log for task "%s": %s', taskName, error.message)
      return false
    }
  }

  async getLog(taskName: string, uuid: string): Promise<LogApiResult | null> {
    try {
      const logUrl = `${this.host}/api/tasks/${taskName}/logs/${uuid}`
      log('Fetching log for task "%s" with uuid "%s" from %s', taskName, uuid, logUrl)

      const authToken = `${this.apiKey}:${this.apiSecret}`

      const response = await axios.get(logUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      log('Success: Fetched log for task "%s" with uuid "%s"', taskName, uuid)
      return response.data as LogApiResult
    } catch (e) {
      const error = e as Error
      log('Error: Failed to fetch log for task "%s" with uuid "%s": %s', taskName, uuid, error.message)
      return null
    }
  }

  async setQuality(taskName: string, uuid: string, quality: Quality): Promise<boolean> {
    try {
      const qualityUrl = `${this.host}/api/tasks/${taskName}/logs/${uuid}/set-quality`
      log('Setting quality for task "%s" with uuid "%s" (score: %d) to %s', taskName, uuid, quality.score, qualityUrl)

      const authToken = `${this.apiKey}:${this.apiSecret}`

      await axios.post(qualityUrl, {
        quality
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      log('Success: Set quality for task "%s" with uuid "%s" (score: %d)', taskName, uuid, quality.score)
      return true
    } catch (e) {
      const error = e as Error
      log('Error: Failed to set quality for task "%s" with uuid "%s": %s', taskName, uuid, error.message)
      return false
    }
  }
}

export const createHiveLogClient = (projectName: string): HiveLogClient => {
  log('Creating HiveLogClient for project "%s"', projectName)
  return new HiveLogClient(projectName)
}
