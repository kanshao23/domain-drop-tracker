export interface Domain {
  id: string
  user_id: string
  domain: string
  status: 'active' | 'dropped' | 'checking'
  last_checked_at: string | null
  dropped_at: string | null
  notified_at: string | null
  created_at: string
}

export interface Profile {
  id: string
  email: string
  plan: 'free' | 'pro'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}
