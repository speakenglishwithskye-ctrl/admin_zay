'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; name: string; category: string; sale_price: number; book_price: number; stock_quantity: number; unit: string; image_url: string | null }
type CartItem = { product: Product; quantity: number }

export default function NewSalePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('products').select('*').order('category').order('name').then(({ data }) => {
      setProducts(data ?? [])
      setLoading(false)
    })
  }, [])

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
    if (!user) return

    // Create the sale
    const { data: sale, error } = await supabase
      .from('sales')
      .insert({ agent_id: user.id, total_amount: total, status: 'confirmed', created_at: new Date().toISOString() })
      .select()
      .single()

    if (error || !sale) { setConfirming(false); alert('Error creating sale'); return }

    // Create sale items
    const items = cart.map(i => ({
      sale_id: sale.id,
      product_id: i.product.id,
      quantity: i.quantity,
      unit_price: i.product.sale_price,
      subtotal: i.product.sale_price * i.quantity,
    }))
    await supabase.from('sale_items').insert(items)

    // Decrease stock
    for (const item of cart) {
      await supabase.rpc('decrease_stock', { p_product_id: item.product.id, p_quantity: item.quantity })
    }

    router.push(`/receipt/${sale.id}`)
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex gap-6 h-[calc(100vh-80px)]">
      {/* Product list */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">New Sale</h1>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="border border-gray-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:border-blue-500"
        />
        <div className="flex-1 overflow-auto">
          {loading ? (
            <p className="text-center text-gray-400 py-10">Loading products...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map(p => {
                const inCart = cart.find(i => i.product.id === p.id)
                return (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 hover:border-blue-300 transition-colors">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover border border-gray-100 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-300 flex-shrink-0 text-xs">No img</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.unit} · Stock: {p.stock_quantity}</p>
                      <p className="text-sm font-semibold text-gray-900">{p.sale_price.toLocaleString()}</p>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(p.id, inCart.quantity - 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center">−</button>
                        <span className="text-sm w-6 text-center">{inCart.quantity}</span>
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
      </div>

      {/* Cart */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white border border-gray-200 rounded-lg h-full flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Order Summary</h2>
          </div>
          <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No items added yet</p>
            ) : cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-400">{item.product.sale_price.toLocaleString()} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="w-5 h-5 rounded bg-gray-100 text-xs flex items-center justify-center">−</button>
                  <span className="text-xs w-5 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="w-5 h-5 rounded bg-gray-100 text-xs flex items-center justify-center">+</button>
                </div>
                <span className="text-xs font-medium text-gray-800 w-16 text-right">{(item.product.sale_price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-lg font-bold text-gray-900">{total.toLocaleString()}</span>
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
