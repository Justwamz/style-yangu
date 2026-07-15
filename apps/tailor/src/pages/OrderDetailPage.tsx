import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { artisanApi, useArtisanContext } from '../context/ArtisanContext'
import type { ArtisanOrder, ArtisanOrderStatus, ArtisanMeasurements } from '@style-yangu/types'
import { STATUS_META } from './OrdersTab'

type OrderDetail = ArtisanOrder & { escrow: { status: string; amountKES: number } | null }

const NEXT_STATUS: Partial<Record<ArtisanOrderStatus, { next: ArtisanOrderStatus; label: string }>> = {
  received:             { next: 'in_progress',          label: 'Start work' },
  in_progress:          { next: 'ready_for_collection', label: 'Mark ready for collection' },
  ready_for_collection: { next: 'collected',            label: 'Mark collected' },
}

const MEASURE_LABELS: Record<keyof ArtisanMeasurements, string> = {
  bust: 'Bust', waist: 'Waist', hips: 'Hips', length: 'Length', shoulder: 'Shoulder',
  footLength: 'Foot length', footWidth: 'Foot width', lastWidth: 'Last width',
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useArtisanContext()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const { data: order, isLoading } = useQuery({
    queryKey: ['artisan-order', id],
    queryFn: () => artisanApi.get<OrderDetail>(`/artisan/orders/${id}`),
    enabled: !!id,
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['artisan-order', id] })
    qc.invalidateQueries({ queryKey: ['artisan-orders'] })
    qc.invalidateQueries({ queryKey: ['artisan-dashboard'] })
  }

  async function advance(next: ArtisanOrderStatus) {
    setBusy(true); setError('')
    try {
      await artisanApi.patch(`/artisan/orders/${id}`, { status: next })
      invalidate()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setBusy(false)
    }
  }

  async function uploadPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setBusy(true); setError('')
    try {
      const photos = await Promise.all(files.slice(0, 6).map(fileToDataUrl))
      await artisanApi.post(`/artisan/orders/${id}/photos`, { photos })
      invalidate()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload photos')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  async function releaseEscrow() {
    setBusy(true); setError('')
    try {
      await artisanApi.post(`/artisan/orders/${id}/escrow/release`, {})
      invalidate()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to release escrow')
    } finally {
      setBusy(false)
    }
  }

  function notifyWhatsApp() {
    if (!order) return
    const shop = profile?.businessName ?? 'our workshop'
    const name = order.nickname || order.consumerUsername
    let msg: string
    if (order.status === 'ready_for_collection') {
      msg = `Hi ${name}, your order at ${shop} is ready for collection. Balance due: KES ${order.balanceDueKES.toLocaleString()}. Powered by Style Yangu.`
    } else {
      const date = order.promisedDate ? new Date(order.promisedDate).toLocaleDateString() : 'soon'
      msg = `Hi ${name}, your order has been received at ${shop}. Expected: ${date}. Powered by Style Yangu.`
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (isLoading || !order) {
    return <div className="p-5 max-w-lg mx-auto"><p className="text-sm text-mid/60 py-8 text-center">Loading…</p></div>
  }

  const meta = STATUS_META[order.status]
  const next = NEXT_STATUS[order.status]
  const measures = Object.entries(order.measurements ?? {}).filter(([, v]) => v != null && v !== undefined)
  const photos = order.completionPhotos ?? []

  return (
    <div className="p-5 max-w-lg mx-auto flex flex-col gap-4">
      <button onClick={() => navigate('/orders')} className="text-sm text-mid/60 hover:text-dark self-start">← Orders</button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-light text-dark">{order.nickname || order.consumerUsername}</h1>
          <p className="text-xs text-mid/50">@{order.consumerUsername}</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
          style={{ color: meta.color, backgroundColor: `${meta.color}1A` }}>
          {meta.label}
        </span>
      </div>

      {/* Brief */}
      <Card title="Brief">
        {(order.brief?.avatarRenderUrl || order.brief?.fabricPhotoUrl) && (
          <div className="flex gap-2 mb-3">
            {order.brief?.avatarRenderUrl && (
              <img src={order.brief.avatarRenderUrl} alt="Design render" className="w-28 aspect-[3/4] object-cover rounded-lg" />
            )}
            {order.brief?.fabricPhotoUrl && (
              <img src={order.brief.fabricPhotoUrl} alt="Fabric" className="w-28 aspect-square object-cover rounded-lg" />
            )}
          </div>
        )}
        <Row k="Item" v={order.brief?.silhouette} />
        <Row k="Occasion" v={order.brief?.occasion} />
        <Row k="Fabric" v={order.brief?.fabricDescription} />
        <Row k="Fabric source" v={order.fabricSource ?? undefined} />
        <Row k="Instructions" v={order.brief?.specialInstructions} />
        <Row k="Promised" v={order.promisedDate ? new Date(order.promisedDate).toLocaleDateString() : undefined} />
      </Card>

      {/* Measurements */}
      {measures.length > 0 && (
        <Card title="Measurements (cm)">
          <div className="grid grid-cols-3 gap-2">
            {measures.map(([k, v]) => (
              <div key={k} className="bg-sand rounded-lg px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-mid/50">{MEASURE_LABELS[k as keyof ArtisanMeasurements] ?? k}</p>
                <p className="text-sm font-semibold text-dark">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payment + escrow */}
      <Card title="Payment">
        <Row k="Deposit paid" v={`KES ${order.depositPaidKES.toLocaleString()}`} />
        <Row k="Balance due" v={`KES ${order.balanceDueKES.toLocaleString()}`} />
        {order.escrow && (
          <div className="mt-2 flex items-center justify-between bg-sand rounded-lg px-3 py-2">
            <span className="text-xs text-mid/70">
              Escrow: <span className="font-semibold text-dark capitalize">{order.escrow.status}</span> · KES {order.escrow.amountKES.toLocaleString()}
            </span>
            {order.escrow.status === 'holding' && (
              <button onClick={releaseEscrow} disabled={busy} className="text-xs text-brand font-semibold underline disabled:opacity-40">
                Release
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Completion photos */}
      <Card title="Completion photos">
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {photos.map((p, i) => <img key={i} src={p} alt={`Completion ${i + 1}`} className="aspect-square object-cover rounded-lg" />)}
          </div>
        ) : (
          <p className="text-xs text-mid/50 mb-2">Required before marking an order ready for collection.</p>
        )}
        {photos.length < 6 && (
          <label className="inline-block text-sm text-brand underline cursor-pointer">
            + Add photos
            <input type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} disabled={busy} />
          </label>
        )}
      </Card>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {next && (
          <button onClick={() => advance(next.next)} disabled={busy}
            className="w-full bg-brand text-white rounded-xl py-4 font-semibold text-sm tracking-wider disabled:opacity-40">
            {next.label}
          </button>
        )}
        <button onClick={notifyWhatsApp} className="w-full border border-sand rounded-xl py-3.5 text-sm text-dark">
          Notify customer on WhatsApp
        </button>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-sand p-4">
      <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim mb-2">{title}</p>
      {children}
    </div>
  )
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-sand/60 last:border-0">
      <span className="text-xs text-mid/50">{k}</span>
      <span className="text-sm text-dark text-right">{v}</span>
    </div>
  )
}
