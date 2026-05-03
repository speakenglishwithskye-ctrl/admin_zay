'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminDashboard() {
  const [dark, setDark] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, lowStock: 0 })
  const [recentSales, setRecentSales] = useState<any[]>([])

  // Overview filters (Admin only)
  const [filterDate, setFilterDate]       = useState('')
  const [sortAmount, setSortAmount]       = useState<'none'|'asc'|'desc'>('none')
  const [filterMinAmt, setFilterMinAmt]   = useState('')
  const [filterMaxAmt, setFilterMaxAmt]   = useState('')
  const [filterOpen, setFilterOpen]       = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [todaySales, weekSales, monthSales, lowStock] = await Promise.all([
      supabase.from('sales').select('total_amount').gte('created_at', todayStart).eq('status', 'confirmed'),
      supabase.from('sales').select('total_amount').gte('created_at', weekStart).eq('status', 'confirmed'),
      supabase.from('sales').select('total_amount').gte('created_at', monthStart).eq('status', 'confirmed'),
      supabase.from('products').select('id').lte('stock_quantity', 5),
    ])

    setStats({
      today:    todaySales.data?.reduce((s, r) => s + r.total_amount, 0) ?? 0,
      week:     weekSales.data?.reduce((s, r) => s + r.total_amount, 0) ?? 0,
      month:    monthSales.data?.reduce((s, r) => s + r.total_amount, 0) ?? 0,
      lowStock: lowStock.data?.length ?? 0,
    })

    let q = supabase
      .from('sales')
      .select('id, total_amount, created_at, users_profiles(full_name), customer_name')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(50)

    if (filterDate) {
      q = q.gte('created_at', filterDate).lte('created_at', filterDate + 'T23:59:59')
    }
    if (filterMinAmt) q = q.gte('total_amount', parseFloat(filterMinAmt))
    if (filterMaxAmt) q = q.lte('total_amount', parseFloat(filterMaxAmt))

    const { data } = await q
    let list = data ?? []

    if (sortAmount === 'desc') list = [...list].sort((a,b) => b.total_amount - a.total_amount)
    if (sortAmount === 'asc')  list = [...list].sort((a,b) => a.total_amount - b.total_amount)

    setRecentSales(list)
    setLoading(false)
  }, [filterDate, filterMinAmt, filterMaxAmt, sortAmount])

  useEffect(() => { fetchData() }, [fetchData])

  const clearFilters = () => {
    setFilterDate(''); setSortAmount('none'); setFilterMinAmt(''); setFilterMaxAmt('')
  }
  const hasFilters = filterDate || sortAmount !== 'none' || filterMinAmt || filterMaxAmt

  const kpis = [
    { label: 'Revenue Today',     value: stats.today.toLocaleString() },
    { label: 'Revenue This Week', value: stats.week.toLocaleString() },
    { label: 'Revenue This Month',value: stats.month.toLocaleString() },
    { label: 'Low Stock Alerts',  value: stats.lowStock.toString(), alert: stats.lowStock > 0 },
  ]

  // Styles
  const bg      = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const textMain= dark ? 'text-gray-100' : 'text-gray-900'
  const textSub = dark ? 'text-gray-400' : 'text-gray-500'
  const divider = dark ? 'border-gray-700' : 'border-gray-200'
  const filterBg= dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
  const inp     = `border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${dark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className={`text-xl font-semibold ${textMain}`}>Overview</h1>
        <button onClick={() => setFilterOpen(!filterOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border min-h-[44px] transition-colors ${hasFilters ? 'bg-blue-600 text-white border-blue-600' : bg + ' ' + textSub}`}>
          🔍 Filter Overview {hasFilters && `(${[filterDate, sortAmount !== 'none' ? '1' : '', filterMinAmt, filterMaxAmt].filter(Boolean).length})`}
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className={`border rounded-xl p-4 mb-4 space-y-3 ${filterBg}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={`text-xs font-medium mb-1 block ${textSub}`}>By Date</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className={`${inp} w-full`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${textSub}`}>Sort by Amount</label>
              <select value={sortAmount} onChange={e => setSortAmount(e.target.value as any)} className={`${inp} w-full`}>
                <option value="none">Default (Date)</option>
                <option value="desc">Highest First</option>
                <option value="asc">Lowest First</option>
              </select>
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${textSub}`}>Min Amount</label>
              <input type="number" min="0" placeholder="0" value={filterMinAmt} onChange={e => setFilterMinAmt(e.target.value)} className={`${inp} w-full`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${textSub}`}>Max Amount</label>
              <input type="number" min="0" placeholder="∞" value={filterMaxAmt} onChange={e => setFilterMaxAmt(e.target.value)} className={`${inp} w-full`} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 min-h-[44px]">Apply</button>
            {hasFilters && <button onClick={clearFilters} className={`px-4 py-2 text-sm rounded-lg border min-h-[44px] ${bg} ${textSub}`}>Clear</button>}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`border rounded-xl p-4 ${kpi.alert ? (dark ? 'border-red-500 bg-red-900/20' : 'border-red-300 bg-red-50') : bg}`}>
            <p className={`text-xs ${textSub}`}>{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.alert ? 'text-red-500' : textMain}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Recent sales table */}
      <div className={`border rounded-xl overflow-hidden ${bg}`}>
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${divider}`}>
          <h2 className={`text-sm font-semibold ${textMain}`}>
            {hasFilters ? 'Filtered Sales' : 'Recent Sales'}
          </h2>
          {loading && <span className={`text-xs ${textSub}`}>Loading...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className={`border-b ${divider} ${dark ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                <th className={`text-left px-5 py-3 text-xs font-medium ${textSub}`}>Agent</th>
                <th className={`text-left px-5 py-3 text-xs font-medium ${textSub}`}>Customer</th>
                <th className={`text-left px-5 py-3 text-xs font-medium ${textSub}`}>Total</th>
                <th className={`text-left px-5 py-3 text-xs font-medium ${textSub}`}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr><td colSpan={4} className={`px-5 py-10 text-center ${textSub}`}>No sales found</td></tr>
              ) : recentSales.map(sale => (
                <tr key={sale.id} className={`border-b ${divider} hover:${dark ? 'bg-gray-700/20' : 'bg-gray-50'}`}>
                  <td className={`px-5 py-3 ${textMain}`}>{sale.users_profiles?.full_name ?? '—'}</td>
                  <td className={`px-5 py-3 ${textSub}`}>{sale.customer_name ?? '—'}</td>
                  <td className={`px-5 py-3 font-medium ${textMain}`}>{sale.total_amount?.toLocaleString()}</td>
                  <td className={`px-5 py-3 ${textSub}`}>{new Date(sale.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}