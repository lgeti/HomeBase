import { formatCurrency } from '../../../core/utils/calculations'

// The lines read from a receipt: tick what goes to the fridge, fix names, and choose which
// shopping list items were bought. Nothing here is saved until the expense is added.
export default function ReceiptReview({ items, onItemsChange, matches, tickedIds, onTickedChange }) {
  const change = (key, changes) => onItemsChange(items.map((item) => (item.key === key ? { ...item, ...changes } : item)))
  const toFridge = items.filter((item) => item.toFridge).length

  return (
    <section className="space-y-2 rounded-[14px] border border-hb-border bg-hb-surface2/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-hb-text2">From the receipt</h3>
        <p className="text-xs text-hb-text3">{toFridge} of {items.length} to the fridge</p>
      </div>

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5 rounded-xl bg-hb-field px-2.5 py-1.5">
            <input
              type="checkbox"
              checked={item.toFridge}
              onChange={(event) => change(item.key, { toFridge: event.target.checked })}
              aria-label={`Add ${item.name || item.receiptText} to the fridge`}
              className="h-4 w-4 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor={`receiptItem-${item.key}`}>Name</label>
              <input
                id={`receiptItem-${item.key}`}
                type="text"
                value={item.name}
                onChange={(event) => change(item.key, { name: event.target.value })}
                maxLength={120}
                className={`w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-hb-input focus:outline-none ${
                  item.toFridge ? 'font-semibold text-hb-text' : 'text-hb-text2'
                }`}
              />
              <p className="truncate px-1 text-[11px] text-hb-text3">
                {[item.receiptText, item.quantity && `× ${item.quantity}`, !item.isFood && 'not food'].filter(Boolean).join(' · ')}
              </p>
            </div>
            {item.price !== null && <span className="shrink-0 text-xs text-hb-text2">{formatCurrency(item.price)}</span>}
          </li>
        ))}
      </ul>

      {matches.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[13px] font-semibold text-hb-text2">Tick off on shopping lists</p>
          {matches.map((match) => (
            <label key={match.id} className="flex items-center gap-2.5 px-1 text-sm text-hb-text">
              <input
                type="checkbox"
                checked={tickedIds.includes(match.id)}
                onChange={(event) =>
                  onTickedChange(event.target.checked ? [...tickedIds, match.id] : tickedIds.filter((id) => id !== match.id))}
                className="h-4 w-4"
              />
              {match.name}
            </label>
          ))}
        </div>
      )}
    </section>
  )
}
