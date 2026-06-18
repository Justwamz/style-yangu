import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@style-yangu/api-client'
import { useProfileContext } from '../context/ProfileContext'
import { useStreak } from '../hooks/useStreak'
import { useReferral } from '../hooks/useReferral'

type NotifFreq = 'immediate' | 'daily' | 'weekly'

const NOTIF_OPTIONS: { value: NotifFreq; label: string }[] = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'daily',     label: 'Daily Digest' },
  { value: 'weekly',    label: 'Weekly Roundup' },
]

export default function ProfileTab() {
  const navigate = useNavigate()
  const { profile } = useProfileContext()
  const { streak } = useStreak()
  const { referral } = useReferral()
  const [notifFreq, setNotifFreq] = useState<NotifFreq>('immediate')

  const stylistName = profile?.stylistName ?? 'amara'
  const stylistDisplay = stylistName.charAt(0).toUpperCase() + stylistName.slice(1)

  async function handleNotifChange(freq: NotifFreq) {
    setNotifFreq(freq)
    await apiClient.patch('/consumer/preferences', { notificationFrequency: freq }).catch(() => undefined)
  }

  function signOut() {
    localStorage.removeItem('sy_token')
    localStorage.removeItem('sy_user_id')
    navigate('/onboarding')
  }

  async function shareReferral() {
    if (!referral) return
    const text = `Join me on Style Yangu — your personal AI stylist! ${referral.shareUrl}`
    if (navigator.share) {
      await navigator.share({ title: 'Join Style Yangu', text }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(text).catch(() => undefined)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-5 pb-8">
      <div className="flex items-center gap-4 bg-white rounded-2xl border border-[#E8DDD5] p-4">
        <div className="w-16 h-16 rounded-full bg-[#F5EDE5] border-2 border-[#E8DDD5] flex items-center justify-center text-2xl">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
          ) : '👤'}
        </div>
        <div>
          <p className="font-bold text-[#1A0A00]">My Style</p>
          <p className="text-sm text-[#1A0A00]/60">Styled by {stylistDisplay}</p>
          <span className="text-xs bg-[#F5EDE5] text-[#8B4513] px-2 py-0.5 rounded-full mt-1 inline-block">
            {profile?.tier === 'premium' ? 'Premium' : 'Free'}
          </span>
        </div>
      </div>

      {streak && (
        <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4">
          <p className="font-bold text-[#1A0A00] mb-3">Style Stats</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F5EDE5] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#8B4513]">🔥 {streak.streakDays}</p>
              <p className="text-xs text-[#1A0A00]/60 mt-0.5">Day streak</p>
            </div>
            <div className="bg-[#F5EDE5] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#8B4513]">{streak.stylePoints}</p>
              <p className="text-xs text-[#1A0A00]/60 mt-0.5">Style points</p>
            </div>
            <div className="bg-[#F5EDE5] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#8B4513]">{streak.weeklyScore}/10</p>
              <p className="text-xs text-[#1A0A00]/60 mt-0.5">Weekly score</p>
            </div>
            <div className="bg-[#F5EDE5] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#8B4513]">#{streak.leaderboardRank}</p>
              <p className="text-xs text-[#1A0A00]/60 mt-0.5">Leaderboard</p>
            </div>
          </div>
        </div>
      )}

      {referral && (
        <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4">
          <p className="font-bold text-[#1A0A00] mb-3">Invite Friends</p>
          <div className="bg-[#F5EDE5] rounded-xl p-3 flex items-center justify-between mb-3">
            <span className="font-mono font-bold text-[#8B4513] tracking-widest">{referral.code}</span>
            <button
              onClick={shareReferral}
              className="text-xs bg-[#8B4513] text-white px-3 py-1.5 rounded-lg"
            >
              Share
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total Clicks', value: referral.counters.totalClicks },
              { label: 'Total Joined', value: referral.counters.totalJoined },
              { label: 'Awaiting Upgrade', value: referral.counters.awaitingUpgrade },
              { label: 'Upgraded This Month', value: referral.counters.upgradedThisMonth },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#F5EDE5] rounded-xl p-2.5 text-center">
                <p className="font-bold text-[#1A0A00]">{value}</p>
                <p className="text-xs text-[#1A0A00]/50 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4">
        <p className="font-bold text-[#1A0A00] mb-3">Notifications</p>
        <div className="flex flex-col gap-2">
          {NOTIF_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleNotifChange(value)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                notifFreq === value
                  ? 'border-[#8B4513] bg-[#F5EDE5] text-[#8B4513]'
                  : 'border-[#E8DDD5] text-[#1A0A00]'
              }`}
            >
              <span className="text-sm">{label}</span>
              {notifFreq === value && <span className="text-xs">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={signOut}
        className="w-full border border-red-200 text-red-500 rounded-xl py-3 text-sm font-medium"
      >
        Sign Out
      </button>
    </div>
  )
}
