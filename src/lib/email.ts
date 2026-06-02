import { Resend } from 'resend'
import { getAffiliateLink, getNamecheapLink } from './rdap'

export async function sendDomainDropAlert(
  to: string,
  domain: string
) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const porkbunLink = getAffiliateLink(domain)
  const namecheapLink = getNamecheapLink(domain)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://domaindrop.watch'

  await resend.emails.send({
    from: 'DomainDrop <alerts@domaindrop.watch>',
    to,
    subject: `🎯 ${domain} just dropped!`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #111;">
  <h1 style="font-size: 24px; margin-bottom: 8px;">🎯 ${domain} is available!</h1>
  <p style="color: #555; margin-bottom: 32px;">The domain you were watching just dropped. Grab it before someone else does.</p>

  <div style="display: flex; gap: 12px; margin-bottom: 40px;">
    <a href="${porkbunLink}"
       style="background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 12px;">
      Register on Porkbun →
    </a>
    <a href="${namecheapLink}"
       style="background: #f5f5f5; color: #111; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
      Try Namecheap
    </a>
  </div>

  <p style="font-size: 13px; color: #999;">You're watching this domain on <a href="${appUrl}" style="color: #999;">DomainDrop</a>. <a href="${appUrl}/dashboard" style="color: #999;">Manage watchlist</a></p>
</body>
</html>
    `,
  })
}
