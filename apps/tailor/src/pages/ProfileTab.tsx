import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { artisanApi, useArtisanContext } from '../context/ArtisanContext'
import type { ArtisanPortfolioItem, ArtisanTier } from '@style-yangu/types'

const TIER_META: Record<ArtisanTier, { label: string; price: string }> = {
  free:           { label: 'Free',           price: 'KES 0' },
  fundi:          { label: 'Fundi',          price: 'KES 800/mo' },
  master_artisan: { label: 'Master Artisan', price: 'KES 2,000/mo' },
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function ProfileTab() {
  const { profile, refresh } = useArtisanContext()
  const qc = useQueryClient()

  const [bio, setBio] = useState(profile?.bio ?? '')
  const [whatsapp, setWhatsapp] = useState(profile?.whatsappNumber ?? '')
  const [instagram, setInstagram] = useState(profile?.instagramHandle ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [tags, setTags] = useState((profile?.specialisationTags ?? []).join(', '))
  const [turnaround, setTurnaround] = useState(profile?.turnaroundDays?.toString() ?? '')
  const [priceRange, setPriceRange] = useState(profile?.priceRange ?? '')
  const [savedFlash, setSavedFlash] = useState(false)

  const { data: portfolio = [] } = useQuery({
    queryKey: ['artisan-portfolio'],
    queryFn: () => artisanApi.get<ArtisanPortfolioItem[]>('/artisan/portfolio'),
  })
  const { data: escrow = [] } = useQuery({
    queryKey: ['artisan-escrow'],
    queryFn: () => artisanApi.get<{ status: string; amountKES: number }[]>('/artisan/escrow'),
  })

  const heldKES = escrow.filter(e => e.status === 'holding').reduce((s, e) => s + e.amountKES, 0)

  async function save() {
    await artisanApi.patch('/artisan/profile', {
      bio,
      whatsappNumber: whatsapp,
      instagramHandle: instagram,
      location,
      specialisationTags: tags.split(',').map(t => t.trim()).filter(Boolean),
      turnaroundDays: turnaround ? parseInt(turnaround) : null,
      priceRange,
    })
    await refresh()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  async function addPortfolio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const imageUrl = await fileToDataUrl(file)
    await artisanApi.post('/artisan/portfolio', { imageUrl, caption: null })
    qc.invalidateQueries({ queryKey: ['artisan-portfolio'] })
    e.target.value = ''
  }

  async function removePortfolio(id: string) {
    await artisanApi.delete(`/artisan/portfolio/${id}`)
    qc.invalidateQueries({ queryKey: ['artisan-portfolio'] })
  }

  function signOut() {
    localStorage.removeItem('sy_seller_token')
    window.location.href = '/auth'
  }

  if (!profile) return <div className="p-5"><p className="text-sm text-mid/60">Loading…</p></div>

  const tier = TIER_META[profile.artisanTier]

  return (
    <div className="p-5 max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-light text-dark">{profile.businessName}</h1>
          <p className="text-xs text-mid/50 capitalize">{profile.artisanType.replace('_', ' ')}</p>
        </div>
        {profile.verified && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-gold/20 text-gold-dim">
            ✓ Verified
          </span>
        )}
      </div>

      {/* Tier */}
      <div className="bg-dark rounded-2xl p-4 text-white flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold">Your plan</p>
          <p className="font-display text-xl">{tier.label}</p>
        </div>
        <p className="text-sm text-white/60">{tier.price}</p>
      </div>

      {/* Business details */}
      <div className="bg-white rounded-2xl border border-sand p-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim">Business details</p>
        <FieldInput label="Bio" value={bio} onChange={setBio} placeholder="Tell customers about your craft" textarea />
        <FieldInput label="Specialisation tags (comma-separated)" value={tags} onChange={setTags} placeholder="Wedding wear, kitenge, alterations" />
        <div className="grid grid-cols-2 gap-3">
          <FieldInput label="Turnaround (days)" value={turnaround} onChange={setTurnaround} type="number" />
          <FieldInput label="Price range" value={priceRange} onChange={setPriceRange} placeholder="KES 2k–8k" />
        </div>
        <FieldInput label="Location" value={location} onChange={setLocation} placeholder="e.g. Ngara, Nairobi" />
        <FieldInput label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+254…" />
        <FieldInput label="Instagram" value={instagram} onChange={setInstagram} placeholder="@handle" />
        <button onClick={save} className="w-full bg-brand text-white rounded-xl py-3 font-semibold text-sm">
          {savedFlash ? 'Saved ✓' : 'Save changes'}
        </button>
      </div>

      {/* Escrow summary */}
      <div className="bg-white rounded-2xl border border-sand p-4">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim mb-1">Escrow</p>
        <p className="text-sm text-dark">
          <span className="font-semibold">KES {heldKES.toLocaleString()}</span> held across {escrow.filter(e => e.status === 'holding').length} order(s).
        </p>
        <p className="text-[11px] text-mid/50 mt-1">Deposits release to your M-Pesa when orders are collected. Payouts activate at launch.</p>
      </div>

      {/* Portfolio */}
      <div className="bg-white rounded-2xl border border-sand p-4">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim mb-2">Portfolio</p>
        {portfolio.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {portfolio.map(p => (
              <div key={p.id} className="relative">
                <img src={p.imageUrl} alt={p.caption ?? 'Portfolio piece'} className="aspect-square object-cover rounded-lg" />
                <button onClick={() => removePortfolio(p.id)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs leading-none">×</button>
              </div>
            ))}
          </div>
        )}
        <label className="inline-block text-sm text-brand underline cursor-pointer">
          + Add portfolio piece
          <input type="file" accept="image/*" className="hidden" onChange={addPortfolio} />
        </label>
      </div>

      <button onClick={signOut} className="w-full border border-sand rounded-xl py-3 text-sm text-mid/60">
        Sign out
      </button>
    </div>
  )
}

function FieldInput({
  label, value, onChange, placeholder, type = 'text', textarea = false,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean
}) {
  const cls = 'border-0 border-b border-sand bg-transparent text-dark py-2 text-base w-full focus:outline-none focus:border-brand transition-colors placeholder:text-mid/25'
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-dark/40">{label}</span>
      {textarea
        ? <textarea rows={2} className={cls} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
        : <input type={type} className={cls} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}
    </label>
  )
}
