import { Router, type IRouter } from 'express'
import { runDueJobs } from '../lib/scheduler'

const router: IRouter = Router()

// Trigger the scheduled jobs. Secured by a shared secret so an external scheduler
// (Render Cron, cron-job.org, GitHub Actions, …) can ping it. Set CRON_SECRET and
// send it as the X-Cron-Secret header. Disabled (401) until the secret is configured.
router.post('/internal/cron', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers['x-cron-secret'] !== secret) {
    res.status(401).json({ message: 'Unauthorised' })
    return
  }
  try {
    const summary = await runDueJobs()
    res.json({ ok: true, ran: summary })
  } catch (err) {
    console.error('[internal/cron]', err)
    res.status(500).json({ message: 'Cron run failed' })
  }
})

export default router
