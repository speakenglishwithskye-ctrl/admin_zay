'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('users_profiles')
        .select('id, full_name')
        .eq('role', 'agent')

      if (!data) { setLoading(false); return }

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const agentsWithStats = await Promise.all(
        data.map(async agent => {
          const { data: sales } = await supabase
            .from('sales')
            .select('total_amount')
            .eq('agent_id', agent.id)
            .eq('status', 'confirmed')
            .gte('created_at', monthStart)
          const revenue = sales?.reduce((s, r) => s + r.total_amount, 0) ?? 0
          return { ...agent, salesCount: sales?.length ?? 0, revenue }
        })
      )

      setAgents(agentsWithStats)
      setLoading(false)
    }
    fetch()
  }, [])

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Agents</h1>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Name</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Sales This Month</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Revenue This Month</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : agents.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No agents found</td></tr>
            ) : agents.map(agent => (
              <tr key={agent.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-800 font-medium">{agent.full_name}</td>
                <td className="px-5 py-3 text-right text-gray-700">{agent.salesCount}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{agent.revenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
