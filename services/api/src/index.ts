import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json({ limit: '10mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[api] listening on port ${PORT}`)
})
