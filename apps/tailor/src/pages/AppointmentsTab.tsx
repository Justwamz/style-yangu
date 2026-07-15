import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { artisanApi } from '../context/ArtisanContext'
import { useArtisanTier } from '../hooks/useArtisanTier'
import type { ArtisanAppointmentSlot } from '@style-yangu/types'

const STATUS_COLOR: Record<string, string> = {
  available: '#A07830', booked: '#2F7D32', completed: '#8B4513', cancelled: '#B3261E',
}

export default function AppointmentsTab() {
  const qc = useQueryClient()
  const { allowed, reason } = useArtisanTier('appointments')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['artisan-appointments'],
    queryFn: () => artisanApi.get<ArtisanAppointmentSlot[]>('/artisan/appointments'),
    enabled: allowed,
  })

  async function addSlot() {
    if (!start || !end) return
    setSaving(true)
    try {
      await artisanApi.post('/artisan/appointments', { slotStart: start, slotEnd: end, location: location || null })
      setStart(''); setEnd(''); setLocation('')
      qc.invalidateQueries({ queryKey: ['artisan-appointments'] })
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(id: string, status: string) {
    await artisanApi.patch(`/artisan/appointments/${id}`, { status })
    qc.invalidateQueries({ queryKey: ['artisan-appointments'] })
  }

  if (!allowed) {
    return (
      <div className="p-5 max-w-lg mx-auto">
        <h1 className="font-display text-2xl font-light text-dark mb-4">Appointments</h1>
        <div className="bg-sand rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">📅</p>
          <p className="font-semibold text-dark">Measurement appointments</p>
          <p className="text-sm text-mid/60 mt-1">{reason}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 max-w-lg mx-auto flex flex-col gap-4">
      <h1 className="font-display text-2xl font-light text-dark">Appointments</h1>

      <div className="bg-white rounded-2xl border border-sand p-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim">New availability slot</p>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-dark/40">Start</span>
          <input type="datetime-local" className={inputCls} value={start} onChange={e => setStart(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-dark/40">End</span>
          <input type="datetime-local" className={inputCls} value={end} onChange={e => setEnd(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-dark/40">Location (your workshop)</span>
          <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Ngara, Shop 14" />
        </label>
        <button onClick={addSlot} disabled={saving || !start || !end}
          className="w-full bg-brand text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40">
          {saving ? 'Adding…' : 'Add slot'}
        </button>
        <p className="text-[11px] text-mid/50">Appointments are at your listed business location only — no home visits.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-mid/60 py-8 text-center">Loading…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-mid/60 py-8 text-center">No slots yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {slots.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-sand p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-dark">{new Date(s.slotStart).toLocaleString()}</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ color: STATUS_COLOR[s.status], backgroundColor: `${STATUS_COLOR[s.status]}1A` }}>
                  {s.status}
                </span>
              </div>
              {s.location && <p className="text-xs text-mid/50 mt-0.5">{s.location}</p>}
              {s.consumerUsername && <p className="text-xs text-brand mt-0.5">Booked by @{s.consumerUsername}</p>}
              <div className="flex gap-3 mt-2">
                {s.status === 'booked' && (
                  <button onClick={() => setStatus(s.id, 'completed')} className="text-xs text-brand underline">Mark completed</button>
                )}
                {s.status !== 'cancelled' && s.status !== 'completed' && (
                  <button onClick={() => setStatus(s.id, 'cancelled')} className="text-xs text-red-600 underline">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputCls =
  'border-0 border-b border-sand bg-transparent text-dark py-2 text-base w-full focus:outline-none focus:border-brand transition-colors placeholder:text-mid/25'
