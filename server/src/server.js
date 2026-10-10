import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { sendError } from './http.js'
import expensesRouter from './routes/expenses.js'
import householdsRouter from './routes/households.js'
import invitationsRouter from './routes/invitations.js'

const port = Number(process.env.PORT || 3000)

const app = express()

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (request, response) => {
  response.json({ status: 'ok' })
})

app.use(householdsRouter)
app.use(invitationsRouter)
app.use(expensesRouter)

app.use((request, response) => {
  sendError(response, 404, 'Route not found')
})

app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`)
})