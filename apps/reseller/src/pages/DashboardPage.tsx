import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { resellerApi } from '../api'
import type { ResellerDashboard } from '@style-yangu/types'

const KES = (n: number) => `KES ${n.toLocaleString()}`

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

export default function DashboardPage() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['reseller-dashboard'],
    queryFn: () => resellerApi.get<ResellerDashboard>('/reseller/dashboard'),
  })

  const [payoutPhone, setPayoutPhone] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (!data?.shareUrl) return
    QRCode.toDataURL(data.shareUrl, { width: 220, margin: 1, color: { dark: '#1A0F0A', light: '#FAF6F1' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [data?.shareUrl])

  async function enroll() {
    setEnrolling(true)
    try {
      await resellerApi.post('/reseller/enroll', { payoutPhone })
      qc.invalidateQueries({ queryKey: ['reseller-dashboard'] })
    } finally {
      setEnrolling(false)
    }
  }

  async function copyLink() {
    if (!data) return
    await navigator.clipboard.writeText(data.shareUrl).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function regenerate() {
    if (!confirm('Generate a new code? Your current link will stop working for new signups.')) return
    setRegenerating(true)
    try {
      await resellerApi.post('/reseller/code/regenerate', {})
      qc.invalidateQueries({ queryKey: ['reseller-dashboard'] })
    } finally {
      setRegenerating(false)
    }
  }

  if (isLoading) return <div className="p-8"><p className="text-sm text-mid/60">Loading…</p></div>
  if (error || !data) return <div className="p-8"><p className="text-sm text-red-600">Failed to load. Please sign in again.</p></div>

  // ── Enrollment gate ──
  if (!data.enrolled) {
    return (
      <div className="p-6 md:p-10 max-w-md mx-auto">
        <h1 className="font-display text-3xl font-light text-dark mb-2">Join the programme</h1>
        <p className="text-sm text-mid/60 mb-6">
          Earn KES 50 for every consumer you refer who upgrades to a paid plan. Add the M-Pesa number
          where you'd like monthly payouts (minimum KES 1,000).
        </p>
        <div className="bg-white rounded-2xl border border-sand p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-dark/40">M-Pesa payout number</span>
            <input value={payoutPhone} onChange={e => setPayoutPhone(e.target.value)} placeholder="+254…"
              className="border-0 border-b border-sand bg-transparent text-dark py-2 text-base w-full focus:outline-none focus:border-brand" />
          </label>
          <button onClick={enroll} disabled={enrolling || !payoutPhone.trim()}
            className="w-full bg-brand text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-40">
            {enrolling ? 'Joining…' : 'Join & get my link'}
          </button>
        </div>
      </div>
    )
  }

  // ── Dashboard ──
  const c = data.counters
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-light text-dark">Your reseller dashboard</h1>
        <p className="text-sm text-mid/60">Payouts to {data.payoutPhone} · monthly, min KES 1,000.</p>
      </div>

      {/* Share link + QR */}
      <div className="bg-white rounded-2xl border border-sand p-5 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 w-full">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim mb-2">Your referral link</p>
          <div className="flex items-center gap-2 bg-sand rounded-lg px-3 py-2.5">
            <span className="text-sm text-dark truncate flex-1">{data.shareUrl}</span>
            <button onClick={copyLink} className="text-xs font-semibold text-brand shrink-0">{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
          <p className="text-xs text-mid/50 mt-2">Expires in {daysLeft(data.expiresAt)} days.</p>
          <button onClick={regenerate} disabled={regenerating} className="text-xs text-brand underline mt-3 disabled:opacity-40">
            {regenerating ? 'Generating…' : 'Generate a new code'}
          </button>
        </div>
        {qrDataUrl && (
          <div className="text-center">
            <img src={qrDataUrl} alt="Referral QR code" className="w-40 h-40 rounded-lg" />
            <a href={qrDataUrl} download="style-yangu-referral-qr.png" className="text-xs text-brand underline mt-1 inline-block">
              Download QR
            </a>
          </div>
        )}
      </div>

      {/* Referral counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total clicks" value={String(c.totalClicks)} />
        <Stat label="Joined" value={String(c.totalJoined)} />
        <Stat label="Awaiting upgrade" value={String(c.awaitingUpgrade)} />
        <Stat label="Upgraded this month" value={String(c.upgradedThisMonth)} />
      </div>

      {/* Earnings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Earned this month" value={KES(data.earnedThisMonthKES)} accent />
        <Stat label="Total earned" value={KES(data.totalEarnedKES)} />
        <Stat label="Total paid out" value={KES(data.totalPaidKES)} />
        <Stat label="Conversion rate" value={`${data.conversionRate}%`} />
      </div>

      <p className="text-xs text-mid/50">
        Earnings are credited only when a referred user subscribes to a paid plan. M-Pesa payouts activate at launch.
      </p>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-gold bg-gold/10' : 'border-sand bg-white'}`}>
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-mid/50">{label}</p>
      <p className="font-display text-2xl text-dark mt-1 leading-none">{value}</p>
    </div>
  )
}
