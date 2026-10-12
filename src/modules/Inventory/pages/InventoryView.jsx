import { useState } from 'react'
import Icon from '../../../components/Icon'
import NameForm from '../../../components/NameForm'
import { formatCurrency, formatShortDate, parseLocalDate, todayDateString } from '../../../core/utils/calculations'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { countRunningLow, groupItems, warrantyStatus } from '../inventory'

const WARRANTY_COLORS = { ended: 'text-hb-text3', soon: 'font-semibold text-hb-warning', ok: 'text-hb-text2' }

// Picks a shopping list for an item that is running low
function RunningLowPanel({ item, lists, onConfirm, onCancel }) {
  const [listId, setListId] = useState(lists[0]?.id || '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const confirm = async (chosenListId) => {
    setError('')
    setIsSaving(true)
    try {
      await onConfirm(item, chosenListId)
    } catch (failure) {
      setError(friendlySaveError(failure))
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-2.5 rounded-2xl border border-hb-primary/30 bg-hb-primary-tint px-3.5 py-3">
      <p className="text-sm text-hb-text">
        <span className="font-semibold">{item.name}</span> is running low. Add it to a shopping list?
      </p>
      {lists.length > 0 && (
        <div>
          <label htmlFor={`lowList-${item.id}`} className="sr-only">Shopping list</label>
          <select
            id={`lowList-${item.id}`}
            value={listId}
            onChange={(event) => setListId(event.target.value)}
            className="w-full rounded-xl border border-hb-input bg-hb-field px-3 py-2.5 text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary"
          >
            {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-hb-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2">
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => confirm(null)}
          className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text disabled:opacity-60"
        >
          Just mark it
        </button>
        {lists.length > 0 && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => confirm(listId)}
            className="rounded-lg bg-hb-primary px-3 py-1.5 text-sm font-semibold text-hb-on-primary disabled:opacity-60"
          >
            Add to list
          </button>
        )}
      </div>
    </div>
  )
}

function InventoryRow({ item, today, onEdit, onRunningLow, onRestocked }) {
  const warranty = warrantyStatus(item, today)
  const meta = [
    item.quantity,
    item.price !== undefined ? formatCurrency(item.price) : null,
    item.purchasedOn ? `Bought ${formatShortDate(item.purchasedOn, parseLocalDate(today))}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${item.isRunningLow ? 'border-hb-warning/40 bg-hb-warning-bg' : 'border-hb-border bg-hb-surface'}`}>
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex-1 min-w-0 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-hb-primary"
        aria-label={`Edit ${item.name}`}
      >
        <p className="text-[15px] font-semibold text-hb-text truncate">{item.name}</p>
        {item.isRunningLow && <p className="text-xs font-semibold text-hb-warning">Running low</p>}
        {meta && <p className="text-xs text-hb-text2 truncate">{meta}</p>}
        {warranty && <p className={`text-xs ${WARRANTY_COLORS[warranty.state]}`}>{warranty.text}</p>}
        {item.note && <p className="text-xs text-hb-text3 truncate">{item.note}</p>}
      </button>
      <button
        type="button"
        onClick={() => (item.isRunningLow ? onRestocked(item) : onRunningLow(item))}
        className="shrink-0 rounded-full border border-hb-input px-3 py-1.5 text-xs font-semibold text-hb-text2 hover:border-hb-primary hover:text-hb-primary transition"
      >
        {item.isRunningLow ? 'Restocked' : 'Running low'}
      </button>
    </div>
  )
}

