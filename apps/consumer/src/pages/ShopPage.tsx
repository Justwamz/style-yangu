import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { PublicSellerProfile, PublicInventoryItem } from '@style-yangu/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json() as Promise<T>
}

type Tab = 'products' | 'lookbook' | 'order' | 'analytics'

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('products')
  const [seller, setSeller] = useState<PublicSellerProfile | null>(null)
  const [items, setItems] = useState<PublicInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    Promise.all([
      fetchJson<PublicSellerProfile>(`${API}/public/seller/${slug}`),
      fetchJson<PublicInventoryItem[]>(`${API}/public/seller/${slug}/items`),
    ])
      .then(([s, it]) => { setSeller(s); setItems(it) })
      .catch(e => { if ((e as Error).message === '404') setNotFound(true) })
      .finally(() => setLoading(false))

    // fire-and-forget view increment
    fetch(`${API}/public/seller/${slug}/view`, { method: 'POST' }).catch(() => {})
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !seller) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-3xl text-dark">Shop not found.</p>
        <p className="text-sm text-dark/50">This storefront doesn't exist or hasn't been published yet.</p>
        <button onClick={() => navigate('/')} className="text-brand text-sm font-semibold underline">
          Go to Style Yangu
        </button>
      </div>
    )
  }

  const highlightReel = items.filter(i => i.showcaseImageUrl).slice(0, 6)
  const liveItems = items
  const lookbookItems = items.filter(i => i.showcaseImageUrl)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'products', label: 'Products' },
    { key: 'lookbook', label: 'Lookbook' },
    { key: 'order',    label: 'Custom Order' },
    { key: 'analytics', label: 'Analytics' },
  ]

  return (
    <div className="min-h-screen bg-cream font-body">

      {/* ── Header ── */}
      <div className="bg-dark text-white px-6 pt-10 pb-6">
        <div className="max-w-2xl mx-auto">

          {/* Nav */}
          <div className="flex items-center justify-between mb-8">
            <span className="font-display text-xl tracking-wide">
              Style<span className="text-gold">Yangu</span>
            </span>
            <button onClick={() => navigate(-1)} className="text-white/40 text-sm hover:text-white transition-colors">
              ← Back
            </button>
          </div>

          {/* Highlight reel */}
          {highlightReel.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-4 -mx-2 px-2 mb-6 scrollbar-none">
              {highlightReel.map(item => (
                <img
                  key={item.id}
                  src={item.showcaseImageUrl!}
                  alt={item.name}
                  className="w-24 h-32 object-cover rounded-xl shrink-0 border border-white/10"
                />
              ))}
            </div>
          )}

          {/* Seller info */}
          <h1 className="font-display text-3xl font-light leading-tight mb-1">{seller.businessName}</h1>
          <p className="text-gold text-[10px] font-semibold tracking-[0.2em] uppercase mb-3">
            {seller.sellerType.replace('_', ' ')} · {seller.tier.replace('_', ' ')}
          </p>
          {seller.bio && <p className="text-white/60 text-sm leading-relaxed mb-4 max-w-sm">{seller.bio}</p>}

          {/* Links row */}
          <div className="flex flex-wrap gap-3">
            {seller.location && (
              <span className="text-white/40 text-xs flex items-center gap-1">
                <span>📍</span> {seller.location}
              </span>
            )}
            {seller.instagramHandle && (
              <a
                href={`https://instagram.com/${seller.instagramHandle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-gold text-xs hover:underline"
              >
                @{seller.instagramHandle.replace('@', '')}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-0 z-10 bg-cream border-b border-sand">
        <div className="max-w-2xl mx-auto flex overflow-x-auto scrollbar-none">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'shrink-0 px-5 py-3 text-sm font-semibold tracking-wide transition-colors border-b-2',
                tab === t.key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-dark/40 hover:text-dark',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Products */}
        {tab === 'products' && (
          liveItems.length === 0 ? (
            <p className="text-center text-dark/40 text-sm py-16">No items published yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {liveItems.map(item => (
                <ItemCard key={item.id} item={item} seller={seller} />
              ))}
            </div>
          )
        )}

        {/* Lookbook */}
        {tab === 'lookbook' && (
          lookbookItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-display text-2xl text-dark/30 mb-2">No showcase images yet.</p>
              <p className="text-sm text-dark/30">Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {lookbookItems.map((item, i) => (
                <div
                  key={item.id}
                  className={['rounded-2xl overflow-hidden relative', i % 5 === 0 ? 'col-span-2' : ''].join(' ')}
                >
                  <img
                    src={item.showcaseImageUrl!}
                    alt={item.name}
                    className="w-full object-cover"
                    style={{ aspectRatio: i % 5 === 0 ? '16/9' : '3/4' }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-3 py-3">
                    <p className="text-white text-xs font-semibold truncate">{item.name}</p>
                    <p className="text-white/70 text-xs">KES {item.priceKES.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Custom Order */}
        {tab === 'order' && (
          <CustomOrderTab seller={seller} />
        )}

        {/* Analytics */}
        {tab === 'analytics' && (
          <AnalyticsTab seller={seller} items={items} />
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-sand mt-4">
        <p className="text-dark/30 text-xs">
          Powered by{' '}
          <a href="https://style-yangu-landing.onrender.com" className="text-brand font-semibold">
            Style Yangu
          </a>
        </p>
      </div>
    </div>
  )
}

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, seller }: { item: PublicInventoryItem; seller: PublicSellerProfile }) {
  const discounted = item.discountPercent && item.discountPercent > 0
  const discountedPrice = discounted
    ? Math.round(item.priceKES * (1 - item.discountPercent! / 100))
    : item.priceKES

  function openWhatsApp() {
    if (!seller.whatsappNumber) return
    const num = seller.whatsappNumber.replace(/\D/g, '')
    const msg = encodeURIComponent(`Hi ${seller.businessName}, I'm interested in: ${item.name} (KES ${discountedPrice.toLocaleString()})`)
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-sand/60 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-sand/30">
        {item.showcaseImageUrl ? (
          <img src={item.showcaseImageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dark/20 text-xs">No image</div>
        )}
        {item.isSoldOut && (
          <div className="absolute inset-0 bg-dark/50 flex items-center justify-center">
            <span className="bg-dark text-white text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">
              Sold Out
            </span>
          </div>
        )}
        {discounted && !item.isSoldOut && (
          <span className="absolute top-2 left-2 bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{item.discountPercent}%
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-xs font-semibold text-dark leading-snug line-clamp-2">{item.name}</p>

        <div className="flex items-center gap-2">
          <span className="text-brand font-bold text-sm">KES {discountedPrice.toLocaleString()}</span>
          {discounted && (
            <span className="text-dark/30 text-xs line-through">KES {item.priceKES.toLocaleString()}</span>
          )}
        </div>

        {/* Sizes */}
        {item.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.sizes.filter(s => s.quantity > 0).slice(0, 4).map(s => (
              <span key={s.size} className="text-[10px] border border-sand rounded px-1.5 py-0.5 text-dark/60">
                {s.size}
              </span>
            ))}
          </div>
        )}

        {!item.isSoldOut && seller.whatsappNumber && (
          <button
            onClick={openWhatsApp}
            className="mt-auto w-full bg-dark text-white rounded-lg py-2 text-xs font-semibold tracking-wide hover:bg-brand transition-colors"
          >
            Talk to Seller
          </button>
        )}
      </div>
    </div>
  )
}

// ── Custom order tab ──────────────────────────────────────────────────────────
function CustomOrderTab({ seller }: { seller: PublicSellerProfile }) {
  const [note, setNote] = useState('')

  function sendOrder() {
    if (!seller.whatsappNumber) return
    const num = seller.whatsappNumber.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Hi ${seller.businessName}, I'd like to place a custom order.\n\n${note || 'Please get in touch to discuss details.'}`,
    )
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
  }

  return (
    <div className="max-w-sm mx-auto py-4">
      <h2 className="font-display text-2xl text-dark mb-1">Request a custom order.</h2>
      <p className="text-dark/50 text-sm mb-6 leading-relaxed">
        Describe what you're looking for and {seller.businessName} will get back to you via WhatsApp.
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-dark/40">
            Your requirements
          </label>
          <textarea
            rows={5}
            placeholder="e.g. I'd like a blue kitenge suit, size L, for a wedding in December..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="border border-sand rounded-xl bg-transparent text-dark text-sm px-4 py-3
                       focus:outline-none focus:border-brand transition-colors resize-none
                       placeholder:text-dark/25"
          />
        </div>

        {seller.whatsappNumber ? (
          <button
            onClick={sendOrder}
            className="w-full bg-brand text-white rounded-xl py-4 text-sm font-semibold tracking-wide"
          >
            Send via WhatsApp
          </button>
        ) : (
          <p className="text-center text-dark/40 text-sm">
            This seller hasn't added a WhatsApp number yet. Try Instagram:{' '}
            {seller.instagramHandle ? (
              <a
                href={`https://instagram.com/${seller.instagramHandle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand underline"
              >
                @{seller.instagramHandle.replace('@', '')}
              </a>
            ) : (
              'contact them directly.'
            )}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Analytics tab ─────────────────────────────────────────────────────────────
function AnalyticsTab({ seller, items }: { seller: PublicSellerProfile; items: PublicInventoryItem[] }) {
  const liveCount = items.length
  const showcaseCount = items.filter(i => i.showcaseImageUrl).length
  const soldOutCount = items.filter(i => i.isSoldOut).length

  const stats = [
    { label: 'Storefront Views', value: seller.storefrontViews.toLocaleString() },
    { label: 'Live Products',    value: liveCount.toString() },
    { label: 'With Showcase',    value: showcaseCount.toString() },
    { label: 'Sold Out',         value: soldOutCount.toString() },
  ]

  return (
    <div className="py-4">
      <h2 className="font-display text-2xl text-dark mb-1">Storefront Analytics</h2>
      <p className="text-dark/40 text-sm mb-6">Public statistics for this shop.</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-sand rounded-2xl p-4">
            <p className="text-2xl font-bold text-brand mb-0.5">{s.value}</p>
            <p className="text-xs text-dark/50">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-sand/40 rounded-2xl p-4 text-sm text-dark/50 leading-relaxed">
        Detailed analytics — item views, traffic sources, save rates, and try-on conversion — are available
        to the seller in their{' '}
        <a href="https://style-yangu-seller.onrender.com" className="text-brand font-semibold">
          seller dashboard
        </a>.
      </div>
    </div>
  )
}
