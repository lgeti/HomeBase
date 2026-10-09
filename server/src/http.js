export const sendError = (response, status, message) => {
  response.status(status).json({ error: message })
}
