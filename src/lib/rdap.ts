export interface RdapResult {
  registered: boolean
  expiresAt: string | null
  registrar: string | null
}

// Minimal shape of the fields we read from an RDAP domain response.
interface RdapResponse {
  events?: { eventAction: string; eventDate: string }[]
  entities?: { roles?: string[]; vcardArray?: [string, unknown[][]] }[]
}

// Pure parser for a registered-domain RDAP payload. Extracted so it can be
// unit-tested without hitting the network.
export function parseRdapResponse(data: RdapResponse): RdapResult {
  const expiryEvent = data.events?.find(e => e.eventAction === 'expiration')

  const registrarVcard = data.entities?.find(e =>
    e.roles?.includes('registrar')
  )?.vcardArray?.[1]
  const registrar =
    (registrarVcard?.find(v => v[0] === 'fn')?.[3] as string | undefined) ?? null

  return {
    registered: true,
    expiresAt: expiryEvent?.eventDate ?? null,
    registrar,
  }
}

// RDAP is the modern replacement for WHOIS — public, no rate limits like WHOIS
export async function checkDomainStatus(domain: string): Promise<RdapResult> {
  const rdapUrl = `https://rdap.org/domain/${encodeURIComponent(domain)}`

  try {
    const res = await fetch(rdapUrl, {
      headers: { Accept: 'application/rdap+json' },
      next: { revalidate: 0 },
    })

    if (res.status === 404) {
      return { registered: false, expiresAt: null, registrar: null }
    }

    if (!res.ok) {
      throw new Error(`RDAP error: ${res.status}`)
    }

    return parseRdapResponse(await res.json())
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      return { registered: false, expiresAt: null, registrar: null }
    }
    throw err
  }
}

export function getAffiliateLink(domain: string): string {
  // Porkbun affiliate — they offer affiliate program
  return `https://porkbun.com/checkout/registerDomain?domain=${encodeURIComponent(domain)}`
}

export function getNamecheapLink(domain: string): string {
  return `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`
}
