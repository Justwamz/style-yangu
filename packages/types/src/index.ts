// ── User ──────────────────────────────────────────────────────────────────────
export type UserRole = 'consumer' | 'seller' | 'tailor' | 'admin' | 'reseller'
export type Stylist = 'amara' | 'kofi'
export type ConsumerTier = 'free' | 'premium'
export type SellerTier = 'free_trial' | 'hustler' | 'boutique' | 'brand' | 'enterprise'
export type ArtisanTier = 'free' | 'fundi' | 'master_artisan'
export type ArtisanType = 'tailor' | 'cobbler' | 'bag_maker' | 'jewellery_maker'

export type BodyType = 'hourglass' | 'pear' | 'apple' | 'rectangle' | 'inverted_triangle'
export type Undertone = 'warm' | 'cool' | 'neutral'
export type SkinDepth = 'light' | 'light_medium' | 'medium' | 'medium_deep' | 'deep' | 'rich'

export type StylePreference =
  | 'smart_casual'
  | 'business_casual'
  | 'streetwear'
  | 'traditional_cultural'
  | 'evening_formal'
  | 'athleisure'

export interface SkinProfile {
  depth: SkinDepth
  undertone: Undertone
  userConfirmed: boolean
}

export interface ConsumerProfile {
  id: string
  stylist: Stylist
  bodyType: BodyType
  skinProfile: SkinProfile
  stylePreferences: StylePreference[]
  shoeSizeUK: number
  shoeSizeEU: number
  tier: ConsumerTier
  createdAt: string
}

// ── Order ─────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'received'
  | 'in_progress'
  | 'ready_for_collection'
  | 'collected'
  | 'disputed'
  | 'auto_released'

export interface Order {
  id: string
  artisanId: string
  consumerUsername: string
  status: OrderStatus
  depositPaidKES: number
  balanceDueKES: number
  completionPhotos: string[]
  createdAt: string
  updatedAt: string
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export type ItemCategory =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'suit'
  | 'outerwear'
  | 'shoe'
  | 'hat'
  | 'bag'
  | 'jewellery'
  | 'accessory'

export type SizeSystem = 'international' | 'kenyan_informal'

export interface InventoryItem {
  id: string
  sellerId: string
  name: string
  category: ItemCategory
  priceKES: number
  occasionTags: string[]
  sizes: { size: string; quantity: number }[]
  showcaseImageUrl: string | null
  isLive: boolean
  isSoldOut: boolean
  discountPercent: number | null
  discountExpiresAt: string | null
  createdAt: string
}

// ── Payment ───────────────────────────────────────────────────────────────────
export type PaymentMethod = 'mpesa' | 'cash' | 'bank_transfer' | 'card'
export type PaymentStatus = 'paid' | 'partially_paid' | 'owing'
export type EscrowStatus = 'holding' | 'released' | 'refunded' | 'disputed'

// ── Notification ──────────────────────────────────────────────────────────────
export type NotificationChannel = 'push' | 'whatsapp' | 'email'
export type NotificationType =
  | 'daily_suggestion_nudge'
  | 'ad_unlock_nudge'
  | 'order_update'
  | 'new_item_match'
  | 'try_this_on'
  | 'referral_expiry'
  | 'streak_milestone'
  | 'weekly_recap'

// ── Referral ──────────────────────────────────────────────────────────────────
export type ReferralCodeStatus = 'active' | 'muted' | 'expired'
export type AttributionStatus = 'pending' | 'converted' | 'expired' | 'forfeited'

export interface ReferralCode {
  id: string
  referrerId: string
  code: string
  status: ReferralCodeStatus
  expiresAt: string
  createdAt: string
}

// ── Ad Boost ──────────────────────────────────────────────────────────────────
export type AdPhase = 'pre_activation' | 'launch' | 'growth'
export type BoostPackType = 'starter' | 'growth' | 'campaign' | 'max'
export type BoostPackStatus = 'active' | 'coming_soon'
export type SponsoredCardCTA = 'talk_to_seller' | 'follow' | 'save_to_wishlist' | 'book_consultation'

export interface BoostSlot {
  id: string
  sellerId: string
  itemId: string
  weekStarting: string
  impressionsThisWeek: number
  wishlistSaves: number
  follows: number
  talkToSellerTaps: number
}

export interface SponsoredCard {
  slotId: string
  itemId: string
  sellerStorefrontName: string
  showcaseImageUrl: string
  priceKES: number
  cta: SponsoredCardCTA
  isArtisanCard: boolean
}
