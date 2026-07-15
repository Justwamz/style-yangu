import { Router, type IRouter } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '../db'
import { JWT_SECRET } from '../config'
import { attributeSignup } from '../lib/referral'

const router: IRouter = Router()

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  referralCode: z.string().max(16).optional(),
})

router.post('/auth/register', async (req, res) => {
  const result = RegisterSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  const { email, password, referralCode } = result.data
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, passwordHash],
    )
    const userId: string = rows[0].id

    if (referralCode) {
      // Attribution is best-effort — never block signup on it.
      try { await attributeSignup(referralCode, userId) } catch { /* ignore */ }
    }

    const token = jwt.sign({ sub: userId, role: 'consumer' }, JWT_SECRET, { expiresIn: '30d' })
    res.status(201).json({ userId, token })
  } catch (err: unknown) {
    const pgCode = (err as { code?: string }).code
    if (pgCode === '23505') {
      res.status(409).json({ message: 'Email already in use' })
      return
    }
    console.error('[auth/register]', err)
    res.status(500).json({ message: 'Network error — try again' })
  }
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/auth/login', async (req, res) => {
  const result = LoginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  const { email, password } = result.data
  try {
    const { rows } = await db.query(
      'SELECT id, password_hash, status FROM users WHERE email = $1',
      [email],
    )
    const user = rows[0]
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ message: 'Invalid email or password' })
      return
    }
    if (user.status === 'banned') {
      res.status(403).json({ message: 'This account has been suspended.' })
      return
    }
    const token = jwt.sign({ sub: user.id, role: 'consumer' }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ userId: user.id, token })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ message: 'Network error — try again' })
  }
})

export default router
