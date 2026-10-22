// What the landing page's pricing table shows. Prices are placeholders until Stripe is set up;
// the limits come from the API's own plan table, so the page and the API never disagree.
import { PLANS as LIMITS } from '../../server/src/plans.js'

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: 'forever',
    summary: 'Everything a small household needs day to day.',
    features: [
      `Up to ${LIMITS.free.members} people in the household`,
      'Shared expenses and who-owes-who',
      'Shopping lists, fridge, pantry and inventory',
      'Repeating chores, shared out between you',
      `${LIMITS.free.aiCallsPerMonth} AI receipt scans or recipe ideas a month`,
    ],
    cta: 'Start for free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€4',
    period: 'per household / month',
    summary: 'For families, flatshares and homes that let the AI do the typing.',
    features: [
      'Everything in Free',
      'As many people as live with you',
      `${LIMITS.pro.aiCallsPerMonth} AI receipt scans or recipe ideas a month`,
      'Use HomeBase from AI assistants like Claude',
    ],
    cta: 'Start free, upgrade later',
    isHighlighted: true,
  },
]
