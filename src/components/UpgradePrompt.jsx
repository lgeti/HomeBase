import { useEffect, useState } from 'react'
import { UPGRADE_EVENT } from '../core/api/client'
// The same limits the server enforces
import { PLANS } from '../../server/src/plans.js'

const TITLES = {
  quota_exceeded: 'Monthly AI limit reached',
  member_limit: 'Household is full',
  plan_required: 'Part of HomeBase Pro',
}

// Shown whenever the API answers 402: what the plan does not cover and that Pro does. No billing yet.
export default function UpgradePrompt() {
  const [details, setDetails] = useState(null)

  useEffect(() => {
    const show = (event) => setDetails(event.detail || {})
    window.addEventListener(UPGRADE_EVENT, show)
    return () => window.removeEventListener(UPGRADE_EVENT, show)
  }, [])

  if (!details) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/45 z-[60]" onClick={() => setDetails(null)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgradeTitle"
        className="fixed inset-x-4 top-1/2 z-[70] mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-hb-sheet p-5 shadow-2xl space-y-3"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-hb-primary font-semibold">Upgrade</p>
        <h2 id="upgradeTitle" className="text-lg font-semibold text-hb-text">{TITLES[details.code] || 'Upgrade to Pro'}</h2>
        <p className="text-sm text-hb-text2">{details.error || 'Your plan does not include this.'}</p>
        <p className="text-sm text-hb-text2">
          Pro has unlimited members, {PLANS.pro.aiCallsPerMonth} AI calls a month and HomeBase in Claude. Upgrading from the app is coming soon.
        </p>
        <button
          type="button"
          onClick={() => setDetails(null)}
          autoFocus
          className="w-full rounded-lg bg-hb-primary py-2.5 text-sm font-semibold text-hb-on-primary"
        >
          OK
        </button>
      </div>
    </>
  )
}
