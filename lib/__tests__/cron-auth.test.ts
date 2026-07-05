import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { requireCronAuth } from '../auth/cron-auth'

function req(auth?: string) {
  return new Request('http://x/api/cron/test', { headers: auth ? { authorization: auth } : {} })
}

describe('requireCronAuth', () => {
  beforeEach(() => { process.env.CRON_SECRET = 's3cret' })
  afterEach(() => { delete process.env.CRON_SECRET })

  it('returns null for correct bearer token', () => {
    expect(requireCronAuth(req('Bearer s3cret'))).toBeNull()
  })

  it('returns 401 for wrong token', () => {
    expect(requireCronAuth(req('Bearer wrong'))?.status).toBe(401)
  })

  it('returns 401 for missing header', () => {
    expect(requireCronAuth(req())?.status).toBe(401)
  })

  it('returns 503 when CRON_SECRET is not configured (never open access)', () => {
    delete process.env.CRON_SECRET
    expect(requireCronAuth(req('Bearer anything'))?.status).toBe(503)
  })
})
