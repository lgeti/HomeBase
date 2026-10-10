export function AddTransactionSheetWrapper({ isOpen, onClose, children }) {
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/45 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-hb-sheet rounded-t-[26px] shadow-2xl transition-transform duration-300 md:fixed md:inset-auto md:rounded-[26px] md:left-1/2 md:top-1/2 md:max-w-sm md:w-full md:transform md:-translate-x-1/2 md:-translate-y-1/2 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          maxHeight: '90vh',
          overflow: 'auto',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle Bar (mobile only) */}
        <div className="sticky top-0 z-10 flex justify-center pt-2.5 pb-1 md:hidden bg-hb-sheet rounded-t-[26px]">
          <div className="w-11 h-[5px] bg-hb-handle rounded-full" />
        </div>

        {/* Content */}
        <div className="px-5 pt-1 pb-2 md:p-6">
          {children}
        </div>
      </div>
    </>
  )
}
