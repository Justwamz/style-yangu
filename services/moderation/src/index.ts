import express from 'express'
import helmet from 'helmet'

const app = express()
const PORT = process.env.PORT ?? 3006

app.use(helmet())
app.use(express.json({ limit: '20mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'moderation', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[moderation] listening on port ${PORT}`)
})
