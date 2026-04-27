import { createClient } from '@/lib/supabase/server'

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [todaySales, weekSales, monthSales, lowStock, recentSales] = await Promise.all([
    supabase.from('sales').select('total_amount').gte('created_at', todayStart).eq('status', 'confirmed'),
    supabase.from('sales').select('total_amount').gte('created_at', weekStart).eq('status', 'confirmed'),
    supabase.from('sales').select('total_amount').gte('created_at', monthStart).eq('status', 'confirmed'),
    supabase.from('products').select('id').lte('stock_quantity', 5),
    supabase.from('sales').select('id, total_amount, created_at, users_profiles(full_name)').eq('status', 'confirmed').order('created_at', { ascending: false }).limit(10),
  ])

  return {
    todayRevenue: todaySales.data?.reduce((s, r) => s + r.total_amount, 0) ?? 0,
    weekRevenue: weekSales.data?.reduce((s, r) => s + r.total_amount, 0) ?? 0,
    monthRevenue: monthSales.data?.reduce((s, r) => s + r.total_amount, 0) ?? 0,
    lowStockCount: lowStock.data?.length ?? 0,
    recentSales: recentSales.data ?? [],
  }
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const stats = await getStats(supabase)

  const kpis = [
    { label: 'Revenue Today', value: stats.todayRevenue.toLocaleString() },
    { label: 'Revenue This Week', value: stats.weekRevenue.toLocaleString() },
    { label: 'Revenue This Month', value: stats.monthRevenue.toLocaleString() },
    { label: 'Low Stock Alerts', value: stats.lowStockCount.toString(), alert: stats.lowStockCount > 0 },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`bg-white border rounded-lg p-4 ${kpi.alert ? 'border-red-300' : 'border-gray-200'}`}>
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${kpi.alert ? 'text-red-600' : 'text-gray-900'}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Recent Sales</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Agent</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSales.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400 text-sm">No sales yet</td></tr>
              ) : stats.recentSales.map((sale: any) => (
                <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">{sale.users_profiles?.full_name ?? '—'}</td>
                  <td className="px-5 py-3 font-medium">{sale.total_amount?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(sale.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
