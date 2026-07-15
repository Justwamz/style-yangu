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
  await db.query(`CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_id ON wardrobe_items(user_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_daily_suggestions_user_id ON daily_suggestions(user_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer ON referral_attributions(referrer_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_referral_attributions_referred ON referral_attributions(referred_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id)`)

  // ── Seller tables ────────────────────────────────────────────────────────────

  await db.query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone      TEXT NOT NULL,
      code       TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS sellers (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone            TEXT UNIQUE NOT NULL,
      business_name    TEXT NOT NULL DEFAULT '',
      seller_type      TEXT NOT NULL DEFAULT 'seller',
      tier             TEXT NOT NULL DEFAULT 'free_trial',
      bio              TEXT,
      instagram_handle TEXT,
      whatsapp_number  TEXT,
      location         TEXT,
      onboarding_done  BOOLEAN NOT NULL DEFAULT false,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id           UUID NOT NULL REFERENCES sellers(id),
      name                TEXT NOT NULL,
      category            TEXT NOT NULL,
      price_kes           INT NOT NULL,
      occasion_tags       TEXT[] DEFAULT '{}',
      sizes               JSONB NOT NULL DEFAULT '[]',
      showcase_image_url  TEXT,
      is_live             BOOLEAN NOT NULL DEFAULT false,
      discount_percent    INT,
      discount_expires_at TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS seller_clients (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id          UUID NOT NULL REFERENCES sellers(id),
      consumer_username  TEXT NOT NULL,
      nickname           TEXT NOT NULL,
      whatsapp_number    TEXT,
      last_purchase_date TIMESTAMPTZ,
      try_on_sent        INT NOT NULL DEFAULT 0,
      try_on_acted       INT NOT NULL DEFAULT 0,
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(seller_id, consumer_username)
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS pos_transactions (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id        UUID NOT NULL REFERENCES sellers(id),
      item_id          UUID REFERENCES inventory_items(id),
      item_name        TEXT NOT NULL,
      listed_price_kes INT NOT NULL,
      final_price_kes  INT NOT NULL,
      payment_method   TEXT NOT NULL,
      payment_status   TEXT NOT NULL,
      client_id        UUID REFERENCES seller_clients(id),
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS try_ons (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id  UUID NOT NULL REFERENCES seller_clients(id),
      item_id    UUID NOT NULL REFERENCES inventory_items(id),
      note       TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS adboost_waitlist (
      id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id UUID NOT NULL REFERENCES sellers(id),
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(seller_id)
    )
  `)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_otp_phone       ON otp_codes(phone)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_sellers_phone   ON sellers(phone)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_inv_seller      ON inventory_items(seller_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_pos_seller      ON pos_transactions(seller_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_pos_created     ON pos_transactions(created_at)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_clients_seller  ON seller_clients(seller_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_tryons_client   ON try_ons(client_id)`)

  // ── Seller storefront columns (added after initial schema) ───────────────────
  await db.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE`)
  await db.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS storefront_views INT NOT NULL DEFAULT 0`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_sellers_slug ON sellers(slug)`)

  // ── Artisan / tailor columns on sellers ──────────────────────────────────────
  await db.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS artisan_tier TEXT NOT NULL DEFAULT 'free'`)
  await db.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS specialisation_tags TEXT[] DEFAULT '{}'`)
  await db.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS turnaround_days INT`)
  await db.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS price_range TEXT`)
  await db.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false`)

  // ── Artisan tables ───────────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS artisan_orders (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artisan_id        UUID NOT NULL REFERENCES sellers(id),
      consumer_username TEXT NOT NULL,
      nickname          TEXT,
      status            TEXT NOT NULL DEFAULT 'received',
      brief             JSONB NOT NULL DEFAULT '{}',
      fabric_source     TEXT,
      measurements      JSONB NOT NULL DEFAULT '{}',
      deposit_paid_kes  INT NOT NULL DEFAULT 0,
      balance_due_kes   INT NOT NULL DEFAULT 0,
      promised_date     DATE,
      notes             TEXT,
      completion_photos TEXT[] DEFAULT '{}',
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS artisan_appointments (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artisan_id        UUID NOT NULL REFERENCES sellers(id),
      consumer_username TEXT,
      slot_start        TIMESTAMPTZ NOT NULL,
      slot_end          TIMESTAMPTZ NOT NULL,
      status            TEXT NOT NULL DEFAULT 'available',
      location          TEXT,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS artisan_portfolio (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artisan_id UUID NOT NULL REFERENCES sellers(id),
      image_url  TEXT NOT NULL,
      caption    TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS escrow_transactions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id    UUID NOT NULL REFERENCES artisan_orders(id),
      artisan_id  UUID NOT NULL REFERENCES sellers(id),
      amount_kes  INT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'holding',
      mpesa_ref   TEXT,
      held_at     TIMESTAMPTZ DEFAULT NOW(),
      released_at TIMESTAMPTZ
    )
  `)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_artisan_orders_artisan ON artisan_orders(artisan_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_artisan_appts_artisan   ON artisan_appointments(artisan_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_artisan_portfolio_artisan ON artisan_portfolio(artisan_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_escrow_order            ON escrow_transactions(order_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_escrow_artisan          ON escrow_transactions(artisan_id)`)

  // ── Admin: account status + platform settings ────────────────────────────────
  await db.query(`ALTER TABLE users   ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`)
  await db.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`)
  await db.query(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key   TEXT PRIMARY KEY,
      value JSONB NOT NULL
    )
  `)
}
