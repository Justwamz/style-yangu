// ── User ──────────────────────────────────────────────────────────────────────
export type UserRole = 'consumer' | 'seller' | 'tailor' | 'admin' | 'reseller'
export type Stylist = 'amara' | 'kofi'
export type ConsumerTier = 'free' | 'premium'
export type SellerTier = 'free_trial' | 'hustler' | 'boutique' | 'brand' | 'enterprise'
export type ArtisanTier = 'free' | 'fundi' | 'master_artisan'
export type ArtisanType = 'tailor' | 'cobbler' | 'bag_maker' | 'jewellery_maker'

export type BodyType = 'hourglass' | 'pear' | 'apple' | 'rectangle' | 'inverted_triangle'
export type Undertone = 'warm' | 'cool' | 'neutral'
export type SkinDepth = 'light' | 'light_medium' | 'medium' | 'medium_deep' | 'deep'

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

// ── Consumer Home Screen ───────────────────────────────────────────────────

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
export type UnlockMethod = 'ad' | 'wardrobe'
export type UnlockMode = 'idle' | 'wardrobe-unlock' | 'done'
export type AdPhaseNumber = 1 | 2

export interface UserProfile {
  avatarUrl: string | null
  stylistName: Stylist
  skinTone: SkinProfile | null
  bodyType: BodyType | null
  shoeSize: { uk: number | null; eu: number | null }
  stylePrefs: StylePreference[]
  budget: Record<string, number>
  location: { lat: number | null; lon: number | null }
  tier: 'free' | 'premium'
}

export interface Suggestion {
  id: string
  outfit: string
  occasionTag: string
  stylistComment: string
  clothingTags: string[]
}

export interface DailySuggestionResponse {
  suggestions: Suggestion[]
  unlockCount: number
  adsWatched: number
  wardrobePairsUsed: number
  phase: AdPhaseNumber
}

export interface UnlockResponse {
  unlockCount: number
  remaining: number
  newSuggestion: Suggestion | null
}

export interface WeatherData {
  temp: number
  condition: string
  windSpeed: number
  humidity: number
  timeOfDay: TimeOfDay
  simulated: boolean
}

export interface WardrobeItem {
  id: string
  photoUrl: string
  category: string
  occasionTags: string[]
  source?: 'onboarding' | 'added'
}

export interface WardrobeResponse {
  items: WardrobeItem[]
  total: number
}

export interface DiscoverItem {
  id: string
  name: string
  priceKES: number
  sellerName: string
  photoUrl: string
  sponsored: boolean
  matchReason: string
}

export interface ReferralCounters {
  totalClicks: number
  totalJoined: number
  awaitingUpgrade: number
  upgradedThisMonth: number
}

export interface ReferralData {
  code: string
  expiresAt: string
  shareUrl: string
  counters: ReferralCounters
}

export interface StreakData {
  streakDays: number
  stylePoints: number
  weeklyScore: number
  leaderboardRank: number
}
