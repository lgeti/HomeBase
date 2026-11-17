import { useEffect, useState } from 'react'
import Logo from './Logo'

export default function LoadingScreen() {
  const [isSlow, setIsSlow] = useState(false)

  // The API (Cloudflare Workers) answers at once, so a long wait is usually a slow connection
  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-hb-bg">
      <div className="text-center">
        <Logo size={64} className="mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-hb-text">HomeBase</h1>
        <p className="text-hb-text2 mt-2">Loading...</p>
        {isSlow && (
          <p className="text-sm text-hb-text2 mt-3 max-w-xs mx-auto">
            This is taking longer than usual. Check your internet connection.
          </p>
        )}
      </div>
    </div>
  )
}
