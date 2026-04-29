import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-xl font-bold tracking-tight">DomainDrop</span>
        <div className="flex gap-4 items-center">
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-black">Sign in</Link>
          <Link href="/auth/signup" className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Watching 2,400+ domains right now
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
            Never miss a<br />premium domain drop
          </h1>

          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Add domains to your watchlist. We check daily via RDAP. The moment
            one drops, you get an email with a one-click register link.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center bg-black text-white text-base font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Start watching for free
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center border border-gray-200 text-gray-700 text-base font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Add domains',
              desc: 'Paste any domain you want to track. Up to 10 free, unlimited on Pro.',
            },
            {
              step: '02',
              title: 'We watch daily',
              desc: 'Our cron job queries the RDAP protocol every day — no rate limits, no BS.',
            },
            {
              step: '03',
              title: 'Snag it fast',
              desc: 'Instant email alert with direct links to register before anyone else does.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex flex-col gap-3">
              <span className="text-sm font-mono text-gray-400">{step}</span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div id="pricing" className="mt-32">
          <h2 className="text-3xl font-bold mb-12">Simple pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            {/* Free */}
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-lg font-semibold mb-1">Free</h3>
              <div className="text-3xl font-bold mb-6">$0</div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li className="flex gap-2"><span className="text-green-500">✓</span> Watch up to 10 domains</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Daily RDAP checks</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Email alerts</li>
              </ul>
              <Link
                href="/auth/signup"
                className="block text-center border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Pro */}
            <div className="border-2 border-black rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-6 bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <h3 className="text-lg font-semibold mb-1">Pro</h3>
              <div className="text-3xl font-bold mb-6">$5<span className="text-base font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li className="flex gap-2"><span className="text-green-500">✓</span> Unlimited domains</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Daily RDAP checks</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Email alerts</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Priority support</li>
              </ul>
              <Link
                href="/auth/signup"
                className="block text-center bg-black text-white font-semibold py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <span>© 2026 DomainDrop</span>
          <span>Drop alerts via RDAP · No WHOIS scraping</span>
        </div>
      </footer>
    </div>
  )
}
