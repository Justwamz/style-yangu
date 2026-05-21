import express from 'express'
import helmet from 'helmet'

const app = express()
const PORT = process.env.PORT ?? 3003

app.use(helmet())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'payments', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[payments] listening on port ${PORT}`)
})
