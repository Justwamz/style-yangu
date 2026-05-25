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
  await db.query(`
    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES users(id),
      photo_data_url TEXT NOT NULL,
      category      TEXT NOT NULL DEFAULT 'clothing',
      occasion_tags TEXT[] DEFAULT '{}',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS daily_suggestions (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id             UUID NOT NULL REFERENCES users(id),
      date                DATE NOT NULL DEFAULT CURRENT_DATE,
      suggestions         JSONB NOT NULL DEFAULT '[]',
      unlock_count        INT NOT NULL DEFAULT 1,
      ads_watched         INT NOT NULL DEFAULT 0,
      wardrobe_pairs_used INT NOT NULL DEFAULT 0,
      UNIQUE(user_id, date)
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS referral_codes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id),
      code       TEXT UNIQUE NOT NULL,
      status     TEXT NOT NULL DEFAULT 'active',
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS referral_attributions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id  UUID NOT NULL REFERENCES users(id),
      referred_id  UUID NOT NULL REFERENCES users(id),
      clicked_at   TIMESTAMPTZ NOT NULL,
      signed_up_at TIMESTAMPTZ DEFAULT NOW(),
      status       TEXT NOT NULL DEFAULT 'pending'
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id                UUID PRIMARY KEY REFERENCES users(id),
      notification_frequency TEXT NOT NULL DEFAULT 'immediate'
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS weather_simulations (
      user_id    UUID PRIMARY KEY REFERENCES users(id),
      active     BOOLEAN NOT NULL DEFAULT false,
      simulation JSONB NOT NULL DEFAULT '{}'
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id),
      item_id    TEXT NOT NULL,
      item_data  JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, item_id)
    )
  `)
}
