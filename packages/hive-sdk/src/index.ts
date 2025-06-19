import axios from 'axios'

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

    // eslint-disable-next-line no-console
    console.log('HiveLogClient initialized', host, projectName)
  }

  async sendLog(taskName: string, logItem: unknown): Promise<boolean> {
    try {
      const logsUrl = `${this.host}/api/tasks/log-ingest`

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

      return true
    } catch (e) {
      const error = e as Error
      // eslint-disable-next-line no-console
      console.error('Failed to send log to Hive:', error.message)
      return false
    }
  }
}

export const createHiveLogClient = (projectName: string): HiveLogClient => {
  return new HiveLogClient(projectName)
}
