import { describe, it, expect, afterEach } from 'vitest'
import { requireEnv } from '../env'

describe('requireEnv', () => {
  afterEach(() => { delete process.env.TEST_VAR_X })

  it('returns the value when set', () => {
    process.env.TEST_VAR_X = 'abc'
    expect(requireEnv('TEST_VAR_X')).toBe('abc')
  })

  it('throws with the variable name when missing', () => {
    expect(() => requireEnv('TEST_VAR_X')).toThrow(/TEST_VAR_X/)
  })

  it('throws when value is empty string', () => {
    process.env.TEST_VAR_X = ''
    expect(() => requireEnv('TEST_VAR_X')).toThrow(/TEST_VAR_X/)
  })
})
