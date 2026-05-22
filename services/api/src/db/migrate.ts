import { db } from './index'

export async function runMigrations(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS onboarding_profiles (
      user_id      UUID PRIMARY KEY REFERENCES users(id),
      profile      JSONB NOT NULL,
      completed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}
