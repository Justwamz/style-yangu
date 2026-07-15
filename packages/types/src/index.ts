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
  | 'jumpsuit'
  | 'shoe'
  | 'hat'
  | 'headwrap'
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

// ── Seller ────────────────────────────────────────────────────────────────────
export type SellerType = 'seller' | 'cobbler' | 'tailor' | 'bag_maker' | 'jewellery_maker'

export interface SellerProfile {
  id: string
  slug: string
  businessName: string
  sellerType: SellerType
  tier: SellerTier
  generationsUsed: number
  generationsLimit: number
  phone: string
  avatarUrl: string | null
  instagramHandle: string | null
  whatsappNumber: string | null
  location: string | null
  bio: string | null
  onboardingDone: boolean
  storefrontViews: number
  createdAt: string
}

export interface PublicSellerProfile {
  id: string
  slug: string
  businessName: string
  sellerType: SellerType
  tier: SellerTier
  bio: string
  instagramHandle: string
  whatsappNumber: string
  location: string
  storefrontViews: number
}

export interface PublicInventoryItem {
  id: string
  name: string
  category: ItemCategory
  priceKES: number
  occasionTags: string[]
  sizes: { size: string; quantity: number }[]
  showcaseImageUrl: string | null
  isSoldOut: boolean
  discountPercent: number | null
  discountExpiresAt: string | null
}

export interface ShowcaseJob {
  id: string
  itemId: string
  mode: 'full_body' | 'face_neck' | 'studio'
  faceId: string | null
  status: 'pending' | 'processing' | 'done' | 'failed'
  resultUrl: string | null
  watermarked: boolean
  createdAt: string
}

export interface POSTransaction {
  id: string
  sellerId: string
  itemId: string | null
  itemName: string
  listedPriceKES: number
  finalPriceKES: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  clientNickname: string | null
  clientUsername: string | null
  whatsappNumber: string | null
  createdAt: string
}

export interface SellerClient {
  id: string
  sellerId: string
  nickname: string
  consumerUsername: string
  lastPurchaseDate: string | null
  whatsappNumber: string | null
  tryOnSent: number
  tryOnActed: number
}

export interface TryOnSend {
  clientId: string
  itemId: string
  note: string | null
}

export interface FaceCard {
  id: string
  gender: 'female' | 'male'
  thumbnailUrl: string
  styleVibe: 'editorial' | 'everyday' | 'corporate' | 'streetwear' | 'traditional'
  skinDepth: SkinDepth
}

export interface POSSummary {
  todayRevenueKES: number
  todayItemsSold: number
  outstandingCount: number
  outstandingKES: number
}

// ── Artisan / Tailor ────────────────────────────────────────────────────────
export type ArtisanOrderStatus =
  | 'received'
  | 'in_progress'
  | 'ready_for_collection'
  | 'collected'
  | 'auto_released'
  | 'disputed'

/** Tailor fields: bust/waist/hips/length/shoulder. Cobbler: footLength/footWidth/lastWidth. */
export interface ArtisanMeasurements {
  bust?: number
  waist?: number
  hips?: number
  length?: number
  shoulder?: number
  footLength?: number
  footWidth?: number
  lastWidth?: number
}

export interface ArtisanOrderBrief {
  fabricDescription?: string
  fabricPhotoUrl?: string
  avatarRenderUrl?: string
  silhouette?: string
  occasion?: string
  specialInstructions?: string
}

export interface ArtisanOrder {
  id: string
  artisanId: string
  consumerUsername: string
  nickname: string | null
  status: ArtisanOrderStatus
  brief: ArtisanOrderBrief
  fabricSource: 'customer' | 'artisan' | null
  measurements: ArtisanMeasurements
  depositPaidKES: number
  balanceDueKES: number
  promisedDate: string | null
  notes: string | null
  completionPhotos: string[]
  createdAt: string
  updatedAt: string
}

export interface ArtisanAppointmentSlot {
  id: string
  artisanId: string
  consumerUsername: string | null
  slotStart: string
  slotEnd: string
  status: 'available' | 'booked' | 'completed' | 'cancelled'
  location: string | null
  createdAt: string
}

export interface ArtisanPortfolioItem {
  id: string
  artisanId: string
  imageUrl: string
  caption: string | null
  createdAt: string
}

export type EscrowTxStatus = 'holding' | 'released' | 'refunded' | 'disputed'

export interface EscrowTransaction {
  id: string
  orderId: string
  artisanId: string
  amountKES: number
  status: EscrowTxStatus
  mpesaRef: string | null
  heldAt: string
  releasedAt: string | null
}

export interface ArtisanProfile {
  id: string
  slug: string
  businessName: string
  artisanType: ArtisanType
  artisanTier: ArtisanTier
  phone: string
  bio: string | null
  instagramHandle: string | null
  whatsappNumber: string | null
  location: string | null
  specialisationTags: string[]
  turnaroundDays: number | null
  priceRange: string | null
  verified: boolean
  onboardingDone: boolean
  createdAt: string
}

export interface ArtisanDashboard {
  activeOrders: number
  readyForCollection: number
  outstandingBalanceKES: number
  escrowHeldKES: number
  completedThisWeek: number
}

// ── Admin ───────────────────────────────────────────────────────────────────
export type AccountStatus = 'active' | 'suspended' | 'banned'

export interface AdminUserRow {
  id: string
  kind: 'consumer' | 'seller' | 'artisan'
  label: string
  detail: string
  status: AccountStatus
  verified?: boolean
  createdAt: string
}

export interface AdminFinanceSummary {
  sellersByTier: Record<string, number>
  artisansByTier: Record<string, number>
  escrowHeldKES: number
  escrowReleasedKES: number
  outstandingArtisanBalanceKES: number
  pendingVerifications: number
}

export interface AdminEscrowRow {
  id: string
  orderId: string
  artisanId: string
  artisanName: string
  consumerUsername: string
  amountKES: number
  status: EscrowTxStatus
  heldAt: string
  releasedAt: string | null
}

export interface AdminAdBoostState {
  activation: 'coming_soon' | 'live'
  phase: 1 | 2 | 3
  waitlistCount: number
}

export interface AdminWaitlistRow {
  sellerId: string
  businessName: string
  sellerType: SellerType
  tier: SellerTier
  joinedAt: string
}
