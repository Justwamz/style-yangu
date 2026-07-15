import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { artisanApi, useArtisanContext } from '../context/ArtisanContext'
import type { ArtisanMeasurements } from '@style-yangu/types'

const TAILOR_FIELDS: { key: keyof ArtisanMeasurements; label: string }[] = [
  { key: 'bust', label: 'Bust' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'length', label: 'Length' },
  { key: 'shoulder', label: 'Shoulder' },
]
const COBBLER_FIELDS: { key: keyof ArtisanMeasurements; label: string }[] = [
  { key: 'footLength', label: 'Foot length' },
  { key: 'footWidth', label: 'Foot width' },
  { key: 'lastWidth', label: 'Last width' },
]

export default function OrderNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useArtisanContext()
  const measurementFields = profile?.artisanType === 'cobbler' ? COBBLER_FIELDS : TAILOR_FIELDS

  const [consumerUsername, setConsumerUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [silhouette, setSilhouette] = useState('')
  const [occasion, setOccasion] = useState('')
  const [fabricDescription, setFabricDescription] = useState('')
  const [fabricSource, setFabricSource] = useState<'customer' | 'artisan' | ''>('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [measurements, setMeasurements] = useState<ArtisanMeasurements>({})
  const [depositPaidKES, setDepositPaidKES] = useState('')
  const [balanceDueKES, setBalanceDueKES] = useState('')
  const [promisedDate, setPromisedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setMeasure(key: keyof ArtisanMeasurements, value: string) {
    setMeasurements(m => ({ ...m, [key]: value === '' ? undefined : Number(value) }))
  }

  async function submit() {
    if (!consumerUsername.trim()) { setError('Customer username is required.'); return }
    setSaving(true)
    setError('')
    try {
      const { id } = await artisanApi.post<{ id: string }>('/artisan/orders', {
        consumerUsername: consumerUsername.trim(),
        nickname: nickname.trim() || null,
        brief: {
          silhouette: silhouette || undefined,
          occasion: occasion || undefined,
          fabricDescription: fabricDescription || undefined,
          specialInstructions: specialInstructions || undefined,
        },
        fabricSource: fabricSource || null,
        measurements,
        depositPaidKES: depositPaidKES ? parseInt(depositPaidKES) : 0,
        balanceDueKES: balanceDueKES ? parseInt(balanceDueKES) : 0,
        promisedDate: promisedDate || null,
      })
      qc.invalidateQueries({ queryKey: ['artisan-orders'] })
      qc.invalidateQueries({ queryKey: ['artisan-dashboard'] })
      navigate(`/orders/${id}`, { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create order')
      setSaving(false)
    }
  }

  return (
    <div className="p-5 max-w-lg mx-auto flex flex-col gap-5">
      <button onClick={() => navigate('/orders')} className="text-sm text-mid/60 hover:text-dark self-start">← Orders</button>
      <h1 className="font-display text-2xl font-light text-dark">New order</h1>

      <Section title="Customer">
        <Field label="Style Yangu username *"><input className={inputCls} value={consumerUsername} onChange={e => setConsumerUsername(e.target.value)} placeholder="e.g. wanjiku_k" /></Field>
        <Field label="Nickname (private)"><input className={inputCls} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. Jane — blue coat" /></Field>
      </Section>

      <Section title="Design brief">
        <Field label="Silhouette / item"><input className={inputCls} value={silhouette} onChange={e => setSilhouette(e.target.value)} placeholder="e.g. Kitenge wrap dress" /></Field>
        <Field label="Occasion"><input className={inputCls} value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="e.g. Wedding guest" /></Field>
        <Field label="Fabric description"><input className={inputCls} value={fabricDescription} onChange={e => setFabricDescription(e.target.value)} placeholder="e.g. Terracotta ankara, medium cotton" /></Field>
        <Field label="Fabric source">
          <div className="flex gap-2">
            {(['customer', 'artisan'] as const).map(s => (
              <button key={s} type="button" onClick={() => setFabricSource(fabricSource === s ? '' : s)}
                className={`flex-1 py-2 rounded-lg text-sm border capitalize ${fabricSource === s ? 'bg-brand text-white border-brand' : 'bg-white border-sand text-dark/60'}`}>
                {s === 'customer' ? 'Customer-provided' : 'I source it'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Special instructions"><textarea className={inputCls} rows={2} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} /></Field>
      </Section>

      <Section title="Measurements (cm)">
        <div className="grid grid-cols-2 gap-3">
          {measurementFields.map(f => (
            <Field key={f.key} label={f.label}>
              <input type="number" inputMode="decimal" className={inputCls}
                value={measurements[f.key] ?? ''} onChange={e => setMeasure(f.key, e.target.value)} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Payment">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deposit (KES)"><input type="number" inputMode="numeric" className={inputCls} value={depositPaidKES} onChange={e => setDepositPaidKES(e.target.value)} /></Field>
          <Field label="Balance due (KES)"><input type="number" inputMode="numeric" className={inputCls} value={balanceDueKES} onChange={e => setBalanceDueKES(e.target.value)} /></Field>
        </div>
        <Field label="Promised completion date"><input type="date" className={inputCls} value={promisedDate} onChange={e => setPromisedDate(e.target.value)} /></Field>
        {depositPaidKES && parseInt(depositPaidKES) > 0 && (
          <p className="text-xs text-mid/60">The deposit is held in escrow and released when the order is collected.</p>
        )}
      </Section>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button onClick={submit} disabled={saving} className="w-full bg-brand text-white rounded-xl py-4 font-semibold text-sm tracking-wider disabled:opacity-40">
        {saving ? 'Creating…' : 'Create order'}
      </button>
    </div>
  )
}

const inputCls =
  'border-0 border-b border-sand bg-transparent text-dark py-2 text-base w-full focus:outline-none focus:border-brand transition-colors placeholder:text-mid/25'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-sand p-4 flex flex-col gap-3">
      <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-dark/40">{label}</span>
      {children}
    </label>
  )
}
