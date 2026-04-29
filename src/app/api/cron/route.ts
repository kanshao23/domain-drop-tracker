import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkDomainStatus } from '@/lib/rdap'
import { sendDomainDropAlert } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()

  // Get all domains that haven't been checked in the last 20 hours
  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
  const { data: domains, error } = await supabase
    .from('domains')
    .select('id, domain, user_id, status, notified_at')
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
    .neq('status', 'dropped') // Don't re-check already-dropped domains

  if (error) {
    console.error('Cron DB error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`Checking ${domains?.length ?? 0} domains`)

  let dropped = 0
  let checked = 0

  for (const row of domains ?? []) {
    try {
      const result = await checkDomainStatus(row.domain)

      if (!result.registered) {
        // Domain has dropped!
        await supabase
          .from('domains')
          .update({
            status: 'dropped',
            dropped_at: new Date().toISOString(),
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', row.id)

        // Get user email and notify
        if (!row.notified_at) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', row.user_id)
            .single()

          if (profile?.email) {
            await sendDomainDropAlert(profile.email, row.domain)
            await supabase
              .from('domains')
              .update({ notified_at: new Date().toISOString() })
              .eq('id', row.id)
          }
        }

        dropped++
      } else {
        await supabase
          .from('domains')
          .update({ last_checked_at: new Date().toISOString(), status: 'active' })
          .eq('id', row.id)
      }

      checked++

      // Small delay to be polite to RDAP servers
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.error(`Error checking ${row.domain}:`, err)
    }
  }

  return NextResponse.json({ checked, dropped })
}
