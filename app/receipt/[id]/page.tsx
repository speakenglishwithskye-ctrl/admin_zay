import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: sale } = await supabase
    .from('sales')
    .select('id, created_at, total_amount, status, users_profiles(full_name)')
    .eq('id', id)
    .single()

  if (!sale) return notFound()

  const { data: items } = await supabase
    .from('sale_items')
    .select('quantity, unit_price, subtotal, products(name, unit)')
    .eq('sale_id', id)

  const receiptNum = `RCP-${id.slice(-6).toUpperCase()}`
  const date = new Date(sale.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm border border-gray-200 rounded">
        {/* Print/Download buttons */}
        <div className="no-print flex gap-2 justify-end p-4 border-b border-gray-100">
          <button
            onClick={() => window.print()}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50"
          >
            🖨 Print
          </button>
          <button
            onClick={() => window.print()}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
          >
            ↓ Download PDF
          </button>
        </div>

        {/* Receipt body */}
        <div className="p-6 font-mono text-xs">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded mx-auto mb-3 flex items-center justify-center text-gray-400 text-xs">LOGO</div>
            <p className="font-bold text-base tracking-wide text-gray-900">INVENTORY MANAGER</p>
            <p className="font-bold text-sm tracking-widest text-gray-600">RECEIPT</p>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          <div className="space-y-1 text-gray-700 mb-3">
            <div className="flex justify-between"><span className="text-gray-500">Receipt #</span><span className="font-semibold">{receiptNum}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{date}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Agent</span><span>{(sale.users_profiles as any)?.full_name ?? '—'}</span></div>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Items header */}
          <div className="flex text-gray-500 mb-1">
            <span className="flex-1">Item</span>
            <span className="w-8 text-right">Qty</span>
            <span className="w-16 text-right">Price</span>
            <span className="w-16 text-right">Total</span>
          </div>

          <div className="border-t border-gray-200 mb-2" />

          {/* Items */}
          {items?.map((item: any, i) => (
            <div key={i} className="flex items-start mb-1 gap-1">
              <span className="flex-1 text-gray-700 leading-tight break-words pr-1">{item.products?.name}</span>
              <span className="w-8 text-right text-gray-600 flex-shrink-0">{item.quantity}</span>
              <span className="w-16 text-right text-gray-600 flex-shrink-0">{item.unit_price?.toLocaleString()}</span>
              <span className="w-16 text-right font-medium flex-shrink-0">{item.subtotal?.toLocaleString()}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-gray-300 my-3" />

          <div className="flex justify-between font-bold text-sm text-gray-900">
            <span>TOTAL</span>
            <span>{sale.total_amount?.toLocaleString()}</span>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          <p className="text-center text-gray-500">Thank you.</p>

          <div className="border-t border-dashed border-gray-300 mt-3" />
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          @page { margin: 0; }
        }
      `}</style>
    </div>
  )
}
