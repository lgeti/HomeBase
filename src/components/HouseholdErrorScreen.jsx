export default function HouseholdErrorScreen({ message }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-warm-cream px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-semibold text-gray-800">HomeBase</h1>
        <p className="mt-3 text-sm text-red-700">
          HomeBase could not reach the household service. Your data was not changed.
        </p>
        <p className="mt-2 break-words text-xs text-gray-500">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 w-full rounded-lg bg-spring-sage-deep py-3 font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
