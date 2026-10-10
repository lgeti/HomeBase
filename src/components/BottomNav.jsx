import Icon from './Icon'

const TABS = [
  { view: 'categories', label: 'Categories', icon: 'list' },
  { view: 'add', label: 'Add', icon: 'plus' },
  { view: 'dashboard', label: 'Dashboard', icon: 'chart' },
  { view: 'household', label: 'Household', icon: 'users' },
]

export default function BottomNav({ activeView, onNavigate, onAdd }) {
  const handleClick = (view) => {
    if (view === 'add') return onAdd()
    // Tapping Dashboard again goes back to the categories list
    if (view === 'dashboard' && activeView === 'dashboard') return onNavigate('categories')
    return onNavigate(view)
  }

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 bg-hb-surface border-t border-hb-border px-2.5 pt-2"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <nav className="max-w-lg mx-auto flex justify-around">
        {TABS.map((tab) => {
          const isAdd = tab.view === 'add'
          const isActive = tab.view === activeView
          const pill = isAdd ? 'bg-hb-primary text-hb-on-primary' : isActive ? 'bg-hb-primary-tint text-hb-primary' : 'text-hb-text2'

          return (
            <button
              key={tab.view}
              type="button"
              onClick={() => handleClick(tab.view)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-semibold ${
                isAdd || isActive ? 'text-hb-primary' : 'text-hb-text2'
              }`}
            >
              <span className={`flex h-[30px] w-9 items-center justify-center rounded-xl ${pill}`}>
                <Icon name={tab.icon} size={20} />
              </span>
              {tab.label}
            </button>
          )
        })}
      </nav>
    </footer>
  )
}
