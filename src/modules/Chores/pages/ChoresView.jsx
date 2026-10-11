import { useState } from 'react'
import Icon from '../../../components/Icon'
import { getMemberName, todayDateString } from '../../../core/utils/calculations'
import { friendlySaveError } from '../../../core/utils/expenseForm'
import { dueLabel, FREQUENCY_LABELS, groupChores, lastDoneLabel } from '../chores'

function ChoreRow({ chore, members, today, isBusy, onDone, onEdit }) {
  const isOverdue = chore.dueOn < today
  const meta = [FREQUENCY_LABELS[chore.frequency], chore.assigneeMemberId ? getMemberName(members, chore.assigneeMemberId) : 'Anyone']
    .join(' · ')
  const lastDone = lastDoneLabel(chore, members, today)

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-hb-border bg-hb-surface px-3.5 py-3">
      <button
        type="button"
        onClick={() => onDone(chore)}
        disabled={isBusy}
        aria-label={`Done: ${chore.name}`}
        title="Done"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-hb-input text-transparent transition hover:border-hb-primary hover:text-hb-primary disabled:opacity-50"
      >
        <Icon name="check" size={16} strokeWidth={2.6} />
      </button>

      <button
        type="button"
        onClick={() => onEdit(chore)}
        className="flex-1 min-w-0 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-hb-primary"
        aria-label={`Edit ${chore.name}`}
      >
        <p className="text-[15px] font-semibold text-hb-text truncate">{chore.name}</p>
        <p className="text-xs text-hb-text2 truncate">{meta}</p>
        {lastDone && <p className="text-xs text-hb-text3 truncate">{lastDone}</p>}
        {chore.note && <p className="text-xs text-hb-text3 truncate">{chore.note}</p>}
      </button>

      <p className={`shrink-0 text-right text-xs ${isOverdue ? 'font-semibold text-hb-danger' : chore.dueOn === today ? 'font-semibold text-hb-primary' : 'text-hb-text2'}`}>
        {dueLabel(chore, today)}
      </p>
    </div>
  )
}

export default function ChoresView({ chores, members, isLoading, error, onDone, onUndo, onEditChore }) {
  // The latest "Done", kept so it can be undone: { chore, completionId }
  const [lastDone, setLastDone] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const today = todayDateString()
  const groups = groupChores(chores, today)

  const markDone = async (chore) => {
    setActionError('')
    setBusyId(chore.id)
    try {
      setLastDone(await onDone(chore, today))
    } catch (failure) {
      setActionError(friendlySaveError(failure))
    } finally {
      setBusyId(null)
    }
  }

  const undo = async () => {
    setActionError('')
    try {
      await onUndo(lastDone)
      setLastDone(null)
    } catch (failure) {
      setActionError(friendlySaveError(failure))
    }
  }

  const sections = [
    { key: 'overdue', title: 'Overdue', color: 'text-hb-danger', items: groups.overdue },
    { key: 'today', title: 'Today', color: 'text-hb-primary', items: groups.today },
    { key: 'upcoming', title: 'Upcoming', color: 'text-hb-text2', items: groups.upcoming },
  ].filter((section) => section.items.length > 0)

  const summary = [
    groups.overdue.length > 0 && `${groups.overdue.length} overdue`,
    groups.today.length > 0 && `${groups.today.length} today`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="max-w-lg mx-auto p-4 space-y-3">
        <div>
          <h2 className="text-2xl font-semibold text-hb-text">Chores</h2>
          <p className="text-xs text-hb-text2">{chores.length === 0 ? 'Nothing planned' : summary || 'All caught up'}</p>
        </div>

        {error && <p className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{error}</p>}
        {actionError && <p role="alert" className="rounded-xl bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{actionError}</p>}

        {lastDone && (
          <div role="status" className="flex items-center justify-between gap-3 rounded-2xl border border-hb-primary/30 bg-hb-primary-tint px-3.5 py-2.5">
            <p className="min-w-0 truncate text-sm text-hb-text">
              <span className="font-semibold">{lastDone.chore.name}</span> done
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={undo} className="rounded-lg px-2.5 py-1 text-sm font-semibold text-hb-primary">
                Undo
              </button>
              <button
                type="button"
                onClick={() => setLastDone(null)}
                aria-label="Dismiss"
                className="flex h-7 w-7 items-center justify-center rounded-full text-hb-text2"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          </div>
        )}

        {isLoading && chores.length === 0 ? (
          <p className="py-8 text-center text-sm text-hb-text2">Loading…</p>
        ) : chores.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-hb-text2">No chores yet</p>
            <p className="mt-1 text-xs text-hb-text3">Tap + to add one, like the bins or vacuuming</p>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.key} className="space-y-2 pt-1">
              <h3 className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${section.color}`}>{section.title}</h3>
              {section.items.map((chore) => (
                <ChoreRow
                  key={chore.id}
                  chore={chore}
                  members={members}
                  today={today}
                  isBusy={busyId === chore.id}
                  onDone={markDone}
                  onEdit={onEditChore}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  )
}
