export interface RdapResult {
  registered: boolean
  expiresAt: string | null
  registrar: string | null
}

// RDAP is the modern replacement for WHOIS — public, no rate limits like WHOIS
export async function checkDomainStatus(domain: string): Promise<RdapResult> {
  const tld = domain.split('.').pop()
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

    const data = await res.json()

    const expiryEvent = data.events?.find(
      (e: { eventAction: string; eventDate: string }) =>
        e.eventAction === 'expiration'
    )

    const registrar =
      data.entities?.find(
        (e: { roles: string[] }) => e.roles?.includes('registrar')
      )?.vcardArray?.[1]?.find(
        (v: string[]) => v[0] === 'fn'
      )?.[3] ?? null

    return {
      registered: true,
      expiresAt: expiryEvent?.eventDate ?? null,
      registrar,
    }
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
