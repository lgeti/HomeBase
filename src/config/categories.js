// The single source for categories shown in the app (names, emoji, colors, descriptions).
// The database's categories table only lists the valid ids that expenses can reference, so every id here
// must also be seeded in server/db/001_initial_schema.sql. categories.test.js checks that they match.
// color and tint are CSS variables, so they follow the light/dark theme (src/index.css)
export const CATEGORIES = [
  {
    id: 'car',
    name: 'Car',
    emoji: '🚗',
    color: 'var(--cat-car)',
    tint: 'var(--cat-car-tint)',
    icon: 'car',
    description: 'Fuel, insurance, maintenance, parking, toll, tax',
    subcategories: ['Fuel', 'Insurance', 'Maintenance', 'Parking', 'Toll', 'Tax', 'Other'],
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    emoji: '📦',
    color: 'var(--cat-subscriptions)',
    tint: 'var(--cat-subscriptions-tint)',
    icon: 'box',
    description: 'Netflix, Spotify, gym, apps, recurring services',
    subcategories: ['Streaming', 'Music', 'Gym', 'Software', 'Other'],
  },
  {
    id: 'groceries',
    name: 'Groceries',
    emoji: '🛒',
    color: 'var(--cat-groceries)',
    tint: 'var(--cat-groceries-tint)',
    icon: 'cart',
    description: 'Supermarket runs, market, delivery',
    subcategories: ['Supermarket', 'Market', 'Delivery', 'Other'],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    emoji: '🎉',
    color: 'var(--cat-entertainment)',
    tint: 'var(--cat-entertainment-tint)',
    icon: 'star',
    description: 'Cinema, concerts, games, hobbies',
    subcategories: ['Cinema', 'Concert', 'Games', 'Hobbies', 'Other'],
  },
  {
    id: 'going-out',
    name: 'Going Out',
    emoji: '🍽️',
    color: 'var(--cat-going-out)',
    tint: 'var(--cat-going-out-tint)',
    icon: 'utensils',
    description: 'Restaurants, bars, cafés, takeaway',
    subcategories: ['Restaurant', 'Bar', 'Café', 'Takeaway', 'Other'],
  },
  {
    id: 'utilities',
    name: 'Rent & Utilities',
    emoji: '🏠',
    color: 'var(--cat-utilities)',
    tint: 'var(--cat-utilities-tint)',
    icon: 'home',
    description: 'Rent, electricity, gas, water, internet, phone',
    subcategories: ['Rent', 'Electricity', 'Gas', 'Water', 'Internet', 'Phone', 'Other'],
  },
  {
    id: 'home',
    name: 'Home',
    emoji: '🔧',
    color: 'var(--cat-home)',
    tint: 'var(--cat-home-tint)',
    icon: 'wrench',
    description: 'Furniture, repairs, cleaning supplies, appliances',
    subcategories: ['Furniture', 'Repairs', 'Cleaning', 'Appliances', 'Other'],
  },
  {
    id: 'other',
    name: 'Other',
    emoji: '✦',
    color: 'var(--cat-other)',
    tint: 'var(--cat-other-tint)',
    icon: 'sparkles',
    description: 'Anything that does not fit',
    subcategories: ['Misc'],
  },
]

export const getCategoryById = (id) => CATEGORIES.find((cat) => cat.id === id)
export const getCategoryByName = (name) => CATEGORIES.find((cat) => cat.name === name)
