const tabClass = (isActive) => `flex-1 py-3 text-center font-semibold hover:text-opacity-80 ${
  isActive ? 'text-hb-primary' : 'text-hb-text2 hover:text-hb-text2'
}`

export default function BottomNav({ activeView, onNavigate, onAdd }) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-hb-surface border-t border-hb-border p-2">
      <nav className="max-w-lg mx-auto flex justify-around gap-1">
        <button onClick={() => onNavigate('categories')} className={tabClass(activeView === 'categories')}>
          <span className="text-xl">📋</span>
          <span className="text-xs block">Categories</span>
        </button>
        <button
          onClick={onAdd}
          className="flex-1 py-3 text-center text-hb-primary font-semibold hover:text-opacity-80"
        >
          <span className="text-xl">➕</span>
          <span className="text-xs block">Add</span>
        </button>
        <button
          onClick={() => onNavigate(activeView === 'dashboard' ? 'categories' : 'dashboard')}
          className={tabClass(activeView === 'dashboard')}
        >
          <span className="text-xl">📊</span>
          <span className="text-xs block">Dashboard</span>
        </button>
        <button onClick={() => onNavigate('household')} className={tabClass(activeView === 'household')}>
          <span className="text-xl">👥</span>
          <span className="text-xs block">Household</span>
        </button>
      </nav>
    </footer>
  )
}
