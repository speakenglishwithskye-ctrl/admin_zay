'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; name: string; category: string; sale_price: number; book_price: number; stock_quantity: number; unit: string; image_url: string | null }
type CartItem = { product: Product; quantity: number }

const PAGE_SIZE = 50

export default function NewSalePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [page, setPage] = useState(0)
  const [dark, setDark] = useState(false)
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

  // Reset to page 0 when search changes
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

  const total = cart.reduce((s, i) => s + i.product.sale_price * i.quantity, 0)

  const handleConfirm = async () => {
    if (cart.length === 0) return
    setConfirming(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setConfirming(false); alert('Not logged in'); return }

    const { data: sale, error } = await supabase
      .from('sales')
      .insert({ agent_id: user.id, total_amount: total, status: 'confirmed', created_at: new Date().toISOString() })
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

  // styles
  const cardBg = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const textMain = dark ? 'text-gray-100' : 'text-gray-900'
  const textSub = dark ? 'text-gray-400' : 'text-gray-400'
  const inputCls = dark
    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
  const pageBtnBase = 'px-3 py-1.5 rounded text-xs font-medium border transition-colors'
  const pageBtnActive = 'bg-blue-600 text-white border-blue-600'
  const pageBtnInactive = dark
    ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'

  return (
    <div className="flex gap-6 h-[calc(100vh-80px)]">
      {/* Product list */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-xl font-semibold ${textMain}`}>New Sale</h1>
          {filtered.length > 0 && (
            <span className={`text-xs ${textSub}`}>{filtered.length} products</span>
          )}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className={`border rounded px-3 py-2 text-sm mb-3 focus:outline-none ${inputCls}`}
        />

        {/* Pagination buttons */}
        {totalPages > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.from({ length: totalPages }, (_, i) => {
              const from = i * PAGE_SIZE + 1
              const to = Math.min((i + 1) * PAGE_SIZE, filtered.length)
              return (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`${pageBtnBase} ${page === i ? pageBtnActive : pageBtnInactive}`}
                >
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

        {/* Bottom page indicator */}
        {totalPages > 1 && (
          <div className={`mt-2 text-center text-xs ${textSub}`}>
            Page {page + 1} of {totalPages}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="w-72 flex-shrink-0">
        <div className={`border rounded-lg h-full flex flex-col ${cardBg}`}>
          <div className={`px-4 py-3 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-sm font-semibold ${textMain}`}>Order Summary</h2>
          </div>
          <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
            {cart.length === 0 ? (
              <p className={`text-sm text-center py-6 ${textSub}`}>No items added yet</p>
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
          <div className={`border-t px-4 py-3 ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Total</span>
              <span className={`text-lg font-bold ${textMain}`}>{total.toLocaleString()}</span>
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