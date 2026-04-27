import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AgentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [todaySales, weekSales, monthSales] = await Promise.all([
    supabase.from('sales').select('total_amount').eq('agent_id', user!.id).eq('status', 'confirmed').gte('created_at', todayStart),
    supabase.from('sales').select('total_amount').eq('agent_id', user!.id).eq('status', 'confirmed').gte('created_at', weekStart),
    supabase.from('sales').select('total_amount').eq('agent_id', user!.id).eq('status', 'confirmed').gte('created_at', monthStart),
  ])

  const kpis = [
    { label: 'Today', value: (todaySales.data?.reduce((s, r) => s + r.total_amount, 0) ?? 0).toLocaleString() },
    { label: 'This Week', value: (weekSales.data?.reduce((s, r) => s + r.total_amount, 0) ?? 0).toLocaleString() },
    { label: 'This Month', value: (monthSales.data?.reduce((s, r) => s + r.total_amount, 0) ?? 0).toLocaleString() },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">My Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <Link href="/agent/new-sale" className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
        + Start New Sale
      </Link>
    </div>
  )
}
