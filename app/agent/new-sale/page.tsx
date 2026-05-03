'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; name: string; category: string; sale_price: number; book_price: number; stock_quantity: number; unit: string; image_url: string | null }
type CartItem = { product: Product; quantity: number }
type PaymentMethod = 'cod' | 'not_cod'
type DeliveryZone = 'near' | 'far'

const PAGE_SIZE = 50
const MIN_KG = 3

export default function NewSalePage() {
  const [products, setProducts]     = useState<Product[]>([])
  const [search, setSearch]         = useState('')
  const [cart, setCart]             = useState<CartItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [page, setPage]             = useState(0)
  const [dark, setDark]             = useState(false)

  // Customer info (Feature 1)
  const [customerName, setCustomerName]       = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerPhone, setCustomerPhone]     = useState('')

  // Order fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('not_cod')
  const [deliveryZone, setDeliveryZone]   = useState<DeliveryZone>('near')
  const [basePrice, setBasePrice]         = useState('')
  const [perKgPrice, setPerKgPrice]       = useState('')
  const [totalKg, setTotalKg]             = useState('')
  const [codPercent, setCodPercent]       = useState('')
  const [discount, setDiscount]           = useState('')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    supabase.from('products').select('*').order('category').order('name').then(({ data }) => {
      setProducts(data ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { setPage(0) }, [search])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id)
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== id))
    else setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: qty } : i))
  }

  // Delivery calc
  const basePriceNear  = parseFloat(basePrice)  || 0
  const perKgNear      = parseFloat(perKgPrice) || 0
  const kg             = parseFloat(totalKg)    || 0
  const basePriceEff   = deliveryZone === 'far' ? basePriceNear * 2 : basePriceNear
  const perKgEff       = deliveryZone === 'far' ? perKgNear * 2     : perKgNear
  const extraKg        = Math.max(0, kg - MIN_KG)
  const deliveryFeeNum = kg > 0 && basePriceEff > 0 ? basePriceEff + extraKg * perKgEff : 0

  const subtotal    = cart.reduce((s, i) => s + i.product.sale_price * i.quantity, 0)
  const codFeeNum   = paymentMethod === 'cod' ? Math.round(subtotal * (parseFloat(codPercent) || 0) / 100) : 0
  const discountNum = parseFloat(discount) || 0
  const grandTotal  = subtotal + deliveryFeeNum + codFeeNum - discountNum

  const handleConfirm = async () => {
    if (cart.length === 0) return
    setConfirming(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setConfirming(false); alert('Not logged in'); return }

    const { data: sale, error } = await supabase.from('sales').insert({
      agent_id: user.id,
      total_amount: grandTotal,
      subtotal_amount: subtotal,
      delivery_fee: deliveryFeeNum,
      delivery_kg: kg,
      delivery_base_price: basePriceNear,
      delivery_per_kg_price: perKgNear,
      cod_fee: codFeeNum,
      cod_percent: paymentMethod === 'cod' ? (parseFloat(codPercent) || 0) : 0,
      discount_amount: discountNum,
      payment_method: paymentMethod,
      delivery_zone: deliveryZone,
      customer_name: customerName.trim() || null,
      customer_address: customerAddress.trim() || null,
      customer_phone: customerPhone.trim() || null,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    }).select().single()

    if (error || !sale) { setConfirming(false); alert('Error: ' + error?.message); return }

    const items = cart.map(i => ({
      sale_id: sale.id, product_id: i.product.id,
      quantity: i.quantity, unit_price: i.product.sale_price,
      subtotal: i.product.sale_price * i.quantity,
    }))
    await supabase.from('sale_items').insert(items)
    for (const item of cart)
      await supabase.rpc('decrease_stock', { p_product_id: item.product.id, p_quantity: item.quantity })

    router.push(`/receipt/${sale.id}`)
  }

  const filtered   = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Styles
  const cardBg   = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const textMain = dark ? 'text-gray-100' : 'text-gray-900'
  const textSub  = dark ? 'text-gray-400' : 'text-gray-400'
  const textMuted= dark ? 'text-gray-500' : 'text-gray-400'
  const divider  = dark ? 'border-gray-700' : 'border-gray-200'
  const lbl      = `text-xs font-medium mb-1 block ${dark ? 'text-gray-400' : 'text-gray-500'}`
  const inp      = `w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${dark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`
  const segBase  = 'flex-1 py-1.5 text-xs font-medium rounded transition-colors'
  const segOn    = 'bg-blue-600 text-white shadow-sm'
  const segOff   = dark ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'
  const segWrap  = `flex gap-1 p-0.5 rounded ${dark ? 'bg-gray-700' : 'bg-gray-100'}`
  const pbBase   = 'px-2.5 py-1.5 rounded text-xs font-medium border transition-colors'
  const pbOn     = 'bg-blue-600 text-white border-blue-600'
  const pbOff    = dark ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
  const infoBox  = `rounded px-2 py-1.5 text-xs space-y-0.5 ${dark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`
  const calcBox  = `rounded px-2 py-1.5 text-xs space-y-0.5 ${dark ? 'bg-gray-700' : 'bg-gray-50'}`
  const secHdr   = `text-[10px] uppercase tracking-widest font-semibold mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`

  return (
    <div className="flex gap-3 md:gap-4" style={{ height: 'calc(100vh - 112px)' }}>

      {/* ── LEFT: Products ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h1 className={`text-lg md:text-xl font-semibold ${textMain}`}>New Voucher</h1>
          {filtered.length > 0 && <span className={`text-xs ${textSub}`}>{filtered.length} products</span>}
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
          className={`border rounded px-3 py-2 text-sm mb-2 flex-shrink-0 focus:outline-none ${dark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
        />

        {totalPages > 1 && (
          <div className="flex flex-wrap gap-1 mb-2 flex-shrink-0">
            {Array.from({ length: totalPages }, (_, i) => {
              const from = i * PAGE_SIZE + 1
              const to   = Math.min((i + 1) * PAGE_SIZE, filtered.length)
              return (
                <button key={i} onClick={() => setPage(i)} className={`${pbBase} ${page === i ? pbOn : pbOff}`}>
                  {from}–{to}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <p className={`text-center ${textSub} py-10`}>Loading...</p>
          ) : paginated.length === 0 ? (
            <p className={`text-center ${textSub} py-10`}>No products found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
              {paginated.map(p => {
                const inCart = cart.find(i => i.product.id === p.id)
                return (
                  <div key={p.id} className={`border rounded-lg p-3 flex items-center gap-3 hover:border-blue-400 transition-colors ${cardBg}`}>
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      : <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 text-[10px] ${dark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-300'}`}>No img</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${textMain}`}>{p.name}</p>
                      <p className={`text-xs ${textSub}`}>{p.unit} · Stock: {p.stock_quantity}</p>
                      <p className={`text-sm font-semibold ${textMain}`}>{p.sale_price.toLocaleString()}</p>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(p.id, inCart.quantity - 1)} className={`w-7 h-7 rounded text-sm font-bold flex items-center justify-center ${dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>−</button>
                        <span className={`text-sm w-6 text-center ${textMain}`}>{inCart.quantity}</span>
                        <button onClick={() => updateQty(p.id, inCart.quantity + 1)} className="w-7 h-7 rounded bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(p)} className="text-xs bg-blue-600 text-white px-2.5 py-2 rounded hover:bg-blue-700 transition-colors min-h-[36px]">Add</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {totalPages > 1 && <div className={`flex-shrink-0 pt-1 text-center text-xs ${textSub}`}>Page {page + 1} of {totalPages}</div>}
      </div>

      {/* ── RIGHT: Order Summary ── */}
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
        <div className={`border rounded-lg flex flex-col overflow-hidden h-full ${cardBg}`}>
          <div className={`px-4 py-3 border-b flex-shrink-0 ${divider}`}>
            <h2 className={`text-sm font-semibold ${textMain}`}>Order Summary</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

            {/* Cart items */}
            {cart.length === 0
              ? <p className={`text-sm text-center py-3 ${textSub}`}>No items added yet</p>
              : cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${textMain}`}>{item.product.name}</p>
                    <p className={`text-xs ${textSub}`}>{item.product.sale_price.toLocaleString()} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className={`w-6 h-6 rounded text-xs flex items-center justify-center ${dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>−</button>
                    <span className={`text-xs w-5 text-center ${textMain}`}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className={`w-6 h-6 rounded text-xs flex items-center justify-center ${dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>+</button>
                  </div>
                  <span className={`text-xs font-medium w-14 text-right flex-shrink-0 ${textMain}`}>{(item.product.sale_price * item.quantity).toLocaleString()}</span>
                </div>
              ))
            }

            {/* Subtotal */}
            <div className={`flex justify-between text-xs border-t pt-2 ${divider} ${textSub}`}>
              <span>Subtotal</span>
              <span className={`font-semibold ${textMain}`}>{subtotal.toLocaleString()}</span>
            </div>

            <div className={`border-t ${divider}`} />

            {/* ── Customer Info ── */}
            <div>
              <p className={secHdr}>Customer Info</p>
              <div className="space-y-1.5">
                <div>
                  <label className={lbl}>Customer Name</label>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Aung Kyaw" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Phone Number</label>
                  <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="e.g. 09-xxxx" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Address</label>
                  <textarea value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Delivery address..." rows={2}
                    className={`${inp} resize-none`} />
                </div>
              </div>
            </div>

            <div className={`border-t ${divider}`} />

            {/* Payment Method */}
            <div>
              <label className={lbl}>Payment Method</label>
              <div className={segWrap}>
                <button onClick={() => setPaymentMethod('not_cod')} className={`${segBase} ${paymentMethod === 'not_cod' ? segOn : segOff}`}>Not COD</button>
                <button onClick={() => setPaymentMethod('cod')}     className={`${segBase} ${paymentMethod === 'cod'     ? segOn : segOff}`}>COD</button>
              </div>
            </div>

            {/* Delivery Zone */}
            <div>
              <label className={lbl}>Delivery Zone</label>
              <div className={segWrap}>
                <button onClick={() => setDeliveryZone('near')} className={`${segBase} ${deliveryZone === 'near' ? segOn : segOff}`}>Near</button>
                <button onClick={() => setDeliveryZone('far')}  className={`${segBase} ${deliveryZone === 'far'  ? segOn : segOff}`}>
                  Far <span className="opacity-70 text-[10px]">×2</span>
                </button>
              </div>
            </div>

            {/* Delivery kg-based */}
            <div className="space-y-2">
              <label className={lbl}>
                Delivery (kg){deliveryZone === 'far' && <span className="ml-1 text-orange-400 font-semibold text-[10px]"> FAR ×2</span>}
              </label>
              {(basePriceNear > 0 || perKgNear > 0) && (
                <div className={infoBox}>
                  <div className="flex justify-between"><span>First {MIN_KG}kg rate</span><span className="font-bold">{basePriceEff.toLocaleString()} ฿</span></div>
                  {perKgNear > 0 && <div className="flex justify-between"><span>Per extra kg</span><span className="font-bold">{perKgEff.toLocaleString()} ฿</span></div>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className={`text-[10px] mb-0.5 block ${textMuted}`}>First {MIN_KG}kg — Near (฿)</span>
                  <input type="number" min="0" placeholder="e.g. 40" value={basePrice} onChange={e => setBasePrice(e.target.value)} className={inp} />
                </div>
                <div>
                  <span className={`text-[10px] mb-0.5 block ${textMuted}`}>Extra kg — Near (฿)</span>
                  <input type="number" min="0" placeholder="e.g. 10" value={perKgPrice} onChange={e => setPerKgPrice(e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <span className={`text-[10px] mb-0.5 block ${textMuted}`}>Total weight (kg)</span>
                <input type="number" min="0" step="0.1" placeholder={`${MIN_KG}`} value={totalKg} onChange={e => setTotalKg(e.target.value)} className={inp} />
              </div>
              {deliveryFeeNum > 0 && (
                <div className={calcBox}>
                  <div className={`flex justify-between ${textMuted}`}><span>Base ({MIN_KG}kg)</span><span>{basePriceEff.toLocaleString()} ฿</span></div>
                  {extraKg > 0 && <div className={`flex justify-between ${textMuted}`}><span>+{extraKg}kg × {perKgEff}฿</span><span>{(extraKg * perKgEff).toLocaleString()} ฿</span></div>}
                  <div className={`flex justify-between font-semibold border-t pt-1 ${divider} text-blue-500`}><span>+ Delivery</span><span>{deliveryFeeNum.toLocaleString()} ฿</span></div>
                </div>
              )}
            </div>

            {/* COD Fee */}
            {paymentMethod === 'cod' && (
              <div>
                <label className={lbl}>COD Fee (%)</label>
                <input type="number" min="0" max="100" step="0.1" placeholder="0" value={codPercent} onChange={e => setCodPercent(e.target.value)} className={inp} />
                {codFeeNum > 0 && <div className={`flex justify-between text-xs mt-1 ${textMuted}`}><span>+ COD ({codPercent}%)</span><span>{codFeeNum.toLocaleString()}</span></div>}
              </div>
            )}

            {/* Discount */}
            <div>
              <label className={lbl}>Discount (Baht)</label>
              <input type="number" min="0" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} className={inp} />
              {discountNum > 0 && <div className="flex justify-between text-xs mt-1 text-green-500"><span>− Discount</span><span>-{discountNum.toLocaleString()}</span></div>}
            </div>
          </div>

          {/* Pinned bottom */}
          <div className={`flex-shrink-0 border-t px-4 py-3 space-y-3 ${divider} ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm font-bold ${textMain}`}>Grand Total</span>
              <span className="text-xl font-bold text-blue-500">{grandTotal.toLocaleString()}</span>
            </div>
            <button onClick={handleConfirm} disabled={cart.length === 0 || confirming}
              className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-95 disabled:opacity-40 transition-all min-h-[48px]">
              {confirming ? 'Confirming...' : '✓ Confirm Voucher'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}