export function AddTransactionSheetWrapper({ isOpen, onClose, children }) {
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-hb-surface rounded-t-2xl shadow-2xl transition-transform duration-300 md:fixed md:inset-auto md:rounded-lg md:left-1/2 md:top-1/2 md:max-w-sm md:w-full md:transform md:-translate-x-1/2 md:-translate-y-1/2 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          maxHeight: '90vh',
          overflow: 'auto',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle Bar (mobile only) */}
        <div className="sticky top-0 flex justify-center pt-3 md:hidden bg-hb-surface rounded-t-2xl border-b border-hb-border">
          <div className="w-12 h-1 bg-hb-handle rounded-full" />
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </>
  )
}
