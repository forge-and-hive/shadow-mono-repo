import axios from 'axios'
import debug from 'debug'

const log = debug('hive-sdk')

// Metadata interface
export interface Metadata {
  [key: string]: unknown
}

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
    metadata?: Metadata
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
  private apiKey: string | null
  private apiSecret: string | null
  private host: string | null
  private projectName: string
  private baseMetadata: Metadata
  private isInitialized: boolean

  constructor(projectName: string, baseMetadata?: Metadata) {
    const apiKey = process.env.HIVE_API_KEY
    const apiSecret = process.env.HIVE_API_SECRET
    const host = process.env.HIVE_HOST

    this.projectName = projectName
    this.baseMetadata = baseMetadata || {}

    if (!apiKey || !apiSecret || !host) {
      this.apiKey = null
      this.apiSecret = null
      this.host = null
      this.isInitialized = false
      log('HiveLogClient in silent mode for project "%s" - missing credentials (get them at https://forgehive.dev)', projectName)
    } else {
      this.apiKey = apiKey
      this.apiSecret = apiSecret
      this.host = host
      this.isInitialized = true
      log('HiveLogClient initialized for project "%s" with host "%s"', projectName, host)
    }
  }

  isActive(): boolean {
    return this.isInitialized
  }

  private mergeMetadata(logItem: unknown, sendLogMetadata?: Metadata): Metadata {
    // Start with base metadata from client
    let finalMetadata = { ...this.baseMetadata }

    // Merge with logItem metadata if it exists
    if (logItem && typeof logItem === 'object' && 'metadata' in logItem) {
      const logItemMetadata = (logItem as { metadata: unknown }).metadata
      if (logItemMetadata && typeof logItemMetadata === 'object') {
        finalMetadata = { ...finalMetadata, ...(logItemMetadata as Metadata) }
      }
    }

    // Merge with sendLog metadata (highest priority)
    if (sendLogMetadata) {
      finalMetadata = { ...finalMetadata, ...sendLogMetadata }
    }

    return finalMetadata
  }

  async sendLog(taskName: string, logItem: unknown, metadata?: Metadata): Promise<'success' | 'error' | 'silent'> {
    if (!this.isInitialized) {
      log('Silent mode: Skipping sendLog for task "%s" - client not initialized', taskName)
      return 'silent'
    }

    try {
      const logsUrl = `${this.host}/api/tasks/log-ingest`
      log('Sending log for task "%s" to %s', taskName, logsUrl)

      const authToken = `${this.apiKey}:${this.apiSecret}`

      // Merge metadata with priority: sendLog > logItem > client
      const finalMetadata = this.mergeMetadata(logItem, metadata)

      // Create enhanced logItem with merged metadata
      const enhancedLogItem = {
        ...(typeof logItem === 'object' && logItem !== null ? logItem : { data: logItem }),
        metadata: finalMetadata
      }

      await axios.post(logsUrl, {
        projectName: this.projectName,
        taskName,
        logItem: JSON.stringify(enhancedLogItem)
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      log('Success: Sent log for task "%s"', taskName)
      return 'success'
    } catch (e) {
      const error = e as Error
      log('Error: Failed to send log for task "%s": %s', taskName, error.message)
      return 'error'
    }
  }

  async getLog(taskName: string, uuid: string): Promise<LogApiResult | null> {
    if (!this.isInitialized) {
      log('Error: getLog for task "%s" with uuid "%s" - missing credentials', taskName, uuid)
      throw new Error('Missing Hive API credentials or host, get them at https://forgehive.dev')
    }

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
    if (!this.isInitialized) {
      log('Error: setQuality for task "%s" with uuid "%s" - missing credentials', taskName, uuid)
      throw new Error('Missing Hive API credentials or host, get them at https://forgehive.dev')
    }

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

export const createHiveLogClient = (projectName: string, baseMetadata?: Metadata): HiveLogClient => {
  log('Creating HiveLogClient for project "%s"', projectName)
  return new HiveLogClient(projectName, baseMetadata)
}
