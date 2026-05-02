'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type SaleItem = {
  quantity: number
  unit_price: number
  subtotal: number
  products: { name: string; unit: string } | null
}

type Sale = {
  id: string
  created_at: string
  total_amount: number
  subtotal_amount: number | null
  delivery_fee: number | null
  delivery_kg: number | null
  delivery_base_price: number | null
  delivery_per_kg_price: number | null
  cod_fee: number | null
  cod_percent: number | null
  discount_amount: number | null
  payment_method: string | null
  delivery_zone: string | null
  status: string
  users_profiles: { full_name: string } | null
}

const MIN_KG = 3

export default function ReceiptPage() {
  const params = useParams()
  const id = params.id as string
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: saleData } = await supabase
        .from('sales')
        .select(`
          id, created_at, total_amount,
          subtotal_amount, delivery_fee,
          delivery_kg, delivery_base_price, delivery_per_kg_price,
          cod_fee, cod_percent, discount_amount,
          payment_method, delivery_zone,
          status, users_profiles(full_name)
        `)
        .eq('id', id)
        .single()

      if (!saleData) { setNotFound(true); setLoading(false); return }
      setSale(saleData as any)

      const { data: itemsData } = await supabase
        .from('sale_items')
        .select('quantity, unit_price, subtotal, products(name, unit)')
        .eq('sale_id', id)

      setItems((itemsData ?? []) as any)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading receipt...</p>
      </div>
    )
  }

  if (notFound || !sale) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Receipt not found.</p>
      </div>
    )
  }

  const receiptNum = `RCP-${id.slice(-6).toUpperCase()}`
  const date = new Date(sale.created_at).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const subtotal      = sale.subtotal_amount ?? sale.total_amount
  const deliveryFee   = sale.delivery_fee ?? 0
  const kg            = sale.delivery_kg ?? 0
  const basePrice     = sale.delivery_base_price ?? 0
  const perKgPrice    = sale.delivery_per_kg_price ?? 0
  const codFee        = sale.cod_fee ?? 0
  const codPercent    = sale.cod_percent ?? 0
  const discount      = sale.discount_amount ?? 0
  const grandTotal    = sale.total_amount
  const isCOD         = sale.payment_method === 'cod'
  const isFar         = sale.delivery_zone === 'far'
  const zone          = isFar ? 'Far' : sale.delivery_zone === 'near' ? 'Near' : null

  // Effective rates for display (Far = ×2)
  const basePriceEff  = isFar ? basePrice * 2 : basePrice
  const perKgEff      = isFar ? perKgPrice * 2 : perKgPrice
  const extraKg       = Math.max(0, kg - MIN_KG)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm border border-gray-200 rounded shadow-sm">

        {/* Action buttons */}
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

        <div className="p-6 font-mono text-xs">

          {/* Header */}
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded mx-auto mb-3 flex items-center justify-center text-gray-400 text-xs">LOGO</div>
            <p className="font-bold text-base tracking-wide text-gray-900">INVENTORY MANAGER</p>
            <p className="font-bold text-sm tracking-widest text-gray-600">RECEIPT</p>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Meta info */}
          <div className="space-y-1 text-gray-700 mb-3">
            <div className="flex justify-between"><span className="text-gray-500">Receipt #</span><span className="font-semibold">{receiptNum}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{date}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Agent</span><span>{(sale.users_profiles as any)?.full_name ?? '—'}</span></div>
            {sale.payment_method && (
              <div className="flex justify-between">
                <span className="text-gray-500">Payment</span>
                <span className={isCOD ? 'text-orange-600 font-semibold' : ''}>{isCOD ? 'COD' : 'Not COD'}</span>
              </div>
            )}
            {zone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery Zone</span>
                <span className={isFar ? 'text-orange-600 font-semibold' : ''}>{zone}{isFar ? ' (×2 rate)' : ''}</span>
              </div>
            )}
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

          {/* Line items */}
          {items.map((item, i) => (
            <div key={i} className="flex items-start mb-1 gap-1">
              <span className="flex-1 text-gray-700 leading-tight break-words pr-1">{item.products?.name}</span>
              <span className="w-8 text-right text-gray-600 flex-shrink-0">{item.quantity}</span>
              <span className="w-16 text-right text-gray-600 flex-shrink-0">{item.unit_price?.toLocaleString()}</span>
              <span className="w-16 text-right font-medium flex-shrink-0">{item.subtotal?.toLocaleString()}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* ── Calculation breakdown ───────────────────────────── */}

          {/* 1. Subtotal */}
          <div className="flex justify-between text-gray-600 mb-1">
            <span>Subtotal</span>
            <span>{subtotal.toLocaleString()}</span>
          </div>

          {/* 2. Delivery Fee with kg breakdown */}
          {deliveryFee > 0 && (
            <div className="mb-1">
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Delivery — {kg} kg{zone ? ` (${zone})` : ''}</span>
              </div>
              {/* breakdown lines */}
              <div className="pl-2 text-gray-400 space-y-0.5 mt-0.5">
                <div className="flex justify-between">
                  <span>First {MIN_KG} kg</span>
                  <span>{basePriceEff.toLocaleString()} ฿</span>
                </div>
                {extraKg > 0 && (
                  <div className="flex justify-between">
                    <span>+{extraKg} kg × {perKgEff.toLocaleString()} ฿</span>
                    <span>{(extraKg * perKgEff).toLocaleString()} ฿</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-gray-600 font-medium mt-0.5">
                <span>+ Delivery Fee</span>
                <span>{deliveryFee.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* 3. COD Fee */}
          {isCOD && codFee > 0 && (
            <div className="flex justify-between text-gray-600 mb-1">
              <span>COD Fee ({codPercent}%)</span>
              <span>+ {codFee.toLocaleString()}</span>
            </div>
          )}

          {/* 4. Discount */}
          {discount > 0 && (
            <div className="flex justify-between text-green-600 font-medium mb-1">
              <span>Discount</span>
              <span>− {discount.toLocaleString()}</span>
            </div>
          )}

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* 5. Grand Total */}
          <div className="flex justify-between font-bold text-sm text-gray-900">
            <span>GRAND TOTAL</span>
            <span>{grandTotal.toLocaleString()}</span>
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