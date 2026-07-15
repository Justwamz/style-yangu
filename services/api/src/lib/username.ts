import { db } from '../db'

// Privacy-safe consumer handles — artisans/sellers never see PII (email/phone).
const ADJ = ['swift', 'bold', 'warm', 'bright', 'calm', 'keen', 'noble', 'sunny', 'brave', 'sleek', 'gold', 'kind']
const NOUN = ['duiker', 'sunbird', 'acacia', 'zebra', 'ndovu', 'simba', 'tausi', 'kifaru', 'swara', 'chui', 'twiga', 'nyati']

function randomHandle(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)]
  const n = NOUN[Math.floor(Math.random() * NOUN.length)]
  const num = Math.floor(100 + Math.random() * 900)
  return `${a}-${n}${num}`
}

/** Returns the consumer's stable public handle, generating a unique one on first use. */
export async function getOrCreateUsername(userId: string): Promise<string> {
  const existing = await db.query('SELECT username FROM users WHERE id = $1', [userId])
  if (existing.rows[0]?.username) return existing.rows[0].username as string

  for (let attempt = 0; attempt < 8; attempt++) {
    const handle = randomHandle()
    try {
      const r = await db.query(
        'UPDATE users SET username = $1 WHERE id = $2 AND username IS NULL RETURNING username',
        [handle, userId],
      )
      if (r.rows[0]) return r.rows[0].username as string
      // username was set concurrently — re-read
      const reread = await db.query('SELECT username FROM users WHERE id = $1', [userId])
      if (reread.rows[0]?.username) return reread.rows[0].username as string
    } catch (err) {
      // unique collision on handle — try another
      if ((err as { code?: string }).code !== '23505') throw err
    }
  }
  // Fallback: deterministic handle from id
  const fallback = `sy-${userId.slice(0, 8)}`
  await db.query('UPDATE users SET username = $1 WHERE id = $2 AND username IS NULL', [fallback, userId])
  return fallback
}
