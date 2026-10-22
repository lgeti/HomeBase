import { useState } from 'react'

// A freshly created invite link, with buttons to copy or share it
export default function InviteLinkBox({ link, name }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setError('')
    } catch {
      setError('Could not copy automatically. Select the link and copy it instead.')
    }
  }

  const shareLink = () => {
    navigator.share({ title: 'Join my HomeBase household', url: link }).catch(() => {})
  }

  return (
    <div className="rounded-lg bg-hb-primary-tint p-3 space-y-2">
      <p className="text-sm text-hb-text2">
        Send this link to {name || 'them'}. Anyone who opens it can join as them, so only send it to them.
      </p>
      <input
        readOnly
        value={link}
        onFocus={(event) => event.target.select()}
        aria-label="Invite link"
        className="w-full px-3 py-2 text-xs border border-hb-border rounded-lg bg-hb-surface text-hb-text2"
      />
      {error && <p className="text-xs text-hb-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="flex-1 rounded-lg border border-hb-primary py-2 text-sm font-semibold text-hb-primary"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        {typeof navigator.share === 'function' && (
          <button
            type="button"
            onClick={shareLink}
            className="flex-1 rounded-lg bg-hb-primary py-2 text-sm font-semibold text-hb-on-primary"
          >
            Share
          </button>
        )}
      </div>
    </div>
  )
}
