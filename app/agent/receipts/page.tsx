import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ReceiptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sales } = await supabase
    .from('sales')
    .select('id, created_at, total_amount, status')
    .eq('agent_id', user!.id)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">My Receipts</h1>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Receipt #</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Total</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!sales || sales.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No receipts yet</td></tr>
            ) : sales.map(sale => (
              <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs text-gray-500">RCP-{sale.id.slice(-6).toUpperCase()}</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">{sale.total_amount?.toLocaleString()}</td>
                <td className="px-5 py-3 text-gray-500">{new Date(sale.created_at).toLocaleString()}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/receipt/${sale.id}`} className="text-xs text-blue-600 hover:underline">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
