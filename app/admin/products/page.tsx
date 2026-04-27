'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Product = {
  id: string
  name: string
  category: string
  book_price: number
  sale_price: number
  stock_quantity: number
  unit: string
  image_url: string | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', category: '', book_price: '', sale_price: '', stock_quantity: '', unit: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('category').order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', category: '', book_price: '', sale_price: '', stock_quantity: '0', unit: '' })
    setImageFile(null)
    setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, category: p.category, book_price: String(p.book_price), sale_price: String(p.sale_price), stock_quantity: String(p.stock_quantity), unit: p.unit })
    setImageFile(null)
    setShowModal(true)
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
      name: form.name,
      category: form.category,
      book_price: parseFloat(form.book_price),
      sale_price: parseFloat(form.sale_price),
      stock_quantity: parseInt(form.stock_quantity),
      unit: form.unit,
      image_url,
      updated_at: new Date().toISOString(),
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

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
          + Add Product
        </button>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Unit</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Book Price</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Sale Price</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No products found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded object-cover border border-gray-200" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs">No img</div>
                      )}
                      <span className="text-gray-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category}</td>
                  <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{p.book_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{p.sale_price?.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.stock_quantity <= 5 ? 'text-red-600' : 'text-gray-700'}`}>{p.stock_quantity}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-base font-semibold mb-4">{editing ? 'Edit Product' : 'Add Product'}</h2>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} className="text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
