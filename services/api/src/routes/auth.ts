import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '../db'

const router = Router()

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

router.post('/auth/register', async (req, res) => {
  const result = RegisterSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  const { email, password } = result.data
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, passwordHash],
    )
    const userId: string = rows[0].id
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

export default router
