'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Domain, Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { getAffiliateLink } from '@/lib/rdap'

const FREE_LIMIT = 10

interface Props {
  user: User
  domains: Domain[]
  profile: Profile | null
}

export default function DashboardClient({ user, domains, profile }: Props) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [upgrading, setUpgrading] = useState(false)

  const isPro = profile?.plan === 'pro'
  const atLimit = !isPro && domains.length >= FREE_LIMIT

  async function addDomain(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    if (atLimit) {
      setError('Free plan limit reached. Upgrade to Pro for unlimited domains.')
      return
    }

    setAdding(true)
    setError('')

    const domain = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

    const supabase = createClient()
    const { error: dbError } = await supabase.from('domains').insert({
      user_id: user.id,
      domain,
    })

    if (dbError) {
      setError(dbError.code === '23505' ? 'Already watching this domain.' : dbError.message)
    } else {
      setInput('')
      router.refresh()
    }
    setAdding(false)
  }

  async function removeDomain(id: string) {
    const supabase = createClient()
    await supabase.from('domains').delete().eq('id', id)
    router.refresh()
  }

  async function handleUpgrade() {
    setUpgrading(true)
    const res = await fetch('/api/create-checkout', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setUpgrading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">DomainDrop</span>
          <div className="flex items-center gap-4">
            {!isPro && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="text-sm bg-black text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {upgrading ? '…' : 'Upgrade to Pro $5/mo'}
              </button>
            )}
            {isPro && (
              <span className="text-xs bg-black text-white px-2 py-1 rounded-full font-semibold">PRO</span>
            )}
            <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-black">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Your watchlist</h1>
          <p className="text-gray-500 text-sm">
            {isPro
              ? `${domains.length} domains — unlimited plan`
              : `${domains.length} / ${FREE_LIMIT} domains — free plan`}
          </p>
        </div>

        {/* Add domain form */}
        <form onSubmit={addDomain} className="flex gap-3 mb-6">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="example.com"
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            disabled={atLimit}
          />
          <button
            type="submit"
            disabled={adding || atLimit}
            className="bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {adding ? 'Adding…' : 'Watch'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
            {atLimit && !isPro && (
              <button onClick={handleUpgrade} className="ml-2 underline font-medium">
                Upgrade →
              </button>
            )}
          </div>
        )}

        {/* Domain list */}
        {domains.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">Add a domain to start watching</p>
          </div>
        ) : (
          <div className="space-y-2">
            {domains.map(d => (
              <div
                key={d.id}
                className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={d.status} dropped={!!d.dropped_at} />
                  <div>
                    <p className="text-sm font-medium">{d.domain}</p>
                    <p className="text-xs text-gray-400">
                      {d.dropped_at
                        ? `Dropped ${new Date(d.dropped_at).toLocaleDateString()}`
                        : d.last_checked_at
                        ? `Checked ${new Date(d.last_checked_at).toLocaleDateString()}`
                        : 'Pending first check'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {d.dropped_at && (
                    <a
                      href={getAffiliateLink(d.domain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-700"
                    >
                      Register now →
                    </a>
                  )}
                  <button
                    onClick={() => removeDomain(d.id)}
                    className="text-gray-300 hover:text-red-500 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function StatusDot({ status, dropped }: { status: string; dropped: boolean }) {
  if (dropped) return <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" title="Available!" />
  if (status === 'checking') return <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" title="Checking…" />
  return <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" title="Registered" />
}
