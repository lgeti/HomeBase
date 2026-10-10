import { CATEGORIES } from '../config/categories'
import { CategoryIcon } from './Icon'

export default function TabBar({ activeTab, onTabChange }) {
  const tabs = ['All', ...CATEGORIES.map((cat) => cat.name)]

  return (
    <div className="flex overflow-x-auto gap-2 px-4 pt-2.5 pb-3.5 bg-hb-surface border-b border-hb-border sticky top-14 md:top-16 scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeTab === tab
        const category = CATEGORIES.find((cat) => cat.name === tab)
        const colors = !isActive
          ? 'bg-hb-surface2 text-hb-text2 hover:bg-hb-border'
          : category ? 'text-hb-on-cat' : 'bg-hb-primary text-hb-on-primary'

        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            aria-pressed={isActive}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${colors}`}
            style={isActive && category ? { backgroundColor: category.color } : undefined}
          >
            {/* On the active tab the icon takes the text color, so it stays visible on the category color */}
            {category && (isActive ? <CategoryIcon category={{ ...category, color: 'currentColor' }} size={16} /> : <CategoryIcon category={category} size={16} />)}
            {tab}
          </button>
        )
      })}
    </div>
  )
}
