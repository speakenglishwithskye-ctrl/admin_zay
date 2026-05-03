'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminSalesPage() {
  const [sales, setSales]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [dark, setDark]             = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [confirmId, setConfirmId]   = useState<string | null>(null)

  // Filters
  const [agentFilter, setAgentFilter]       = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const fetchSales = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('sales')
      .select('id, created_at, total_amount, status, customer_name, customer_address, customer_phone, users_profiles(full_name)')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })

    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59')

    const { data } = await q
    setSales(data ?? [])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { fetchSales() }, [fetchSales])

  const filtered = sales.filter(s => {
    const agentOk    = !agentFilter    || (s.users_profiles?.full_name ?? '').toLowerCase().includes(agentFilter.toLowerCase())
    const customerOk = !customerFilter || (s.customer_name ?? '').toLowerCase().includes(customerFilter.toLowerCase())
    return agentOk && customerOk
  })

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await supabase.from('sales').delete().eq('id', id)
    setConfirmId(null)
    setDeleting(null)
    fetchSales()
  }

  const clearFilters = () => {
    setAgentFilter(''); setCustomerFilter(''); setDateFrom(''); setDateTo('')
  }

  const hasFilters = agentFilter || customerFilter || dateFrom || dateTo
  const showCustomerCols = !!customerFilter

  // Styles
  const bg      = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const textMain= dark ? 'text-gray-100' : 'text-gray-900'
  const textSub = dark ? 'text-gray-400' : 'text-gray-500'
  const divider = dark ? 'border-gray-700' : 'border-gray-200'
  const inp     = `border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${dark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`
  const filterBg= dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className={`text-xl font-semibold ${textMain}`}>Voucher History</h1>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors min-h-[44px] ${hasFilters ? 'bg-blue-600 text-white border-blue-600' : bg + ' ' + textSub}`}>
          🔍 Filters {hasFilters && `(${[agentFilter,customerFilter,dateFrom,dateTo].filter(Boolean).length})`}
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className={`border rounded-xl p-4 mb-4 space-y-3 ${filterBg}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={`text-xs font-medium mb-1 block ${textSub}`}>By Agent</label>
              <input value={agentFilter} onChange={e => setAgentFilter(e.target.value)} placeholder="Agent name..." className={`${inp} w-full`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${textSub}`}>By Customer</label>
              <input value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} placeholder="Customer name..." className={`${inp} w-full`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${textSub}`}>Date From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${inp} w-full`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${textSub}`}>Date To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`${inp} w-full`} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchSales} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 min-h-[44px]">Apply</button>
            {hasFilters && <button onClick={clearFilters} className={`px-4 py-2 text-sm rounded-lg border min-h-[44px] ${bg} ${textSub}`}>Clear</button>}
          </div>
        </div>
      )}

      {/* Table */}
      <div className={`border rounded-xl overflow-hidden ${bg}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className={`border-b ${divider} ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <th className={`text-left px-4 py-3 text-xs font-medium ${textSub}`}>Voucher #</th>
                <th className={`text-left px-4 py-3 text-xs font-medium ${textSub}`}>Agent</th>
                {showCustomerCols && <>
                  <th className={`text-left px-4 py-3 text-xs font-medium ${textSub}`}>Customer</th>
                  <th className={`text-left px-4 py-3 text-xs font-medium ${textSub}`}>Phone</th>
                  <th className={`text-left px-4 py-3 text-xs font-medium ${textSub}`}>Address</th>
                </>}
                <th className={`text-right px-4 py-3 text-xs font-medium ${textSub}`}>Total</th>
                <th className={`text-left px-4 py-3 text-xs font-medium ${textSub}`}>Date</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={showCustomerCols ? 8 : 5} className={`px-4 py-10 text-center ${textSub}`}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={showCustomerCols ? 8 : 5} className={`px-4 py-10 text-center ${textSub}`}>No vouchers found</td></tr>
              ) : filtered.map(sale => (
                <tr key={sale.id} className={`border-b ${divider} hover:${dark ? 'bg-gray-700/30' : 'bg-gray-50'} transition-colors`}>
                  <td className={`px-4 py-3 font-mono text-xs ${textSub}`}>
                    RCP-{sale.id.slice(-6).toUpperCase()}
                  </td>
                  <td className={`px-4 py-3 ${textMain}`}>{sale.users_profiles?.full_name ?? '—'}</td>
                  {showCustomerCols && <>
                    <td className={`px-4 py-3 ${textMain}`}>{sale.customer_name ?? '—'}</td>
                    <td className={`px-4 py-3 ${textSub}`}>{sale.customer_phone ?? '—'}</td>
                    <td className={`px-4 py-3 ${textSub} max-w-[140px] truncate`}>{sale.customer_address ?? '—'}</td>
                  </>}
                  <td className={`px-4 py-3 text-right font-medium ${textMain}`}>{sale.total_amount?.toLocaleString()}</td>
                  <td className={`px-4 py-3 ${textSub} whitespace-nowrap`}>{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => router.push(`/receipt/${sale.id}`)}
                        className="text-xs text-blue-600 hover:underline min-h-[36px] px-1">View →</button>
                      <button onClick={() => setConfirmId(sale.id)}
                        className="text-xs text-red-500 hover:text-red-700 min-h-[36px] px-1" title="Delete voucher">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-xl p-6 w-full max-w-sm shadow-xl ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-sm font-semibold mb-2 ${textMain}`}>Delete Voucher?</p>
            <p className={`text-xs mb-5 ${textSub}`}>This will permanently delete voucher RCP-{confirmId.slice(-6).toUpperCase()} and cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(confirmId)} disabled={deleting === confirmId}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 min-h-[44px]">
                {deleting === confirmId ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button onClick={() => setConfirmId(null)}
                className={`flex-1 py-2.5 text-sm rounded-lg border min-h-[44px] ${bg} ${textMain}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}