// TASK: getPrice
// Run this task with:
// shadow-cli task:run stock:getPrice --ticker AAPL
// shadow-cli task:run stock:getPrice --ticker VOO

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

const schema = new Schema({
  ticker: Schema.string()
})

const boundaries = {
  fetchStockPrice: async (ticker: string): Promise<{price:number}> => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch stock price for ${ticker}: ${response.statusText}`)
    }

    const data = await response.json()
    const price = data.chart.result[0].meta.regularMarketPrice
    return {price}
  }
}

export const getPrice = createTask(
  schema,
  boundaries,
  async function ({ ticker }, { fetchStockPrice }): Promise<{ ticker: string, price: number }> {
    const { price } = await fetchStockPrice(ticker as string)

    return {
      ticker,
      price
    }
  }
)
