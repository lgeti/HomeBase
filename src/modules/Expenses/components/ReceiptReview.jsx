import { formatCurrency } from '../../../core/utils/calculations'
import { FRIDGE, inventoryGroupOf, SKIP, suggestedGroup, toInventory } from '../receipt'

// The lines read from a receipt: choose where each goes (fridge, an inventory group, or nowhere), fix names,
// and choose which shopping list items were bought. Nothing here is saved until the expense is added.
export default function ReceiptReview({
  items,
  onItemsChange,
  inventoryGroups,
  matches,
  tickedIds,
  onTickedChange,
  restockMatches = [],
  restockIds = [],
  onRestockChange,
}) {
  const change = (key, changes) => onItemsChange(items.map((item) => (item.key === key ? { ...item, ...changes } : item)))
  const toFridge = items.filter((item) => item.destination === FRIDGE).length
  const toInventoryCount = items.filter((item) => inventoryGroupOf(item.destination)).length

  // The suggested inventory group comes first, so it is one tap away
  const inventoryOptions = (item) => {
    const suggested = suggestedGroup(item, inventoryGroups)
    return suggested ? [suggested, ...inventoryGroups.filter((group) => group.id !== suggested.id)] : inventoryGroups
  }

  return (
    <section className="space-y-2 rounded-[14px] border border-hb-border bg-hb-surface2/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-hb-text2">From the receipt</h3>
        <p className="text-xs text-hb-text3">
          {toFridge} to the fridge{toInventoryCount > 0 && ` · ${toInventoryCount} to inventory`}
        </p>
      </div>

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5 rounded-xl bg-hb-field px-2.5 py-1.5">
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor={`receiptItem-${item.key}`}>Name</label>
              <input
                id={`receiptItem-${item.key}`}
                type="text"
                value={item.name}
                onChange={(event) => change(item.key, { name: event.target.value })}
                maxLength={120}
                className={`w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-hb-input focus:outline-none ${
                  item.destination === SKIP ? 'text-hb-text2' : 'font-semibold text-hb-text'
                }`}
              />
              <p className="truncate px-1 text-[11px] text-hb-text3">
                {[
                  item.receiptText,
                  item.quantity && `× ${item.quantity}`,
                  item.price !== null && formatCurrency(item.price),
                  item.destination === SKIP && suggestedGroup(item, inventoryGroups) && `${suggestedGroup(item, inventoryGroups).name}?`,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <label className="sr-only" htmlFor={`receiptDestination-${item.key}`}>Where {item.name} goes</label>
            <select
              id={`receiptDestination-${item.key}`}
              value={item.destination}
              onChange={(event) => change(item.key, { destination: event.target.value })}
              className={`max-w-[44%] shrink-0 rounded-lg border px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-hb-primary ${
                item.destination === SKIP ? 'border-hb-input bg-hb-field text-hb-text3' : 'border-hb-primary/40 bg-hb-primary-tint font-semibold text-hb-primary'
              }`}
            >
              <option value={FRIDGE}>Fridge</option>
              {inventoryOptions(item).map((group) => (
                <option key={group.id} value={toInventory(group.id)}>{group.name}</option>
              ))}
              <option value={SKIP}>Don't add</option>
            </select>
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

      {restockMatches.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[13px] font-semibold text-hb-text2">Mark restocked in the inventory</p>
          {restockMatches.map((match) => (
            <label key={match.id} className="flex items-center gap-2.5 px-1 text-sm text-hb-text">
              <input
                type="checkbox"
                checked={restockIds.includes(match.id)}
                onChange={(event) =>
                  onRestockChange(event.target.checked ? [...restockIds, match.id] : restockIds.filter((id) => id !== match.id))}
                className="h-4 w-4"
              />
              {match.name}
              <span className="text-xs font-semibold text-hb-warning">Running low</span>
            </label>
          ))}
        </div>
      )}
    </section>
  )
}
