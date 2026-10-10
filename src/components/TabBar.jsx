import { CATEGORIES } from '../config/categories'

export default function TabBar({ activeTab, onTabChange }) {
  const tabs = ['All', ...CATEGORIES.map((cat) => cat.name)]

  return (
    <div className="flex overflow-x-auto gap-2 px-4 py-3 bg-hb-surface border-b border-hb-border sticky top-14 md:top-16 scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeTab === tab
        const category = CATEGORIES.find((cat) => cat.name === tab)

        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition ${
              isActive
                ? (category ? 'text-hb-on-cat' : 'bg-hb-primary text-hb-on-primary')
                : 'text-hb-text2 bg-hb-surface2 hover:bg-hb-border'
            }`}
            style={isActive && category ? { backgroundColor: category.color } : {}}
          >
            <span className="mr-1">{category?.emoji || ''}</span>
            {tab}
          </button>
        )
      })}
    </div>
  )
}
