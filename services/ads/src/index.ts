import express from 'express'
import helmet from 'helmet'

const app = express()
const PORT = process.env.PORT ?? 3007

app.use(helmet())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ads', adBoostActive: false, timestamp: new Date().toISOString() })
})

// Coming soon gate — all ad requests return coming_soon until admin activates the boost product
app.get('/ads/sponsored-card/:consumerId', (_req, res) => {
  res.json({ status: 'coming_soon', card: null })
})

app.listen(PORT, () => {
  console.log(`[ads] listening on port ${PORT}`)
})
