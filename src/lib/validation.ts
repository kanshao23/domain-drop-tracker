import { z } from 'zod'

// Strip protocol, path, and surrounding whitespace, then lowercase.
function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

// Basic hostname check: one or more labels + a TLD of 2+ letters.
// Rejects empty input, spaces, and obviously malformed values before they
// reach the database or the RDAP lookup.
const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

export const domainSchema = z
  .string()
  .transform(normalize)
  .refine(value => HOSTNAME.test(value), {
    message: 'Enter a valid domain, e.g. example.com',
  })

// Returns the normalized domain, or an error message if invalid.
export function parseDomain(input: string):
  | { ok: true; domain: string }
  | { ok: false; error: string } {
  const result = domainSchema.safeParse(input)
  if (result.success) return { ok: true, domain: result.data }
  return { ok: false, error: result.error.issues[0]?.message ?? 'Invalid domain' }
}
