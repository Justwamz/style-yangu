import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { db } from '../db'

const router = Router()

router.post('/onboarding/complete', requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.query(
      `INSERT INTO onboarding_profiles (user_id, profile)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET profile = $2, completed_at = NOW()`,
      [req.userId, req.body],
    )
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[onboarding/complete]', err)
    res.status(500).json({ message: 'Failed to save profile' })
  }
})

export default router
