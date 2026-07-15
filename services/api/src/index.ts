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
import { runMigrations } from './db/migrate'

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
