import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRouter from './routes/auth'
import onboardingRouter from './routes/onboarding'
import consumerRouter from './routes/consumer'
import sellerRouter from './routes/seller'
import artisanRouter from './routes/artisan'
import adminRouter from './routes/admin'
import resellerRouter from './routes/reseller'
import paymentsRouter from './routes/payments'
import adsRouter from './routes/ads'
import internalRouter from './routes/internal'
import { runMigrations } from './db/migrate'
import { runDueJobs } from './lib/scheduler'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json({ limit: '200kb' }))

app.use(authRouter)
app.use(onboardingRouter)
app.use(consumerRouter)
app.use(sellerRouter)
app.use(artisanRouter)
app.use(adminRouter)
app.use(resellerRouter)
app.use(paymentsRouter)
app.use(adsRouter)
app.use(internalRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() })
})

runMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`[api] listening on port ${PORT}`))

    // Optional in-process scheduler (runs while the service is warm). Prefer an
    // external scheduler hitting POST /internal/cron on free tiers that spin down.
    if (process.env.ENABLE_CRON_INTERVAL === 'true') {
      const HOUR = 60 * 60 * 1000
      setInterval(() => { runDueJobs().catch(err => console.error('[cron] interval run failed', err)) }, HOUR)
      console.log('[api] in-process cron interval enabled (hourly)')
    }
  })
  .catch(err => {
    console.error('[api] migration failed', err)
    process.exit(1)
  })
