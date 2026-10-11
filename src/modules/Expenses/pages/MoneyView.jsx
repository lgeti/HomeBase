import CategoryView from './CategoryView'
import Dashboard from './Dashboard'

const TABS = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'dashboard', label: 'Dashboard' },
]

// Money holds the expense list and the dashboard as two tabs
export default function MoneyView({ tab, onTabChange, expenses, members, joinedMembers, onEditExpense, onDeleteExpense, onCategoryChange }) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-hb-surface px-4 pt-2.5">
        <div role="tablist" aria-label="Money" className="mx-auto grid max-w-lg grid-cols-2 gap-1 rounded-[14px] bg-hb-surface2 p-1">
          {TABS.map((option) => {
            const isOn = tab === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isOn}
                onClick={() => onTabChange(option.id)}
                className={`rounded-[10px] py-2 text-sm transition ${
                  isOn ? 'bg-hb-seg-on text-hb-text font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-hb-text2 font-medium'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col">
        {tab === 'dashboard' ? (
          <Dashboard expenses={expenses} members={joinedMembers} />
        ) : (
          <CategoryView
            expenses={expenses}
            onEditExpense={onEditExpense}
            onDeleteExpense={onDeleteExpense}
            members={members}
            onCategoryChange={onCategoryChange}
          />
        )}
      </div>
    </div>
  )
}
