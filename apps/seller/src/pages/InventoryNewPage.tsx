import { useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { sellerApi, useSellerContext } from '../context/SellerContext'
import FaceLibraryPicker from '../components/FaceLibraryPicker'
import ShowcaseResult from '../components/ShowcaseResult'
import { useGenerateShowcase } from '../hooks/useGenerateShowcase'
import { getShowcaseMode } from '../hooks/useShowcaseMode'
import type { ItemCategory } from '@style-yangu/types'

type OccasionTag = 'casual' | 'office' | 'date' | 'wedding' | 'evening' | 'rain' | 'heat'
const OCCASION_TAGS: OccasionTag[] = ['casual', 'office', 'date', 'wedding', 'evening', 'rain', 'heat']

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']

const CLOTHING_CATS: ItemCategory[] = ['top', 'bottom', 'dress', 'suit', 'outerwear', 'jumpsuit']
const SHOE_CATS: ItemCategory[] = ['shoe']

interface State {
  step: number
  photoFile: File | null
  previewUrl: string | null
  name: string
  category: ItemCategory | ''
  priceKES: string
  occasionTags: OccasionTag[]
  sizes: { size: string; quantity: number }[]
  discountPercent: string
  discountExpiresAt: string
  selectedFaceId: string | null
  newItemId: string | null
  showcaseUrl: string | null
}

type Action =
  | { type: 'SET_PHOTO'; file: File; previewUrl: string }
  | { type: 'SET_FIELD'; field: keyof State; value: unknown }
  | { type: 'TOGGLE_TAG'; tag: OccasionTag }
  | { type: 'TOGGLE_SIZE'; size: string }
  | { type: 'SET_QTY'; size: string; qty: number }
  | { type: 'NEXT_STEP' }
  | { type: 'SET_ITEM_ID'; id: string }
  | { type: 'SET_SHOWCASE'; url: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PHOTO':
      return { ...state, photoFile: action.file, previewUrl: action.previewUrl }
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'TOGGLE_TAG':
      return {
        ...state,
        occasionTags: state.occasionTags.includes(action.tag)
          ? state.occasionTags.filter(t => t !== action.tag)
          : [...state.occasionTags, action.tag],
      }
    case 'TOGGLE_SIZE':
      return {
        ...state,
        sizes: state.sizes.find(s => s.size === action.size)
          ? state.sizes.filter(s => s.size !== action.size)
          : [...state.sizes, { size: action.size, quantity: 1 }],
      }
    case 'SET_QTY':
      return {
        ...state,
        sizes: state.sizes.map(s => s.size === action.size ? { ...s, quantity: action.qty } : s),
      }
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 }
    case 'SET_ITEM_ID':
      return { ...state, newItemId: action.id }
    case 'SET_SHOWCASE':
      return { ...state, showcaseUrl: action.url }
    default:
      return state
  }
}

const INITIAL: State = {
  step: 0, photoFile: null, previewUrl: null, name: '', category: '',
  priceKES: '', occasionTags: [], sizes: [], discountPercent: '', discountExpiresAt: '',
  selectedFaceId: null, newItemId: null, showcaseUrl: null,
}

