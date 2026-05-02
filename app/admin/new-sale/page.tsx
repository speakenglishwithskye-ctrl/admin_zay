'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; name: string; category: string; sale_price: number; book_price: number; stock_quantity: number; unit: string; image_url: string | null }
type CartItem = { product: Product; quantity: number }
type PaymentMethod = 'cod' | 'not_cod'
type DeliveryZone = 'near' | 'far'

const PAGE_SIZE = 50

export default function NewSalePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [page, setPage] = useState(0)
  const [dark, setDark] = useState(false)

  // Order fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('not_cod')
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>('near')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [codPercent, setCodPercent] = useState('')
  const [discount, setDiscount] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
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
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== productId))
    else setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i))
  }

  // ── Calculation logic ──────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.product.sale_price * i.quantity, 0)
  const deliveryFeeNum = parseFloat(deliveryFee) || 0
  const codFeeNum = paymentMethod === 'cod' ? Math.round(subtotal * (parseFloat(codPercent) || 0) / 100) : 0
  const discountNum = parseFloat(discount) || 0
  const grandTotal = subtotal + deliveryFeeNum + codFeeNum - discountNum
  // ──────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (cart.length === 0) return
    setConfirming(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setConfirming(false); alert('Not logged in'); return }

    const { data: sale, error } = await supabase
      .from('sales')
      .insert({
        agent_id: user.id,
        total_amount: grandTotal,
        subtotal_amount: subtotal,
        delivery_fee: deliveryFeeNum,
        cod_fee: codFeeNum,
        cod_percent: paymentMethod === 'cod' ? (parseFloat(codPercent) || 0) : 0,
        discount_amount: discountNum,
        payment_method: paymentMethod,
        delivery_zone: deliveryZone,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !sale) { setConfirming(false); alert('Error creating sale: ' + error?.message); return }

    const items = cart.map(i => ({
      sale_id: sale.id,
      product_id: i.product.id,
      quantity: i.quantity,
      unit_price: i.product.sale_price,
      subtotal: i.product.sale_price * i.quantity,
    }))
    const { error: itemsError } = await supabase.from('sale_items').insert(items)
    if (itemsError) { setConfirming(false); alert('Error saving items: ' + itemsError.message); return }

    for (const item of cart) {
      await supabase.rpc('decrease_stock', { p_product_id: item.product.id, p_quantity: item.quantity })
    }

    router.push(`/receipt/${sale.id}`)
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // ── Styles ─────────────────────────────────────────────────────────
  const cardBg = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const textMain = dark ? 'text-gray-100' : 'text-gray-900'
  const textSub = dark ? 'text-gray-400' : 'text-gray-400'
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400'
  const inputCls = `w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
    dark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`
  const segBtnBase = 'flex-1 py-1 text-xs font-medium rounded transition-colors'
  const segActive = 'bg-blue-600 text-white'
  const segInactive = dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  const pageBtnBase = 'px-3 py-1.5 rounded text-xs font-medium border transition-colors'
  const pageBtnActive = 'bg-blue-600 text-white border-blue-600'
  const pageBtnInactive = dark
    ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
  const divider = dark ? 'border-gray-700' : 'border-gray-200'
  const labelCls = `text-xs font-medium ${dark ? 'text-gray-400' : 'text-gray-500'} mb-1 block`

  return (
    <div className="flex gap-6 h-[calc(100vh-80px)]">

      {/* ── Product list (UNCHANGED) ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-xl font-semibold ${textMain}`}>New Sale</h1>
          {filtered.length > 0 && <span className={`text-xs ${textSub}`}>{filtered.length} products</span>}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className={`border rounded px-3 py-2 text-sm mb-3 focus:outline-none ${
            dark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-400'
                 : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
          }`}
        />

        {totalPages > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.from({ length: totalPages }, (_, i) => {
              const from = i * PAGE_SIZE + 1
              const to = Math.min((i + 1) * PAGE_SIZE, filtered.length)
              return (
                <button key={i} onClick={() => setPage(i)}
                  className={`${pageBtnBase} ${page === i ? pageBtnActive : pageBtnInactive}`}>
                  {from}–{to}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {loading ? (
            <p className={`text-center ${textSub} py-10`}>Loading products...</p>
          ) : paginated.length === 0 ? (
            <p className={`text-center ${textSub} py-10`}>No products found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {paginated.map(p => {
                const inCart = cart.find(i => i.product.id === p.id)
                return (
                  <div key={p.id} className={`border rounded-lg p-3 flex items-center gap-3 hover:border-blue-400 transition-colors ${cardBg}`}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover border border-gray-100 flex-shrink-0" />
                    ) : (
                      <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 text-xs ${dark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-300'}`}>No img</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${textMain}`}>{p.name}</p>
                      <p className={`text-xs ${textSub}`}>{p.unit} · Stock: {p.stock_quantity}</p>
                      <p className={`text-sm font-semibold ${textMain}`}>{p.sale_price.toLocaleString()}</p>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(p.id, inCart.quantity - 1)} className={`w-6 h-6 rounded text-sm font-bold flex items-center justify-center ${dark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200'}`}>−</button>
                        <span className={`text-sm w-6 text-center ${textMain}`}>{inCart.quantity}</span>
                        <button onClick={() => updateQty(p.id, inCart.quantity + 1)} className="w-6 h-6 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-bold flex items-center justify-center">+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(p)} className="text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700 transition-colors">Add</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className={`mt-2 text-center text-xs ${textSub}`}>Page {page + 1} of {totalPages}</div>
        )}
      </div>

      {/* ── Order Summary (RIGHT PANEL) ──────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className={`border rounded-lg flex flex-col overflow-hidden flex-1 ${cardBg}`}>

          {/* Header */}
          <div className={`px-4 py-3 border-b ${divider}`}>
            <h2 className={`text-sm font-semibold ${textMain}`}>Order Summary</h2>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
            {cart.length === 0 ? (
              <p className={`text-sm text-center py-4 ${textSub}`}>No items added yet</p>
            ) : cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${textMain}`}>{item.product.name}</p>
                  <p className={`text-xs ${textSub}`}>{item.product.sale_price.toLocaleString()} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className={`w-5 h-5 rounded text-xs flex items-center justify-center ${dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>−</button>
                  <span className={`text-xs w-5 text-center ${textMain}`}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className={`w-5 h-5 rounded text-xs flex items-center justify-center ${dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>+</button>
                </div>
                <span className={`text-xs font-medium w-16 text-right ${textMain}`}>{(item.product.sale_price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* ── Input fields + totals ── */}
          <div className={`border-t px-4 py-3 space-y-3 ${divider}`}>

            {/* Subtotal row */}
            <div className={`flex justify-between text-xs ${textSub}`}>
              <span>Subtotal</span>
              <span className={`font-medium ${textMain}`}>{subtotal.toLocaleString()}</span>
            </div>

            <div className={`border-t ${divider}`} />

            {/* 1. Payment Method */}
            <div>
              <label className={labelCls}>Payment Method</label>
              <div className="flex gap-1 p-0.5 rounded bg-gray-100 dark:bg-gray-700">
                <button onClick={() => setPaymentMethod('not_cod')}
                  className={`${segBtnBase} ${paymentMethod === 'not_cod' ? segActive : segInactive}`}>
                  Not COD
                </button>
                <button onClick={() => setPaymentMethod('cod')}
                  className={`${segBtnBase} ${paymentMethod === 'cod' ? segActive : segInactive}`}>
                  COD
                </button>
              </div>
            </div>

            {/* 2. Delivery Zone */}
            <div>
              <label className={labelCls}>Delivery Zone</label>
              <div className="flex gap-1 p-0.5 rounded bg-gray-100 dark:bg-gray-700">
                <button onClick={() => setDeliveryZone('near')}
                  className={`${segBtnBase} ${deliveryZone === 'near' ? segActive : segInactive}`}>
                  Near
                </button>
                <button onClick={() => setDeliveryZone('far')}
                  className={`${segBtnBase} ${deliveryZone === 'far' ? segActive : segInactive}`}>
                  Far
                </button>
              </div>
            </div>

            {/* 3. Delivery Fee */}
            <div>
              <label className={labelCls}>Delivery Fee (Baht)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={deliveryFee}
                onChange={e => setDeliveryFee(e.target.value)}
                className={inputCls}
              />
              {deliveryFeeNum > 0 && (
                <div className={`flex justify-between text-xs mt-1 ${textMuted}`}>
                  <span>+ Delivery</span><span>{deliveryFeeNum.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* 4. COD Fee — only if COD selected */}
            {paymentMethod === 'cod' && (
              <div>
                <label className={labelCls}>COD Fee (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={codPercent}
                  onChange={e => setCodPercent(e.target.value)}
                  className={inputCls}
                />
                {codFeeNum > 0 && (
                  <div className={`flex justify-between text-xs mt-1 ${textMuted}`}>
                    <span>+ COD ({codPercent}%)</span><span>{codFeeNum.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* 5. Discount — always last input */}
            <div>
              <label className={labelCls}>Discount (Baht)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className={inputCls}
              />
              {discountNum > 0 && (
                <div className="flex justify-between text-xs mt-1 text-green-500">
                  <span>− Discount</span><span>-{discountNum.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className={`border-t ${divider}`} />

            {/* Grand Total */}
            <div className="flex justify-between items-center">
              <span className={`text-sm font-bold ${textMain}`}>Grand Total</span>
              <span className={`text-lg font-bold text-blue-500`}>{grandTotal.toLocaleString()}</span>
            </div>

            <button
              onClick={handleConfirm}
              disabled={cart.length === 0 || confirming}
              className="w-full bg-blue-600 text-white py-2.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {confirming ? 'Confirming...' : 'Confirm Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}