export default function HouseholdErrorScreen({ message }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-hb-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-hb-surface p-8 text-center shadow-lg">
        <h1 className="text-2xl font-semibold text-hb-text">HomeBase</h1>
        <p className="mt-3 text-sm text-hb-danger">
          HomeBase could not reach the household service. Your data was not changed.
        </p>
        <p className="mt-2 break-words text-xs text-hb-text2">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 w-full rounded-lg bg-hb-primary py-3 font-semibold text-hb-on-primary"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
