// Which sections to reload for a live-update message: none for this copy's own changes or a malformed message
export const sectionsToReload = (payload, clientId) => {
  if (!payload || payload.clientId === clientId || !Array.isArray(payload.sections)) return []
  return [...new Set(payload.sections.filter((section) => typeof section === 'string'))]
}

// After this long in the background, coming back reloads everything in case a message was missed
export const STALE_AFTER_MS = 30 * 1000
