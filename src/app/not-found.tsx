import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-sm">
        <p className="text-sm font-mono text-gray-400 mb-3">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 text-sm mb-8">
          That page doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-black text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
