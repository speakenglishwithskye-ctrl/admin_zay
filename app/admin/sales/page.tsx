'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminSalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, status, users_profiles(full_name)')
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
      setSales(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = sales.filter(s =>
    (s.users_profiles?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Sales History</h1>

      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by agent name..."
          className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Receipt #</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Agent</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No sales found</td></tr>
              ) : filtered.map(sale => (
                <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/receipt/${sale.id}`)}>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">RCP-{sale.id.slice(-6).toUpperCase()}</td>
                  <td className="px-5 py-3 text-gray-700">{sale.users_profiles?.full_name ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-medium">{sale.total_amount?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-blue-600 text-xs">View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