export default function InventoryView({
  groups,
  items,
  lists,
  activeGroupId,
  isLoading,
  error,
  onSelectGroup,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  onQuickAdd,
  onEditItem,
  onRunningLow,
  onRestocked,
}) {
  // One inline panel at a time: 'new', 'rename', 'menu' or 'delete'
  const [panel, setPanel] = useState(null)
  const [lowId, setLowId] = useState(null)
  const [quickName, setQuickName] = useState('')
  const [quickError, setQuickError] = useState('')
  const [actionError, setActionError] = useState('')
  const today = todayDateString()
  const activeGroup = groups.find((group) => group.id === activeGroupId)
  const shown = groupItems(items, activeGroupId)

  const selectGroup = (groupId) => {
    setPanel(null)
    setActionError('')
    onSelectGroup(groupId)
  }

  const run = async (action) => {
    setActionError('')
    try {
      await action()
    } catch (failure) {
      setActionError(friendlySaveError(failure))
    }
  }

  const quickAdd = async (event) => {
    event.preventDefault()
    const name = quickName.trim()
    if (!name || !activeGroupId) return
    setQuickError('')
    setQuickName('')
    try {
      await onQuickAdd({ groupId: activeGroupId, name })
    } catch (failure) {
      setQuickName(name)
      setQuickError(friendlySaveError(failure))
    }
  }

  const chip = (isActive) => `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-hb-primary text-hb-on-primary' : 'bg-hb-surface2 text-hb-text2 hover:bg-hb-border'
  }`
  const groupNameProps = { label: 'Group name', placeholder: 'e.g., Garage, Garden, Kitchen', emptyError: 'Enter a group name' }

  return (
    <div className="space-y-3">
      <div className="-mx-4 flex overflow-x-auto gap-2 px-4 pb-1 scrollbar-hide" role="tablist" aria-label="Inventory groups">
        {groups.map((group) => {
          const low = countRunningLow(items, group.id)
          return (
            <button key={group.id} type="button" role="tab" aria-selected={group.id === activeGroupId} onClick={() => selectGroup(group.id)} className={chip(group.id === activeGroupId)}>
              {group.name}
              {low > 0 && <span className="rounded-full bg-hb-warning-bg px-1.5 text-[11px] text-hb-warning">{low}</span>}
            </button>
          )
        })}
        <button type="button" onClick={() => setPanel(panel === 'new' ? null : 'new')} className={`${chip(false)} border border-dashed border-hb-input`}>
          <Icon name="plus" size={14} />
          New group
        </button>
      </div>

      {error && <p className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{error}</p>}

      {panel === 'new' && (
        <NameForm
          {...groupNameProps}
          submitLabel="Create"
          onCancel={() => setPanel(null)}
          onSubmit={async (name) => {
            const group = await onAddGroup(name)
            setPanel(null)
            onSelectGroup(group.id)
          }}
        />
      )}

      {isLoading && groups.length === 0 && <p className="py-8 text-center text-sm text-hb-text2">Loading…</p>}

      {activeGroup && (
        <>
          {panel === 'rename' ? (
            <NameForm
              {...groupNameProps}
              initialName={activeGroup.name}
              submitLabel="Save"
              onCancel={() => setPanel(null)}
              onSubmit={async (name) => {
                await onRenameGroup(activeGroup.id, name)
                setPanel(null)
              }}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-hb-text">{activeGroup.name}</h3>
                <p className="text-xs text-hb-text2">{shown.length === 0 ? 'Empty' : `${shown.length} item${shown.length === 1 ? '' : 's'}`}</p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(panel === 'menu' ? null : 'menu')}
                aria-expanded={panel === 'menu'}
                aria-label="Group options"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hb-border bg-hb-surface text-hb-text2"
              >
                <Icon name="more" size={20} strokeWidth={3} />
              </button>
            </div>
          )}

          {panel === 'menu' && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setPanel('rename')} className="flex-1 rounded-xl border border-hb-border bg-hb-surface py-2.5 text-sm font-semibold text-hb-text">
                Rename group
              </button>
              <button type="button" onClick={() => setPanel('delete')} className="flex-1 rounded-xl border border-hb-danger/30 bg-hb-danger-bg py-2.5 text-sm font-semibold text-hb-danger">
                Delete group
              </button>
            </div>
          )}

          {panel === 'delete' && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-hb-danger/30 bg-hb-danger-bg px-3.5 py-3">
              <p className="min-w-0 text-sm text-hb-text">
                Delete <span className="font-medium">{activeGroup.name}</span>
                {shown.length > 0 && ` and its ${shown.length} item${shown.length === 1 ? '' : 's'}`}?
              </p>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => setPanel(null)} className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => run(async () => {
                    await onDeleteGroup(activeGroup.id)
                    setPanel(null)
                  })}
                  className="rounded-lg bg-hb-danger-solid px-3 py-1.5 text-sm font-semibold text-hb-on-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {actionError && <p role="alert" className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{actionError}</p>}

          <form onSubmit={quickAdd} className="flex gap-2">
            <label htmlFor="inventoryQuickAdd" className="sr-only">Add to {activeGroup.name}</label>
            <input
              id="inventoryQuickAdd"
              type="text"
              value={quickName}
              onChange={(event) => {
                setQuickName(event.target.value)
                setQuickError('')
              }}
              maxLength={120}
              placeholder={`Add to ${activeGroup.name}…`}
              className="min-w-0 flex-1 rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary"
            />
            <button
              type="submit"
              disabled={!quickName.trim()}
              aria-label={`Add to ${activeGroup.name}`}
              className="flex w-11 shrink-0 items-center justify-center rounded-xl bg-hb-primary text-hb-on-primary disabled:opacity-40"
            >
              <Icon name="plus" size={20} />
            </button>
          </form>
          {quickError && <p role="alert" className="text-xs text-hb-danger">{quickError}</p>}

          {shown.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-hb-text2">Nothing in {activeGroup.name} yet</p>
              <p className="mt-1 text-xs text-hb-text3">Type above, or tap + for price and warranty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shown.map((item) =>
                item.id === lowId ? (
                  <RunningLowPanel
                    key={item.id}
                    item={item}
                    lists={lists}
                    onCancel={() => setLowId(null)}
                    onConfirm={async (chosen, listId) => {
                      await onRunningLow(chosen, listId)
                      setLowId(null)
                    }}
                  />
                ) : (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    today={today}
                    onEdit={onEditItem}
                    onRunningLow={(chosen) => setLowId(chosen.id)}
                    onRestocked={(chosen) => run(() => onRestocked(chosen))}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
