import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Landing target for the "Manage watchlist" link in drop-alert emails.
// The watchlist (where users remove domains they no longer want to track)
// lives on the dashboard, so send authenticated users there and prompt
// anonymous recipients to sign in first.
export default async function UnsubscribePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')
  redirect('/auth/login')
}
