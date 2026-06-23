import { Router, type IRouter } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { db } from '../db'

const router: IRouter = Router()

const OnboardingProfileSchema = z.object({
  step: z.number().int().min(1).max(11),
  userId: z.string().optional(),
  token: z.string().optional(),
  stylist: z.enum(['amara', 'kofi']).optional(),
  bodyType: z.enum(['hourglass', 'pear', 'apple', 'rectangle', 'inverted_triangle']).optional(),
  avatarCartoonUrl: z.string().max(500_000).optional(),
  skinProfile: z.object({
    depth: z.enum(['light', 'light_medium', 'medium', 'medium_deep', 'deep', 'rich']),
    undertone: z.enum(['warm', 'cool', 'neutral']),
    userConfirmed: z.boolean(),
  }).optional(),
  hennaDetected: z.boolean().optional(),
  stylePreferences: z.array(z.enum([
    'smart_casual', 'business_casual', 'streetwear',
    'traditional_cultural', 'evening_formal', 'athleisure',
  ])).optional(),
  wardrobeItems: z.array(z.object({
    id: z.string(),
    photoDataUrl: z.string().max(500_000),
    prompt: z.string().max(200),
    tag: z.enum(['owned', 'purchased_planned']),
  })).max(6).optional(),
  locationPermission: z.enum(['granted', 'denied']).optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  budgets: z.record(z.string(), z.number().nonnegative()).optional(),
  shoeSizeUK: z.number().optional(),
  shoeSizeEU: z.number().optional(),
})

router.post('/onboarding/complete', requireAuth, async (req: AuthRequest, res) => {
  const result = OnboardingProfileSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ message: 'Invalid profile data' })
    return
  }
  try {
    await db.query(
      `INSERT INTO onboarding_profiles (user_id, profile)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET profile = $2, completed_at = NOW()`,
      [req.userId, result.data],
    )
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[onboarding/complete]', err)
    res.status(500).json({ message: 'Failed to save profile' })
  }
})

export default router
