import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sellerApi, useSellerContext } from '../context/SellerContext'
import TierBadge from '../components/TierBadge'
import AdBoostCard from '../components/AdBoostCard'

export default function ProfileTab() {
  const navigate = useNavigate()
  const { profile, refresh } = useSellerContext()

  const [bio, setBio] = useState(profile?.bio ?? '')
  const [instagram, setInstagram] = useState(profile?.instagramHandle ?? '')
  const [whatsapp, setWhatsapp] = useState(profile?.whatsappNumber ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? '')
      setInstagram(profile.instagramHandle ?? '')
      setWhatsapp(profile.whatsappNumber ?? '')
      setLocation(profile.location ?? '')
    }
  }, [profile])

  if (!profile) return null

  const isUnlimited = profile.tier === 'brand' || profile.tier === 'enterprise'
  const storefrontSlug = profile.slug || profile.businessName.toLowerCase().replace(/\s+/g, '-')

  async function saveProfile() {
    await sellerApi.patch('/seller/profile', { bio, instagramHandle: instagram, whatsappNumber: whatsapp, location })
    refresh()
  }

  function handleSignOut() {
    localStorage.removeItem('sy_seller_token')
    navigate('/auth', { replace: true })
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Business header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-sand flex items-center justify-center text-2xl">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.businessName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>🏪</span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold font-display">{profile.businessName}</h2>
          <TierBadge tier={profile.tier} />
        </div>
      </div>

      {/* Edit details */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-dark/70 uppercase tracking-wide">Business details</h3>
        {[
          { label: 'Bio', value: bio, setter: setBio, placeholder: 'Tell customers about your business' },
          { label: 'Instagram', value: instagram, setter: setInstagram, placeholder: '@handle' },
          { label: 'WhatsApp', value: whatsapp, setter: setWhatsapp, placeholder: '+254...' },
          { label: 'Location', value: location, setter: setLocation, placeholder: 'City, Neighbourhood' },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label}>
            <label className="text-xs text-mid/70 block mb-0.5">{label}</label>
            <input
              value={value}
              onChange={e => setter(e.target.value)}
              onBlur={saveProfile}
              placeholder={placeholder}
              className="w-full border border-sand rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        ))}
      </div>

      {/* Generation meter */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-dark/70 uppercase tracking-wide">AI Showcase</h3>
        {isUnlimited ? (
          <p className="text-sm text-brand font-medium">Unlimited showcase generations</p>
        ) : (
          <>
            <p className="text-sm text-mid">
              {profile.generationsUsed} of {profile.generationsLimit} showcase generations used this month
            </p>
            <div className="w-full bg-sand/60 rounded-full h-2">
              <div
                className="bg-brand h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (profile.generationsUsed / profile.generationsLimit) * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Subscription */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-dark/70 uppercase tracking-wide">Subscription</h3>
        <div className="border border-sand rounded-xl p-3 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium capitalize">{profile.tier.replace('_', ' ')}</p>
          </div>
          <button className="text-xs border border-brand text-brand px-3 py-1 rounded-full">
            Upgrade
          </button>
        </div>
      </div>

      {/* Storefront */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-dark/70 uppercase tracking-wide">Storefront</h3>
        <a
          href={`https://style-yangu-consumer.onrender.com/shop/${storefrontSlug}`}
          target="_blank"
          rel="noreferrer"
          className="block border border-sand rounded-xl p-3 text-sm text-brand font-medium"
        >
          View my storefront →
        </a>
      </div>

      {/* Ad Boost */}
      <AdBoostCard tier={profile.tier} />

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full border border-red-200 text-red-600 rounded-xl py-3 font-semibold"
      >
        Sign out
      </button>
    </div>
  )
}
