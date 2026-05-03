'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AgentVouchersPage() {
  const [sales, setSales]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: s } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, status, customer_name')
        .eq('agent_id', data.user.id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
      setSales(s ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">My Vouchers</h1>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Voucher #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No vouchers yet</td></tr>
              ) : sales.map(sale => (
                <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">VCH-{sale.id.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3 text-gray-700">{sale.customer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{sale.total_amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/receipt/${sale.id}`} className="text-xs text-blue-600 hover:underline min-h-[36px] inline-flex items-center">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}