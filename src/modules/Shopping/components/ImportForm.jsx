import { useEffect, useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import { formatCurrency } from '../../../core/utils/calculations'
import { friendlySaveError } from '../../../core/utils/expenseForm'

// Import from a link: paste it, see what it holds, keep the items you want.
// With `initialUrl` (a link pasted into quick add) it starts reading straight away.
export default function ImportForm({ listName, initialUrl = '', onPreview, onImport, onCancel }) {
  const [url, setUrl] = useState(initialUrl)
  const [preview, setPreview] = useState(null)
  const [isReading, setIsReading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const startedRef = useRef(false)

  const read = async (link) => {
    if (!link.trim()) {
      setError('Paste a link first')
      return
    }
    setError('')
    setPreview(null)
    setIsReading(true)
    try {
      const result = await onPreview(link.trim())
      setPreview(result.items.map((item, index) => ({ ...item, key: index, keep: true })))
    } catch (failure) {
      setError(friendlySaveError(failure))
    } finally {
      setIsReading(false)
    }
  }

  useEffect(() => {
    if (initialUrl && !startedRef.current) {
      startedRef.current = true
      read(initialUrl)
    }
    // Only for the link the sheet was opened with
  }, [initialUrl])

  const change = (key, changes) => setPreview((items) => items.map((item) => (item.key === key ? { ...item, ...changes } : item)))
  const chosen = preview?.filter((item) => item.keep) ?? []

  const save = async (event) => {
    event.preventDefault()
    if (!preview) return read(url)
    if (chosen.some((item) => !item.name.trim())) {
      setError('Every item needs a name')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      await onImport(chosen.map(({ name, quantity, price, link, imageUrl, sourceKey }) => ({
        name: name.trim(), quantity, price, link, imageUrl, sourceKey,
      })))
    } catch (failure) {
      setError(friendlySaveError(failure))
      setIsSaving(false)
    }
  }

  const field = 'w-full rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary transition'

  return (
    <form onSubmit={save} className="flex flex-col gap-3.5">
      <div>
        <h2 className="text-xl font-semibold text-hb-text">Import from link</h2>
        <p className="text-xs text-hb-text2">Into {listName}</p>
      </div>

      <div>
        <label htmlFor="importUrl" className="block text-[13px] font-semibold text-hb-text2 mb-1.5">Link</label>
        <div className="flex gap-2">
          <input
            id="importUrl"
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              setPreview(null)
              setError('')
            }}
            placeholder="Shared IKEA list or a product link"
            autoFocus={!initialUrl}
            className={field}
          />
          <button
            type="button"
            onClick={() => read(url)}
            disabled={isReading || !url.trim()}
            className="shrink-0 rounded-xl bg-hb-surface2 px-3 text-sm font-semibold text-hb-text disabled:opacity-50"
          >
            {isReading ? 'Reading…' : 'Read'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-hb-text3">
          In the IKEA app, share your favourites and paste the link. Temu, AliExpress and other shops work with single product links.
        </p>
      </div>

      {isReading && <p className="py-4 text-center text-sm text-hb-text2">Reading the link… a shared list can take a few seconds.</p>}

      {preview && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-hb-text2">
              {preview.length} item{preview.length === 1 ? '' : 's'} found
            </h3>
            {preview.length > 1 && (
              <button
                type="button"
                onClick={() => setPreview((items) => items.map((item) => ({ ...item, keep: chosen.length !== items.length })))}
                className="text-sm font-semibold text-hb-primary"
              >
                {chosen.length === preview.length ? 'Select none' : 'Select all'}
              </button>
            )}
          </div>

          {preview.map((item) => (
            <div key={item.key} className={`flex items-start gap-3 rounded-2xl border border-hb-border px-3 py-2.5 ${item.keep ? 'bg-hb-surface' : 'bg-hb-surface2 opacity-60'}`}>
              <input
                type="checkbox"
                checked={item.keep}
                onChange={(event) => change(item.key, { keep: event.target.checked })}
                aria-label={`Import ${item.name || 'this item'}`}
                className="mt-3 h-5 w-5 shrink-0"
              />
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-hb-surface2 text-hb-text3">
                  <Icon name="cart" size={18} />
                </span>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <label className="sr-only" htmlFor={`importName-${item.key}`}>Name</label>
                <input
                  id={`importName-${item.key}`}
                  type="text"
                  value={item.name}
                  onChange={(event) => change(item.key, { name: event.target.value })}
                  maxLength={120}
                  placeholder="Name this item"
                  className="w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm font-semibold text-hb-text focus:border-hb-input focus:bg-hb-field focus:outline-none"
                />
                <p className="px-1 text-xs text-hb-text2">
                  {[`× ${item.quantity}`, item.price !== null && item.price !== undefined ? formatCurrency(item.price) : null].filter(Boolean).join(' · ')}
                </p>
                {!item.found && (
                  <p className="px-1 text-xs text-hb-warning">Couldn't read this page. Check the name; the link is kept.</p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="sticky bottom-0 flex flex-col gap-2 bg-hb-sheet pt-1">
        {error && (
          <p role="alert" className="rounded-xl border border-hb-danger/30 bg-hb-danger-bg px-3 py-2 text-sm text-hb-danger">{error}</p>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[14px] border border-hb-input bg-hb-sheet py-3.5 text-[15px] font-semibold text-hb-text hover:bg-hb-surface2 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isReading || isSaving || (preview && chosen.length === 0)}
            className="rounded-[14px] bg-hb-primary py-3.5 text-[15px] font-semibold text-hb-on-primary hover:opacity-90 disabled:opacity-60 transition"
          >
            {isSaving ? 'Adding…' : preview ? `Add ${chosen.length} item${chosen.length === 1 ? '' : 's'}` : 'Read link'}
          </button>
        </div>
      </div>
    </form>
  )
}
