// The single source for categories shown in the app (names, colors, descriptions). Icons: src/components/Icon.jsx.
// The database's categories table only lists the valid ids that expenses can reference, so every id here
// must also be seeded in server/db/001_initial_schema.sql. categories.test.js checks that they match.
// color and tint are CSS variables, so they follow the light/dark theme (src/index.css)
export const CATEGORIES = [
  {
    id: 'car',
    name: 'Car',
    color: 'var(--cat-car)',
    tint: 'var(--cat-car-tint)',
    description: 'Fuel, insurance, maintenance, parking, toll, tax',
    subcategories: ['Fuel', 'Insurance', 'Maintenance', 'Parking', 'Toll', 'Tax', 'Other'],
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    color: 'var(--cat-subscriptions)',
    tint: 'var(--cat-subscriptions-tint)',
    description: 'Netflix, Spotify, gym, apps, recurring services',
    subcategories: ['Streaming', 'Music', 'Gym', 'Software', 'Other'],
  },
  {
    id: 'groceries',
    name: 'Groceries',
    color: 'var(--cat-groceries)',
    tint: 'var(--cat-groceries-tint)',
    description: 'Supermarket runs, market, delivery',
    subcategories: ['Supermarket', 'Market', 'Delivery', 'Other'],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: 'var(--cat-entertainment)',
    tint: 'var(--cat-entertainment-tint)',
    description: 'Cinema, concerts, games, hobbies',
    subcategories: ['Cinema', 'Concert', 'Games', 'Hobbies', 'Other'],
  },
  {
    id: 'going-out',
    name: 'Going Out',
    color: 'var(--cat-going-out)',
    tint: 'var(--cat-going-out-tint)',
    description: 'Restaurants, bars, cafés, takeaway',
    subcategories: ['Restaurant', 'Bar', 'Café', 'Takeaway', 'Other'],
  },
  {
    id: 'utilities',
    name: 'Rent & Utilities',
    color: 'var(--cat-utilities)',
    tint: 'var(--cat-utilities-tint)',
    description: 'Rent, electricity, gas, water, internet, phone',
    subcategories: ['Rent', 'Electricity', 'Gas', 'Water', 'Internet', 'Phone', 'Other'],
  },
  {
    id: 'home',
    name: 'Home',
    color: 'var(--cat-home)',
    tint: 'var(--cat-home-tint)',
    description: 'Furniture, repairs, cleaning supplies, appliances',
    subcategories: ['Furniture', 'Repairs', 'Cleaning', 'Appliances', 'Other'],
  },
  {
    id: 'other',
    name: 'Other',
    color: 'var(--cat-other)',
    tint: 'var(--cat-other-tint)',
    description: 'Anything that does not fit',
    subcategories: ['Misc'],
  },
]

export const getCategoryById = (id) => CATEGORIES.find((cat) => cat.id === id)
export const getCategoryByName = (name) => CATEGORIES.find((cat) => cat.name === name)