export default function InventoryNewPage() {
  const navigate = useNavigate()
  const { profile, refresh } = useSellerContext()
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const { generate, generating } = useGenerateShowcase()

  const capReached =
    profile !== null &&
    profile.tier !== 'brand' &&
    profile.tier !== 'enterprise' &&
    profile.generationsUsed >= profile.generationsLimit

  async function handleSaveItem() {
    const res = await sellerApi.post<{ id: string }>('/seller/inventory', {
      name: state.name,
      category: state.category,
      priceKES: Number(state.priceKES),
      occasionTags: state.occasionTags,
      sizes: state.sizes,
      discountPercent: state.discountPercent ? Number(state.discountPercent) : null,
      discountExpiresAt: state.discountExpiresAt || null,
    })
    dispatch({ type: 'SET_ITEM_ID', id: res.id })
    dispatch({ type: 'NEXT_STEP' })
  }

  async function handleGenerate() {
    if (!state.newItemId || !state.category) return
    const mode = getShowcaseMode(state.category as ItemCategory)
    const url = await generate({
      itemId: state.newItemId,
      itemName: state.name,
      mode,
      faceId: state.selectedFaceId,
    })
    dispatch({ type: 'SET_SHOWCASE', url })
    refresh()
  }

  // Step 0: Photo
  if (state.step === 0) {
    return (
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-4">Step 1 of 4 — Photo</p>
        <label htmlFor="photo-input" className="block text-sm font-medium mb-2">
          Choose photo
        </label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          aria-label="Choose photo"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) dispatch({ type: 'SET_PHOTO', file, previewUrl: URL.createObjectURL(file) })
          }}
          className="mb-4"
        />
        {state.previewUrl && (
          <img src={state.previewUrl} alt="preview" className="w-full rounded-xl mb-4 max-h-64 object-cover" />
        )}
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          disabled={!state.photoFile}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 1: Details
  if (state.step === 1) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500">Step 2 of 4 — Details</p>
        <input
          placeholder="Item name"
          value={state.name}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        <label htmlFor="category-select" className="sr-only">Category</label>
        <select
          id="category-select"
          aria-label="Category"
          value={state.category}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'category', value: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Select category</option>
          {(['top','bottom','dress','suit','outerwear','jumpsuit','hat','headwrap','shoe','bag','jewellery','accessory'] as ItemCategory[]).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Price (KES)"
          value={state.priceKES}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'priceKES', value: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        <div>
          <p className="text-sm font-medium mb-2">Occasion tags</p>
          <div className="flex flex-wrap gap-2">
            {OCCASION_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => dispatch({ type: 'TOGGLE_TAG', tag })}
                className={`px-3 py-1 rounded-full text-sm border ${
                  state.occasionTags.includes(tag)
                    ? 'bg-amber-800 text-white border-amber-800'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          disabled={!state.name || !state.category || !state.priceKES}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 2: Sizes
  if (state.step === 2) {
    const cat = state.category as ItemCategory
    const isClothing = CLOTHING_CATS.includes(cat)
    const isShoe = SHOE_CATS.includes(cat)
    const sizeOptions = isClothing ? CLOTHING_SIZES : isShoe ? SHOE_SIZES : ['One size']

    return (
      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500">Step 3 of 4 — Sizes</p>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map(size => {
            const selected = state.sizes.find(s => s.size === size)
            return (
              <div key={size} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_SIZE', size })}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    selected ? 'bg-amber-800 text-white border-amber-800' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {size}
                </button>
                {selected && (
                  <input
                    type="number"
                    min={0}
                    value={selected.quantity}
                    onChange={e => dispatch({ type: 'SET_QTY', size, qty: Number(e.target.value) })}
                    className="w-14 border border-gray-300 rounded text-center text-sm py-0.5"
                  />
                )}
              </div>
            )
          })}
        </div>
        <button
          onClick={handleSaveItem}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 3: AI Showcase
  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-gray-500">Step 4 of 4 — AI Showcase</p>

      {capReached ? (
        <p className="text-sm text-red-600">
          0 generations remaining — upgrade to continue
        </p>
      ) : (
        profile && (
          <FaceLibraryPicker
            selectedId={state.selectedFaceId}
            onSelect={id => dispatch({ type: 'SET_FIELD', field: 'selectedFaceId', value: id })}
            tier={profile.tier}
          />
        )
      )}

      {state.showcaseUrl && profile ? (
        <ShowcaseResult
          imageUrl={state.showcaseUrl}
          itemName={state.name}
          priceKES={Number(state.priceKES)}
          itemId={state.newItemId!}
          tier={profile.tier}
          onPublish={() => navigate('/inventory')}
        />
      ) : (
        <button
          aria-label="Generate showcase"
          onClick={handleGenerate}
          disabled={capReached || generating || !state.selectedFaceId}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate showcase'}
        </button>
      )}
    </div>
  )
}
