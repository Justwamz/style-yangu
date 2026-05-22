import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRouter from './routes/auth'
import onboardingRouter from './routes/onboarding'
import { runMigrations } from './db/migrate'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json({ limit: '200kb' }))

app.use(authRouter)
app.use(onboardingRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() })
})

runMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`[api] listening on port ${PORT}`))
  })
  .catch(err => {
    console.error('[api] migration failed', err)
    process.exit(1)
  })
