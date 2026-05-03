'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { href: '/admin/dashboard', label: '📊 Overview' },
  { href: '/admin/products', label: '📦 Products' },
  { href: '/admin/new-sale', label: '🛒 New Sale' },
  { href: '/admin/sales', label: '🧾 Sales' },
  { href: '/admin/agents', label: '👥 Agents' },
  { href: '/admin/users', label: '⚙️ Users' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved === 'true') { setDark(true); document.documentElement.classList.add('dark') }
    supabase.auth.getUser().then(async ({ data }) => {
      setUserEmail(data.user?.email ?? '')
      if (data.user) {
        const { data: profile } = await supabase
          .from('users_profiles').select('full_name').eq('id', data.user.id).single()
        setFullName(profile?.full_name ?? '')
        setNameInput(profile?.full_name ?? '')
      }
    })
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('darkMode', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const saveName = async () => {
    if (!nameInput.trim()) return
    setSavingName(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users_profiles').update({ full_name: nameInput.trim() }).eq('id', user.id)
      setFullName(nameInput.trim())
    }
    setSavingName(false)
    setEditingName(false)
  }

  const bg    = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const text  = dark ? 'text-gray-300' : 'text-gray-600'
  const hover = dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'

  return (
    <div className={`flex h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-30 h-full w-60 flex flex-col transition-transform duration-200 border-r ${bg} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className={`px-5 py-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Logo" className="w-7 h-7 object-contain rounded" onError={e => (e.target as HTMLImageElement).style.display='none'} />
            <div>
              <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Zay Admin</p>
              <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-400'}`}>Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-auto">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setSidebarOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname === link.href
                ? 'bg-blue-600 text-white font-medium'
                : `${text} ${hover}`}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className={`px-3 py-3 border-t space-y-1 ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Profile / Edit name */}
          <div className={`rounded-lg px-3 py-2 ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-0.5">
              <p className={`text-xs font-semibold truncate ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                👤 {fullName || userEmail || 'Admin'}
              </p>
              <button onClick={() => { setEditingName(true); setNameInput(fullName) }}
                className={`text-xs p-1 rounded transition-colors ${dark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                title="Edit display name">
                ✏️
              </button>
            </div>
            <p className={`text-[10px] truncate ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{userEmail}</p>
          </div>

          {/* Inline name editor */}
          {editingName && (
            <div className={`rounded-lg px-2 py-2 space-y-1.5 border ${dark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
              <p className={`text-[10px] font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Edit Display Name</p>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                className={`w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${dark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Your name"
                autoFocus
              />
              <div className="flex gap-1">
                <button onClick={saveName} disabled={savingName}
                  className="flex-1 text-[10px] py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                  {savingName ? '...' : 'Save'}
                </button>
                <button onClick={() => setEditingName(false)}
                  className={`flex-1 text-[10px] py-1 rounded ${dark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button onClick={toggleDark}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            <span>{dark ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
            <span className={`w-8 h-4 rounded-full transition-colors relative ${dark ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${dark ? 'left-4' : 'left-0.5'}`} />
            </span>
          </button>
          <button onClick={handleLogout}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${dark ? 'text-red-400 hover:bg-gray-700' : 'text-red-500 hover:bg-red-50'}`}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`lg:hidden border-b px-4 py-3 flex items-center gap-3 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Zay Admin</span>
        </header>
        <main className={`flex-1 overflow-auto p-4 md:p-6 ${dark ? 'text-gray-100' : ''}`}>{children}</main>
      </div>
    </div>
  )
}