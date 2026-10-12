import { useState } from 'react'
import Icon from '../../../components/Icon'
import NameForm from '../../../components/NameForm'
import { formatCurrency, getMemberName } from '../../../core/utils/calculations'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { countOpenItems, groupListItems, isDone, linkHost, looksLikeLink } from '../shopping'

function ItemRow({ item, members, onToggle, onEdit }) {
  const done = isDone(item)
  const selling = item.kind === 'sell'
  const meta = [
    item.quantity,
    item.price !== undefined ? formatCurrency(item.price) : null,
    item.addedByMemberId ? `Added by ${getMemberName(members, item.addedByMemberId)}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-hb-border px-3.5 py-3 ${done ? 'bg-hb-surface2' : 'bg-hb-surface'}`}>
      {selling ? (
        <button
          type="button"
          onClick={() => onToggle(item)}
          aria-pressed={done}
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            done ? 'bg-hb-success-bg text-hb-success' : 'border border-hb-input text-hb-text2'
          }`}
        >
          {done ? 'Sold' : 'Mark sold'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onToggle(item)}
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Not bought: ${item.name}` : `Bought: ${item.name}`}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
            done ? 'border-hb-primary bg-hb-primary text-hb-on-primary' : 'border-hb-input text-transparent'
          }`}
        >
          <Icon name="check" size={16} strokeWidth={2.6} />
        </button>
      )}

      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`h-11 w-11 shrink-0 rounded-lg bg-white object-contain ${done ? 'opacity-50' : ''}`}
        />
      )}

      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex-1 min-w-0 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-hb-primary"
        aria-label={`Edit ${item.name}`}
      >
        <p className={`text-[15px] font-semibold truncate ${done ? 'text-hb-text3 line-through' : 'text-hb-text'}`}>
          {item.name}
        </p>
        {selling && !done && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-hb-primary">
            <Icon name="tag" size={12} strokeWidth={2.2} />
            Selling · Listed
          </p>
        )}
        {meta && <p className="text-xs text-hb-text2 truncate">{meta}</p>}
        {item.note && <p className="text-xs text-hb-text3 truncate">{item.note}</p>}
      </button>

      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          title={linkHost(item.link)}
          aria-label={`Open link for ${item.name} (${linkHost(item.link)})`}
          className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-hb-text2 hover:bg-hb-surface2 hover:text-hb-primary transition"
        >
          <Icon name="link" size={16} />
        </a>
      )}
    </div>
  )
}

export default function ShoppingView({
  lists,
  items,
  members,
  activeListId,
  isLoading,
  error,
  onSelectList,
  onAddList,
  onRenameList,
  onDeleteList,
  onQuickAdd,
  onToggleItem,
  onEditItem,
  onClearDone,
  onImportLink,
}) {
  // One inline panel at a time: 'new', 'rename', 'menu', 'delete' or 'clear'
  const [panel, setPanel] = useState(null)
  const [quickName, setQuickName] = useState('')
  const [quickError, setQuickError] = useState('')
  const [actionError, setActionError] = useState('')

  const activeList = lists.find((list) => list.id === activeListId)
  const { open, done } = groupListItems(items, activeListId)

  const selectList = (listId) => {
    setPanel(null)
    setActionError('')
    onSelectList(listId)
  }

  const runAction = async (action) => {
    setActionError('')
    try {
      await action()
      setPanel(null)
    } catch (failure) {
      setActionError(friendlySaveError(failure))
    }
  }

  const quickAdd = async (event) => {
    event.preventDefault()
    const name = quickName.trim()
    if (!name || !activeListId) return
    setQuickError('')
    setQuickName('')
    // A pasted link imports instead of becoming an item called "https://..."
    if (looksLikeLink(name)) {
      onImportLink(name)
      return
    }
    try {
      await onQuickAdd({ listId: activeListId, name })
    } catch (failure) {
      setQuickName(name)
      setQuickError(friendlySaveError(failure))
    }
  }

  const chip = (isActive) => `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-hb-primary text-hb-on-primary' : 'bg-hb-surface2 text-hb-text2 hover:bg-hb-border'
  }`

  return (
    <div className="flex flex-col h-full">
      <div className="flex overflow-x-auto gap-2 px-4 pt-2.5 pb-3.5 bg-hb-surface border-b border-hb-border scrollbar-hide" role="tablist" aria-label="Shopping lists">
        {lists.map((list) => {
          const isActive = list.id === activeListId
          const count = countOpenItems(items, list.id)
          return (
            <button
              key={list.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectList(list.id)}
              className={chip(isActive)}
            >
              {list.name}
              {count > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] ${isActive ? 'bg-hb-on-primary/20' : 'bg-hb-surface'}`}>{count}</span>
              )}
            </button>
          )
        })}
        <button type="button" onClick={() => setPanel(panel === 'new' ? null : 'new')} className={`${chip(false)} border border-dashed border-hb-input`}>
          <Icon name="plus" size={14} />
          New list
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-lg mx-auto p-4 space-y-3">
          {error && <p className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{error}</p>}

          {panel === 'new' && (
            <NameForm
              submitLabel="Create"
              onCancel={() => setPanel(null)}
              onSubmit={async (name) => {
                const list = await onAddList(name)
                setPanel(null)
                onSelectList(list.id)
              }}
            />
          )}

          {isLoading && lists.length === 0 && <p className="py-8 text-center text-sm text-hb-text2">Loading lists…</p>}

          {activeList && (
            <>
              {panel === 'rename' ? (
                <NameForm
                  initialName={activeList.name}
                  submitLabel="Save"
                  onCancel={() => setPanel(null)}
                  onSubmit={async (name) => {
                    await onRenameList(activeList.id, name)
                    setPanel(null)
                  }}
                />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-semibold text-hb-text">{activeList.name}</h2>
                    <p className="text-xs text-hb-text2">
                      {open.length > 0 ? `${open.length} to go` : done.length > 0 ? 'All done' : 'Empty'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanel(panel === 'menu' ? null : 'menu')}
                    aria-expanded={panel === 'menu'}
                    aria-label="List options"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hb-border bg-hb-surface text-hb-text2"
                  >
                    <Icon name="more" size={20} strokeWidth={3} />
                  </button>
                </div>
              )}

              {panel === 'menu' && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPanel('rename')} className="flex-1 rounded-xl border border-hb-border bg-hb-surface py-2.5 text-sm font-semibold text-hb-text">
                    Rename list
                  </button>
                  <button type="button" onClick={() => setPanel('delete')} className="flex-1 rounded-xl border border-hb-danger/30 bg-hb-danger-bg py-2.5 text-sm font-semibold text-hb-danger">
                    Delete list
                  </button>
                </div>
              )}

              {panel === 'delete' && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-hb-danger/30 bg-hb-danger-bg px-3.5 py-3">
                  <p className="min-w-0 text-sm text-hb-text">
                    Delete <span className="font-medium">{activeList.name}</span>
                    {open.length + done.length > 0 && ` and its ${open.length + done.length} item${open.length + done.length === 1 ? '' : 's'}`}?
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => setPanel(null)} className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction(() => onDeleteList(activeList.id))}
                      className="rounded-lg bg-hb-danger-solid px-3 py-1.5 text-sm font-semibold text-hb-on-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {actionError && <p role="alert" className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{actionError}</p>}

              <form onSubmit={quickAdd} className="flex gap-2">
                <label htmlFor="quickAdd" className="sr-only">Add an item to {activeList.name}</label>
                <input
                  id="quickAdd"
                  type="text"
                  value={quickName}
                  onChange={(event) => {
                    setQuickName(event.target.value)
                    setQuickError('')
                  }}
                  maxLength={120}
                  placeholder={`Add to ${activeList.name}…`}
                  className="min-w-0 flex-1 rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary"
                />
                <button
                  type="submit"
                  disabled={!quickName.trim()}
                  aria-label="Add item"
                  className="flex w-11 shrink-0 items-center justify-center rounded-xl bg-hb-primary text-hb-on-primary disabled:opacity-40"
                >
                  <Icon name="plus" size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => onImportLink('')}
                  aria-label="Import from link"
                  title="Import from link"
                  className="flex w-11 shrink-0 items-center justify-center rounded-xl border border-hb-input bg-hb-surface text-hb-text2 hover:text-hb-primary"
                >
                  <Icon name="link" size={18} />
                </button>
              </form>
              {quickError && <p role="alert" className="text-xs text-hb-danger">{quickError}</p>}

              {open.length === 0 && done.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-hb-text2">Nothing on this list yet</p>
                  <p className="mt-1 text-xs text-hb-text3">Type above, paste a shop link, or tap + for price and selling</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {open.map((item) => (
                    <ItemRow key={item.id} item={item} members={members} onToggle={onToggleItem} onEdit={onEditItem} />
                  ))}
                </div>
              )}

              {done.length > 0 && (
                <section className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-hb-text2">Done · {done.length}</h3>
                    {panel !== 'clear' && (
                      <button type="button" onClick={() => setPanel('clear')} className="text-sm font-semibold text-hb-primary">
                        Clear
                      </button>
                    )}
                  </div>
                  {panel === 'clear' && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-hb-danger/30 bg-hb-danger-bg px-3.5 py-3">
                      <p className="text-sm text-hb-text">Clear {done.length} done item{done.length === 1 ? '' : 's'}?</p>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => setPanel(null)} className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2">
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(() => onClearDone(activeList.id))}
                          className="rounded-lg bg-hb-danger-solid px-3 py-1.5 text-sm font-semibold text-hb-on-danger"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                  {done.map((item) => (
                    <ItemRow key={item.id} item={item} members={members} onToggle={onToggleItem} onEdit={onEditItem} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
