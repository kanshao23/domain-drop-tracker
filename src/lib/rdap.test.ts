import { describe, it, expect } from 'vitest'
import { parseRdapResponse } from './rdap'

describe('parseRdapResponse', () => {
  it('extracts expiry date and registrar name', () => {
    const result = parseRdapResponse({
      events: [
        { eventAction: 'registration', eventDate: '2020-01-01T00:00:00Z' },
        { eventAction: 'expiration', eventDate: '2026-01-01T00:00:00Z' },
      ],
      entities: [
        {
          roles: ['registrar'],
          vcardArray: ['vcard', [['fn', {}, 'text', 'Porkbun LLC']]],
        },
      ],
    })

    expect(result).toEqual({
      registered: true,
      expiresAt: '2026-01-01T00:00:00Z',
      registrar: 'Porkbun LLC',
    })
  })

  it('returns nulls when expiry and registrar are absent', () => {
    expect(parseRdapResponse({})).toEqual({
      registered: true,
      expiresAt: null,
      registrar: null,
    })
  })

  it('ignores non-registrar entities', () => {
    const result = parseRdapResponse({
      entities: [
        {
          roles: ['technical'],
          vcardArray: ['vcard', [['fn', {}, 'text', 'Tech Contact']]],
        },
      ],
    })

    expect(result.registrar).toBeNull()
  })
})
