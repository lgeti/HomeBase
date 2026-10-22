// What the landing page's pricing table shows. Prices are placeholders until Stripe is set up;
// the limits the API enforces live on the server, so keep this wording in line with them.
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: 'forever',
    summary: 'Everything a household needs day to day.',
    features: [
      'One household with the people you live with',
      'Shared expenses and who-owes-who',
      'Shopping lists, fridge, pantry and inventory',
      'Repeating chores, shared out between you',
      'A few receipt scans and recipe ideas each month',
    ],
    cta: 'Start for free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€4',
    period: 'per household / month',
    summary: 'For busy homes that want the AI to do the typing.',
    features: [
      'Everything in Free',
      'Unlimited receipt scans that fill the fridge',
      'Unlimited AI recipe suggestions',
      'Connect AI assistants like Claude to your household',
      'Larger households and priority support',
    ],
    cta: 'Start free, upgrade later',
    isHighlighted: true,
  },
]
