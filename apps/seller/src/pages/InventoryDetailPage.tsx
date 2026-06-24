import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi, useSellerContext } from '../context/SellerContext'
import { useGenerateShowcase } from '../hooks/useGenerateShowcase'
import { getShowcaseMode } from '../hooks/useShowcaseMode'
import type { InventoryItem, ItemCategory } from '@style-yangu/types'

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useSellerContext()
  const { generate, generating } = useGenerateShowcase()

  const { data: item, isLoading } = useQuery<InventoryItem>({
    queryKey: ['inventory', id],
    queryFn: () => sellerApi.get(`/seller/inventory/${id}`),
  })

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')

  // Regenerate showcase state
  const [regeneratedUrl, setRegeneratedUrl] = useState<string | null>(null)

  // Stock adjustment state
  const [showStockInput, setShowStockInput] = useState(false)
  const [stockInputVal, setStockInputVal] = useState('')

  async function handleDelete() {
    if (!confirm('Delete this item?')) return
    await sellerApi.delete(`/seller/inventory/${id}`)
    qc.invalidateQueries({ queryKey: ['inventory'] })
    navigate('/inventory')
  }

  function startEditing() {
    if (!item) return
    setEditName(item.name)
    setEditPrice(String(item.priceKES))
    setIsEditing(true)
  }

  async function handleSave() {
    await sellerApi.patch(`/seller/inventory/${id}`, {
      name: editName,
      priceKES: Number(editPrice),
    })
    qc.invalidateQueries({ queryKey: ['inventory'] })
    setIsEditing(false)
  }

  async function handleRegenerate() {
    if (!item || !id) return
    const mode = getShowcaseMode(item.category as ItemCategory)
    const url = await generate({
      itemId: id,
      itemName: item.name,
      mode,
      faceId: null,
    })
    setRegeneratedUrl(url)
  }

  async function handleStockAdjust() {
    await sellerApi.patch(`/seller/inventory/${id}`, {
      stockOverride: Number(stockInputVal),
    })
    qc.invalidateQueries({ queryKey: ['inventory'] })
    setShowStockInput(false)
    setStockInputVal('')
  }

  const capReached =
    (profile?.generationsUsed ?? 0) >= (profile?.generationsLimit ?? 0) &&
    profile?.tier !== 'brand' &&
    profile?.tier !== 'enterprise'

  if (isLoading || !item) return <p className="p-4 text-mid/50">Loading…</p>

  const totalStock = item.sizes.reduce((sum, s) => sum + s.quantity, 0)

  return (
    <div className="p-4 space-y-4">
      {(regeneratedUrl ?? item.showcaseImageUrl) && (
        <img
          src={regeneratedUrl ?? item.showcaseImageUrl!}
          alt={item.name}
          className="w-full rounded-xl max-h-64 object-cover"
        />
      )}

      {isEditing ? (
        <div className="space-y-2">
          <input
            aria-label="Item name"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="w-full border border-sand rounded-lg px-3 py-2"
          />
          <input
            aria-label="Price KES"
            type="number"
            value={editPrice}
            onChange={e => setEditPrice(e.target.value)}
            className="w-full border border-sand rounded-lg px-3 py-2"
          />
          <button
            onClick={handleSave}
            className="w-full bg-brand text-white rounded-lg py-2 font-semibold"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="w-full border border-sand text-mid rounded-lg py-2"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display">{item.name}</h2>
            <button
              onClick={startEditing}
              className="text-sm border border-brand text-brand rounded-lg px-3 py-1"
            >
              Edit
            </button>
          </div>
          <p className="text-mid/70">KES {item.priceKES.toLocaleString()}</p>
          <p className="text-sm text-mid/50">Category: {item.category}</p>
        </>
      )}

      {/* Regenerate Showcase */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-dark/70">Showcase</h3>
        <button
          onClick={handleRegenerate}
          disabled={capReached || generating}
          className="w-full border border-brand text-brand rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Regenerate Showcase'}
        </button>
        {capReached && (
          <p className="text-xs text-red-500">Generation cap reached — upgrade to continue</p>
        )}
      </div>

      {/* Stock section */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-dark/70">Stock</h3>
        <p className="text-sm text-mid">Total: {totalStock} units</p>
        {showStockInput ? (
          <div className="flex gap-2">
            <input
              aria-label="Stock override"
              type="number"
              value={stockInputVal}
              onChange={e => setStockInputVal(e.target.value)}
              className="flex-1 border border-sand rounded-lg px-3 py-2 text-sm"
              placeholder="New total stock"
            />
            <button
              onClick={handleStockAdjust}
              className="border border-brand text-brand rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowStockInput(true)}
            className="border border-sand text-mid rounded-lg py-2 px-4 text-sm"
          >
            Adjust
          </button>
        )}
      </div>

      <button
        onClick={handleDelete}
        className="w-full border border-red-500 text-red-600 rounded-lg py-2 mt-4"
      >
        Delete item
      </button>
    </div>
  )
}
