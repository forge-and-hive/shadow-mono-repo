import { Schema } from '@shadow/schema'
import { Task } from '@shadow/task'

describe('CLI App', () => {
  test('true should equal true', () => {
    expect(true).toBe(true)
  })

  test('Schema should be defined', () => {
    expect(Schema).toBeDefined()
  })

  test('Task should be defined', () => {
    expect(Task).toBeDefined()
  })
})
