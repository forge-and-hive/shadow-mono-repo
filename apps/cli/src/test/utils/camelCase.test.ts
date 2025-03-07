import { camelCase } from '../../utils/camelCase'

describe('camelCase utility', () => {
  it('should convert a simple string to camelCase', () => {
    expect(camelCase('hello world')).toBe('helloWorld')
  })

  it('should handle strings with multiple separators', () => {
    expect(camelCase('hello-world_example test')).toBe('helloWorldExampleTest')
  })

  it('should handle strings with uppercase letters', () => {
    expect(camelCase('Hello World')).toBe('helloWorld')
  })

  it('should handle empty strings', () => {
    expect(camelCase('')).toBe('')
  })

  it('should handle strings with only separators', () => {
    expect(camelCase('---___   ')).toBe('')
  })

  it('should handle strings with numbers', () => {
    expect(camelCase('hello-123-world')).toBe('hello123World')
  })

  it('should handle strings with leading separators', () => {
    expect(camelCase('_hello_world')).toBe('helloWorld')
  })

  it('should handle strings with trailing separators', () => {
    expect(camelCase('hello_world_')).toBe('helloWorld')
  })

  it('should handle single word strings', () => {
    expect(camelCase('hello')).toBe('hello')
  })

  it('should handle already camelCased strings', () => {
    expect(camelCase('helloWorld')).toBe('helloWorld')
  })
})
