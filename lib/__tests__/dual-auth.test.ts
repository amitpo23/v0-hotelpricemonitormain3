import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { requireUserOrCron, forwardAuthHeaders } from '../auth/dual-auth'

function req(headers: Record<string, string> = {}) {
  return new Request('http://x/api/test', { headers })
}

describe('requireUserOrCron', () => {
  beforeEach(() => { process.env.CRON_SECRET = 's3cret' })
  afterEach(() => { delete process.env.CRON_SECRET })

  it('passes with correct cron bearer', async () => {
    expect(await requireUserOrCron(req({ authorization: 'Bearer s3cret' }))).toBeNull()
  })

  it('rejects wrong bearer and no session with 401', async () => {
    const res = await requireUserOrCron(req({ authorization: 'Bearer wrong' }))
    expect(res?.status).toBe(401)
  })

  it('rejects no credentials at all with 401', async () => {
    const res = await requireUserOrCron(req())
    expect(res?.status).toBe(401)
  })

  it('does not treat unset CRON_SECRET as open access', async () => {
    delete process.env.CRON_SECRET
    const res = await requireUserOrCron(req({ authorization: 'Bearer anything' }))
    expect(res?.status).toBe(401)
  })
})

describe('forwardAuthHeaders', () => {
  it('forwards authorization and cookie only', () => {
    const headers = forwardAuthHeaders(req({
      authorization: 'Bearer x',
      cookie: 'sb-auth-token=y',
      'x-other': 'z',
    }))
    expect(headers).toEqual({ authorization: 'Bearer x', cookie: 'sb-auth-token=y' })
  })

  it('returns empty object when nothing to forward', () => {
    expect(forwardAuthHeaders(req())).toEqual({})
  })
})
