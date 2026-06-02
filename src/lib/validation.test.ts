import { describe, it, expect } from 'vitest'
import { parseDomain } from './validation'

describe('parseDomain', () => {
  it('accepts a plain domain', () => {
    expect(parseDomain('example.com')).toEqual({ ok: true, domain: 'example.com' })
  })

  it('normalizes protocol, path, case, and whitespace', () => {
    expect(parseDomain('  HTTPS://Example.COM/some/path  ')).toEqual({
      ok: true,
      domain: 'example.com',
    })
  })

  it('accepts subdomains and multi-label TLDs', () => {
    expect(parseDomain('shop.example.co.uk')).toEqual({
      ok: true,
      domain: 'shop.example.co.uk',
    })
  })

  it('rejects empty input', () => {
    expect(parseDomain('   ').ok).toBe(false)
  })

  it('rejects values without a TLD', () => {
    expect(parseDomain('example').ok).toBe(false)
  })

  it('rejects spaces inside the host', () => {
    expect(parseDomain('exa mple.com').ok).toBe(false)
  })

  it('rejects a numeric-only TLD', () => {
    expect(parseDomain('example.123').ok).toBe(false)
  })
})
