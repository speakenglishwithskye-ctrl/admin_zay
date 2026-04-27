'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Product = {
  id: string; name: string; category: string; book_price: number
  sale_price: number; stock_quantity: number; unit: string; image_url: string | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filterStock, setFilterStock] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', category: '', book_price: '', sale_price: '', stock_quantity: '', unit: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('category').order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort()
  const units = [...new Set(products.map(p => p.unit).filter(Boolean))].sort()

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCategory || p.category === filterCategory
    const matchUnit = !filterUnit || p.unit === filterUnit
    const matchStock = !filterStock ||
      (filterStock === 'low' && p.stock_quantity <= 10) ||
      (filterStock === 'out' && p.stock_quantity === 0) ||
      (filterStock === 'ok' && p.stock_quantity > 10)
    return matchSearch && matchCat && matchUnit && matchStock
  })

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', category: '', book_price: '', sale_price: '', stock_quantity: '100', unit: '' })
    setImageFile(null)
    setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, category: p.category, book_price: String(p.book_price), sale_price: String(p.sale_price), stock_quantity: String(p.stock_quantity), unit: p.unit })
    setImageFile(null)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    setDeleting(id)
    await supabase.from('products').delete().eq('id', id)
    setDeleting(null)
    fetchProducts()
  }

  const handleSave = async () => {
    setSaving(true)
    let image_url = editing?.image_url ?? null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, imageFile)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
        image_url = urlData.publicUrl
      }
    }
    const payload = {
      name: form.name, category: form.category, book_price: parseFloat(form.book_price),
      sale_price: parseFloat(form.sale_price), stock_quantity: parseInt(form.stock_quantity),
      unit: form.unit, image_url, updated_at: new Date().toISOString(),
    }
    if (editing) {
      await supabase.from('products').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('products').insert({ ...payload, created_at: new Date().toISOString() })
    }
    setSaving(false)
    setShowModal(false)
    fetchProducts()
  }

  return (
    <div>
      {/* Header — sticky with Add button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Products <span className="text-sm font-normal text-gray-400">({filtered.length})</span></h1>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          + Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">All Units</option>
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterStock} onChange={e => setFilterStock(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">All Stock</option>
          <option value="out">Out of Stock</option>
          <option value="low">Low Stock (≤10)</option>
          <option value="ok">In Stock</option>
        </select>
        {(search || filterCategory || filterUnit || filterStock) && (
          <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterUnit(''); setFilterStock('') }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Book Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading products...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No products found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-gray-200" />
                        : <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 text-xs">📦</div>
                      }
                      <span className="font-medium text-gray-800 dark:text-gray-100">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.category}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.unit}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{p.book_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{p.sale_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.stock_quantity === 0 ? 'bg-red-100 text-red-700' : p.stock_quantity <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50">
                        {deleting === p.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Add Button (bottom right) */}
      <button onClick={openAdd}
        className="fixed bottom-6 right-6 bg-blue-600 text-white w-12 h-12 rounded-full shadow-lg hover:bg-blue-700 transition-colors text-2xl flex items-center justify-center z-10">
        +
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-base font-semibold mb-4 dark:text-white">{editing ? '✏️ Edit Product' : '➕ Add Product'}</h2>
            <div className="space-y-3">
              {[
                { label: 'Product Name', key: 'name', type: 'text' },
                { label: 'Category', key: 'category', type: 'text' },
                { label: 'Unit', key: 'unit', type: 'text' },
                { label: 'Book Price', key: 'book_price', type: 'number' },
                { label: 'Sale Price', key: 'sale_price', type: 'number' },
                { label: 'Stock Quantity', key: 'stock_quantity', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{field.label}</label>
                  <input type={field.type} value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} className="text-sm dark:text-gray-300" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}