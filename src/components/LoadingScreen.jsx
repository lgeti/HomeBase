import { useEffect, useState } from 'react'

export default function LoadingScreen() {
  const [isSlow, setIsSlow] = useState(false)

  // The API sleeps when idle (Render free plan) and can take 20+ seconds to wake, so explain long waits
  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-warm-cream via-warm-beige to-spring-mint">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-800">HomeBase</h1>
        <p className="text-gray-600 mt-2">Loading...</p>
        {isSlow && (
          <p className="text-sm text-gray-500 mt-3 max-w-xs mx-auto">
            Waking up the server. After a quiet period this can take up to a minute.
          </p>
        )}
      </div>
    </div>
  )
}
