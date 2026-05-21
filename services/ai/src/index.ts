import express from 'express'
import helmet from 'helmet'

const app = express()
const PORT = process.env.PORT ?? 3002

app.use(helmet())
app.use(express.json({ limit: '20mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[ai] listening on port ${PORT}`)
})
