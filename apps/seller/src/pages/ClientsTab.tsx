import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import ClientCard from '../components/ClientCard'
import type { SellerClient } from '@style-yangu/types'

export default function ClientsTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')

  const { data: clients = [] } = useQuery<SellerClient[]>({
    queryKey: ['clients'],
    queryFn: () => sellerApi.get('/seller/clients'),
  })

  const filtered = clients.filter(c =>
    c.nickname.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAddClient() {
    await sellerApi.post('/seller/clients', { consumerUsername: username, nickname })
    qc.invalidateQueries({ queryKey: ['clients'] })
    setShowSheet(false)
    setUsername('')
    setNickname('')
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <input
          placeholder="Search clients"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => setShowSheet(true)}
          className="px-3 py-2 bg-amber-800 text-white rounded-lg text-sm font-semibold"
        >
          Add client
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(client => (
          <Link key={client.id} to={`/clients/${client.id}`}>
            <ClientCard client={client} />
          </Link>
        ))}
      </div>

      {showSheet && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowSheet(false)}>
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Add client</h3>
            <input
              placeholder="@username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <input
              placeholder="Nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              onClick={handleAddClient}
              disabled={!username || !nickname}
              className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
