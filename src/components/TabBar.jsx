import { CATEGORIES } from '../config/categories'

export default function TabBar({ activeTab, onTabChange }) {
  const tabs = ['All', ...CATEGORIES.map((cat) => cat.name)]

  return (
    <div className="flex overflow-x-auto gap-2 px-4 py-3 bg-white border-b border-gray-100 sticky top-14 md:top-16 scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeTab === tab
        const category = CATEGORIES.find((cat) => cat.name === tab)
        const bgColor = isActive && category ? `bg-[${category.color}]` : 'bg-gray-100'
        const textColor = isActive ? 'text-white' : 'text-gray-600'

        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition ${
              isActive
                ? `text-white ${category ? 'bg-opacity-90' : 'bg-spring-sage-deep'}`
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
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
