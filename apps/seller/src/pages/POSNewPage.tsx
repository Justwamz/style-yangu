import { useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi, useSellerContext } from '../context/SellerContext'
import type { InventoryItem, SellerClient } from '@style-yangu/types'

type PaymentMethod = 'mpesa' | 'cash' | 'bank_transfer' | 'card'
type PaymentStatus = 'paid' | 'partially_paid' | 'owing'

interface State {
  step: number
  selectedItemId: string | null
  customItemName: string
  listedPriceKES: number
  finalPriceKES: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  selectedClientId: string | null
}

const INITIAL: State = {
  step: 0, selectedItemId: null, customItemName: '', listedPriceKES: 0,
  finalPriceKES: 0, paymentMethod: 'mpesa', paymentStatus: 'paid', selectedClientId: null,
}

type Action =
  | { type: 'SELECT_ITEM'; item: InventoryItem }
  | { type: 'SET_CUSTOM_NAME'; name: string }
  | { type: 'SET_FINAL_PRICE'; price: number }
  | { type: 'SET_PAYMENT_METHOD'; method: PaymentMethod }
  | { type: 'SET_PAYMENT_STATUS'; status: PaymentStatus }
  | { type: 'SELECT_CLIENT'; id: string }
  | { type: 'NEXT_STEP' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT_ITEM':
      return { ...state, selectedItemId: action.item.id, customItemName: action.item.name, listedPriceKES: action.item.priceKES, finalPriceKES: action.item.priceKES }
    case 'SET_CUSTOM_NAME':
      return { ...state, customItemName: action.name, selectedItemId: null }
    case 'SET_FINAL_PRICE':
      return { ...state, finalPriceKES: action.price }
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.method }
    case 'SET_PAYMENT_STATUS':
      return { ...state, paymentStatus: action.status }
    case 'SELECT_CLIENT':
      return { ...state, selectedClientId: action.id }
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 }
    default:
      return state
  }
}

function buildWhatsAppReceipt(
  nickname: string,
  businessName: string,
  itemName: string,
  amount: number,
  method: string,
  date: string
): string {
  return encodeURIComponent(
    `Hi ${nickname}, thank you for your purchase from ${businessName}.\nItem: ${itemName}\nAmount paid: KES ${amount.toLocaleString()}\nPayment: ${method}\nDate: ${date}\nQuestions? Reply to this message.\nPowered by Style Yangu`
  )
}

export default function POSNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useSellerContext()
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const [itemSearch, setItemSearch] = useState('')

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: () => sellerApi.get('/seller/inventory'),
  })
  const { data: clients = [] } = useQuery<SellerClient[]>({
    queryKey: ['clients'],
    queryFn: () => sellerApi.get('/seller/clients'),
  })

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  )

  async function handleConfirm(clientId: string | null) {
    await sellerApi.post('/seller/pos/transactions', {
      itemId: state.selectedItemId,
      itemName: state.customItemName,
      listedPriceKES: state.listedPriceKES,
      finalPriceKES: state.finalPriceKES,
      paymentMethod: state.paymentMethod,
      paymentStatus: state.paymentStatus,
      clientId,
    })
    queryClient.invalidateQueries({ queryKey: ['pos'] })
    navigate('/pos')
  }

  // Step 0: Item selection
  if (state.step === 0) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">Step 1 of 4 — Item</p>
        <input
          placeholder="Search or type item name"
          value={itemSearch}
          onChange={e => {
            setItemSearch(e.target.value)
            if (e.target.value) dispatch({ type: 'SET_CUSTOM_NAME', name: e.target.value })
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredInventory.map(item => (
            <button
              key={item.id}
              onClick={() => dispatch({ type: 'SELECT_ITEM', item })}
              className={`w-full text-left p-2 rounded-lg border ${
                state.selectedItemId === item.id ? 'border-amber-700 bg-amber-50' : 'border-gray-200'
              }`}
            >
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-gray-500">KES {item.priceKES.toLocaleString()}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          disabled={!state.customItemName}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 1: Price
  if (state.step === 1) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">Step 2 of 4 — Price</p>
        <p className="text-sm text-gray-600">Listed price: KES {state.listedPriceKES.toLocaleString()}</p>
        <label className="block text-sm font-medium">Negotiated price (KES)</label>
        <input
          type="number"
          value={state.finalPriceKES || ''}
          onChange={e => dispatch({ type: 'SET_FINAL_PRICE', price: Number(e.target.value) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          disabled={state.finalPriceKES === undefined || state.finalPriceKES === null}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 2: Payment
  if (state.step === 2) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500">Step 3 of 4 — Payment</p>
        <div>
          <p className="text-sm font-medium mb-2">Payment method</p>
          {(['mpesa', 'cash', 'bank_transfer', 'card'] as PaymentMethod[]).map(method => (
            <label key={method} className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="method"
                value={method}
                checked={state.paymentMethod === method}
                onChange={() => dispatch({ type: 'SET_PAYMENT_METHOD', method })}
                aria-label={method === 'mpesa' ? 'M-Pesa' : method === 'bank_transfer' ? 'Bank Transfer' : method.charAt(0).toUpperCase() + method.slice(1)}
              />
              <span className="text-sm capitalize">{method === 'mpesa' ? 'M-Pesa' : method.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Payment status</p>
          {([['paid', 'Paid'], ['partially_paid', 'Partially Paid'], ['owing', 'Owing']] as [PaymentStatus, string][]).map(([status, label]) => (
            <label key={status} className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="status"
                value={status}
                checked={state.paymentStatus === status}
                onChange={() => dispatch({ type: 'SET_PAYMENT_STATUS', status })}
                aria-label={label}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 3: Client (optional)
  const selectedClient = clients.find(c => c.id === state.selectedClientId)
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-gray-500">Step 4 of 4 — Attach client (optional)</p>
      <p className="text-sm text-gray-600">Link a client to this sale</p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {clients.map(client => (
          <button
            key={client.id}
            onClick={() => dispatch({ type: 'SELECT_CLIENT', id: client.id })}
            className={`w-full text-left p-2 rounded-lg border ${
              state.selectedClientId === client.id ? 'border-amber-700 bg-amber-50' : 'border-gray-200'
            }`}
          >
            <p className="text-sm font-medium">{client.nickname}</p>
            <p className="text-xs text-gray-500">{client.consumerUsername}</p>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleConfirm(state.selectedClientId)}
          className="flex-1 bg-amber-800 text-white rounded-lg py-3 font-semibold"
        >
          Confirm
        </button>
        <button
          onClick={() => handleConfirm(null)}
          className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-3 font-semibold"
        >
          Skip
        </button>
      </div>
      {selectedClient?.whatsappNumber && (
        <button
          onClick={() => {
            const today = new Date().toLocaleDateString('en-KE')
            const text = buildWhatsAppReceipt(
              selectedClient.nickname, profile?.businessName ?? 'Style Yangu Seller',
              state.customItemName, state.finalPriceKES, state.paymentMethod, today
            )
            window.open(`https://wa.me/${selectedClient?.whatsappNumber ?? ''}?text=${text}`, '_blank')
          }}
          className="w-full border border-green-600 text-green-700 rounded-lg py-2 text-sm"
        >
          Send WhatsApp Receipt
        </button>
      )}
    </div>
  )
}
