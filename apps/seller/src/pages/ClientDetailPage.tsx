import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import type { SellerClient, InventoryItem, POSTransaction } from '@style-yangu/types'

interface ClientDetail extends SellerClient {
  tryOnLimit: number
  tryOnUsedThisMonth: number
  purchaseHistory: POSTransaction[]
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const { data: client, isLoading } = useQuery<ClientDetail>({
    queryKey: ['clients', id],
    queryFn: () => sellerApi.get(`/seller/clients/${id}`),
  })

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: () => sellerApi.get('/seller/inventory'),
    enabled: showPicker,
  })

  if (isLoading || !client) return <p className="p-4 text-gray-400">Loading…</p>

  const remaining = client.tryOnLimit - client.tryOnUsedThisMonth
  const atLimit = remaining <= 0

  async function handleSend() {
    if (!selectedItemId) return
    await sellerApi.post(`/seller/clients/${id}/try-on`, { itemId: selectedItemId, note: note || null })
    qc.invalidateQueries({ queryKey: ['clients', id] })
    setShowPicker(false)
    setSelectedItemId(null)
    setNote('')
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">{client.nickname}</h2>
        <p className="text-sm text-gray-400">{client.consumerUsername}</p>
      </div>

      <div className="flex gap-4 text-sm text-gray-600">
        <span>{client.tryOnSent} try-ons sent</span>
        <span>{client.tryOnActed} acted</span>
      </div>

      <div className={`text-sm ${atLimit ? 'text-red-600' : 'text-gray-600'}`}>
        {remaining} of {client.tryOnLimit} sends remaining this month
      </div>

      <button
        onClick={() => setShowPicker(true)}
        disabled={atLimit}
        className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
      >
        Send item
      </button>

      {atLimit && (
        <p className="text-xs text-center text-gray-400">Upgrade your plan to send more items this month.</p>
      )}

      {client.purchaseHistory.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Purchase history</p>
          {client.purchaseHistory.map(tx => (
            <div key={tx.id} className="flex justify-between text-sm py-1 border-b border-gray-100">
              <span>{tx.itemName}</span>
              <span className="text-gray-500">KES {tx.finalPriceKES.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowPicker(false)}>
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Choose item to send</h3>
            <div className="space-y-2">
              {(inventory as InventoryItem[]).filter(i => i.isLive).map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`w-full text-left p-3 rounded-lg border ${
                    selectedItemId === item.id ? 'border-amber-700 bg-amber-50' : 'border-gray-200'
                  }`}
                >
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">KES {item.priceKES.toLocaleString()}</p>
                </button>
              ))}
            </div>
            <textarea
              placeholder="Optional note…"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!selectedItemId}
              className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
