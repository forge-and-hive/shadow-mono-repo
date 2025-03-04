import buildSchema from '../index'

describe('buildSchema', () => {
  it('should return a greeting with the provided name', () => {
    const result = buildSchema('World')
    expect(result).toBe('Hello World')
  })
})
