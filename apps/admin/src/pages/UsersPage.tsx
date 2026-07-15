import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api'
import type { AdminUserRow, AccountStatus } from '@style-yangu/types'

const KINDS: { key: 'consumer' | 'seller' | 'artisan'; label: string }[] = [
  { key: 'seller',   label: 'Sellers' },
  { key: 'artisan',  label: 'Artisans' },
  { key: 'consumer', label: 'Consumers' },
]

const STATUS_COLOR: Record<AccountStatus, string> = {
  active: '#2F7D32', suspended: '#A07830', banned: '#B3261E',
}

export default function UsersPage() {
  const [kind, setKind] = useState<'consumer' | 'seller' | 'artisan'>('seller')
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', kind],
    queryFn: () => adminApi.get<AdminUserRow[]>(`/admin/users?kind=${kind}`),
  })

  async function setStatus(u: AdminUserRow, status: AccountStatus) {
    await adminApi.post(`/admin/accounts/${u.kind}/${u.id}/status`, { status })
    qc.invalidateQueries({ queryKey: ['admin-users', kind] })
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-display text-3xl font-light text-dark mb-1">Users</h1>
      <p className="text-sm text-mid/60 mb-5">Manage accounts and enforce the three-strike policy.</p>

      <div className="flex gap-2 mb-5">
        {KINDS.map(k => (
          <button
            key={k.key}
            onClick={() => setKind(k.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              kind === k.key ? 'bg-brand text-white border-brand' : 'bg-white text-dark/60 border-sand'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-mid/60">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-mid/60">No {kind} accounts.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-sand overflow-hidden">
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-sand' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark truncate">
                  {u.label}
                  {u.verified && <span className="ml-2 text-[10px] text-gold-dim">✓ verified</span>}
                </p>
                <p className="text-xs text-mid/50 truncate">{u.detail}</p>
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                style={{ color: STATUS_COLOR[u.status], backgroundColor: `${STATUS_COLOR[u.status]}1A` }}
              >
                {u.status}
              </span>
              <div className="flex gap-2 shrink-0">
                {u.status !== 'active' && (
                  <button onClick={() => setStatus(u, 'active')} className="text-xs text-green-700 underline">Reactivate</button>
                )}
                {u.status === 'active' && (
                  <button onClick={() => setStatus(u, 'suspended')} className="text-xs text-gold-dim underline">Suspend</button>
                )}
                {u.status !== 'banned' && (
                  <button onClick={() => setStatus(u, 'banned')} className="text-xs text-red-600 underline">Ban</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
