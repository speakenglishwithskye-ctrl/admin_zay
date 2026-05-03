'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type SaleItem = { quantity: number; unit_price: number; subtotal: number; products: { name: string; unit: string } | null }
type Sale = {
  id: string; created_at: string; total_amount: number
  subtotal_amount: number | null; delivery_fee: number | null
  delivery_kg: number | null; delivery_base_price: number | null; delivery_per_kg_price: number | null
  cod_fee: number | null; cod_percent: number | null; discount_amount: number | null
  payment_method: string | null; delivery_zone: string | null; status: string
  customer_name: string | null; customer_address: string | null; customer_phone: string | null
  users_profiles: { full_name: string } | null
}
const MIN_KG = 3

export default function VoucherPage() {
  const params = useParams()
  const id     = params.id as string
  const [sale, setSale]         = useState<Sale | null>(null)
  const [items, setItems]       = useState<SaleItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data } = await supabase.from('sales')
        .select(`id, created_at, total_amount, subtotal_amount, delivery_fee,
          delivery_kg, delivery_base_price, delivery_per_kg_price,
          cod_fee, cod_percent, discount_amount, payment_method, delivery_zone, status,
          customer_name, customer_address, customer_phone,
          users_profiles(full_name)`)
        .eq('id', id).single()
      if (!data) { setNotFound(true); setLoading(false); return }
      setSale(data as any)
      const { data: itms } = await supabase.from('sale_items')
        .select('quantity, unit_price, subtotal, products(name, unit)').eq('sale_id', id)
      setItems((itms ?? []) as any)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Loading voucher...</p>
      </div>
    </div>
  )

  if (notFound || !sale) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Voucher not found.</p>
    </div>
  )

  const voucherNum   = `VCH-${id.slice(-6).toUpperCase()}`
  const date         = new Date(sale.created_at).toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  const subtotal     = sale.subtotal_amount ?? sale.total_amount
  const deliveryFee  = sale.delivery_fee  ?? 0
  const kg           = sale.delivery_kg   ?? 0
  const basePrice    = sale.delivery_base_price  ?? 0
  const perKgPrice   = sale.delivery_per_kg_price ?? 0
  const codFee       = sale.cod_fee       ?? 0
  const codPercent   = sale.cod_percent   ?? 0
  const discount     = sale.discount_amount ?? 0
  const grandTotal   = sale.total_amount
  const isCOD        = sale.payment_method === 'cod'
  const isFar        = sale.delivery_zone === 'far'
  const zone         = isFar ? 'Far' : sale.delivery_zone === 'near' ? 'Near' : null
  const basePriceEff = isFar ? basePrice * 2  : basePrice
  const perKgEff     = isFar ? perKgPrice * 2 : perKgPrice
  const extraKg      = Math.max(0, kg - MIN_KG)
  const agentName    = (sale.users_profiles as any)?.full_name ?? '—'

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xs rounded-2xl shadow-lg overflow-hidden">

        {/* Action buttons */}
        <div className="no-print flex gap-2 p-3 bg-gray-50 border-b border-gray-100">
          <button onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm border border-gray-300 text-gray-600 py-2.5 rounded-lg hover:bg-white min-h-[44px]">
            🖨️ Print
          </button>
          <button onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 min-h-[44px]">
            ↓ Save PDF
          </button>
        </div>

        <div className="px-5 pt-5 pb-4 font-mono text-xs">
          {/* Logo + Brand */}
          <div className="text-center mb-4">
            <div className="flex justify-center mb-2">
              <img src="/logo.jpg" alt="Logo" className="w-14 h-14 object-contain"
                onError={e => (e.target as HTMLImageElement).style.display='none'} />
            </div>
            <p className="font-bold text-sm tracking-widest text-gray-900 uppercase">Zay Shop</p>
            <p className="text-gray-400 text-[10px] tracking-widest mt-0.5">OFFICIAL VOUCHER</p>
          </div>

          <div className="border-t border-dashed border-gray-200 my-3" />

          {/* Voucher meta */}
          <div className="space-y-1.5 mb-3">
            <Row label="Voucher #" value={<span className="font-semibold text-gray-800">{voucherNum}</span>} />
            <Row label="Date"      value={date} />
            <Row label="Agent"     value={agentName} />
            {sale.payment_method && (
              <Row label="Payment" value={
                <span className={`font-semibold ${isCOD ? 'text-orange-600' : 'text-gray-700'}`}>
                  {isCOD ? '📦 COD' : '✓ Not COD'}
                </span>
              } />
            )}
            {zone && (
              <Row label="Delivery Zone" value={
                <span className={`font-semibold ${isFar ? 'text-orange-600' : 'text-gray-700'}`}>
                  {zone}{isFar ? ' (×2)' : ''}
                </span>
              } />
            )}
          </div>

          {/* Customer Info */}
          {(sale.customer_name || sale.customer_phone || sale.customer_address) && (
            <>
              <div className="border-t border-dashed border-gray-200 my-3" />
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">Customer</p>
              <div className="space-y-1">
                {sale.customer_name    && <Row label="Name"    value={sale.customer_name} bold />}
                {sale.customer_phone   && <Row label="Phone"   value={sale.customer_phone} />}
                {sale.customer_address && (
                  <div className="flex gap-2 text-gray-500">
                    <span className="flex-shrink-0">Address</span>
                    <span className="text-gray-700 text-right flex-1 break-words">{sale.customer_address}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="border-t border-dashed border-gray-200 my-3" />

          {/* Items */}
          <div className="flex text-gray-400 mb-1.5 text-[10px] uppercase tracking-wide">
            <span className="flex-1">Item</span>
            <span className="w-7 text-right">Qty</span>
            <span className="w-14 text-right">Price</span>
            <span className="w-14 text-right">Total</span>
          </div>
          <div className="border-t border-gray-100 mb-2" />
          {items.map((item, i) => (
            <div key={i} className="flex items-start mb-1.5 gap-1">
              <span className="flex-1 text-gray-700 leading-tight break-words pr-1">{item.products?.name}</span>
              <span className="w-7 text-right text-gray-500 flex-shrink-0">{item.quantity}</span>
              <span className="w-14 text-right text-gray-500 flex-shrink-0">{item.unit_price?.toLocaleString()}</span>
              <span className="w-14 text-right font-medium text-gray-800 flex-shrink-0">{item.subtotal?.toLocaleString()}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-gray-200 my-3" />

          {/* Totals */}
          <div className="space-y-1.5">
            <Row label="Subtotal" value={subtotal.toLocaleString()} />
            {deliveryFee > 0 && (
              <div>
                <Row label={`Delivery — ${kg}kg${zone ? ` (${zone})` : ''}`} value="" />
                <div className="pl-3 mt-0.5 space-y-0.5 text-[10px] text-gray-400">
                  <div className="flex justify-between"><span>First {MIN_KG}kg</span><span>{basePriceEff.toLocaleString()} ฿</span></div>
                  {extraKg > 0 && <div className="flex justify-between"><span>+{extraKg}kg × {perKgEff}฿</span><span>{(extraKg * perKgEff).toLocaleString()} ฿</span></div>}
                </div>
                <div className="flex justify-between text-gray-600 font-medium mt-0.5"><span>+ Delivery Fee</span><span>{deliveryFee.toLocaleString()}</span></div>
              </div>
            )}
            {isCOD && codFee > 0 && <Row label={`+ COD Fee (${codPercent}%)`} value={codFee.toLocaleString()} />}
            {discount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>− Discount</span><span>{discount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-200 my-3" />

          <div className="flex justify-between items-center">
            <span className="font-bold text-sm text-gray-900 tracking-wide">GRAND TOTAL</span>
            <span className="font-bold text-lg text-gray-900">{grandTotal.toLocaleString()} ฿</span>
          </div>

          <div className="border-t border-dashed border-gray-200 my-4" />
          <p className="text-center text-gray-400 text-[10px] tracking-widest uppercase">Thank you</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 0; size: 80mm auto; }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: any; bold?: boolean }) {
  return (
    <div className="flex justify-between text-gray-500 gap-2">
      <span className="flex-shrink-0">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}