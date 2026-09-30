const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.error || `API request failed with status ${response.status}`)
  }

  return data
}

export { API_BASE_URL }
