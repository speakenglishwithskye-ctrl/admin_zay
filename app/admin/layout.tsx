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
  const supabase = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved === 'true') { setDark(true); document.documentElement.classList.add('dark') }
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''))
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

  return (
    <div className={`flex h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-30 h-full w-60 flex flex-col transition-transform duration-200 border-r ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className={`px-5 py-5 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>🏪 Inventory Manager</p>
          <p className={`text-xs mt-0.5 ${dark ? 'text-gray-400' : 'text-gray-400'}`}>Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-auto">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setSidebarOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname === link.href
                ? 'bg-blue-600 text-white font-medium'
                : dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Bottom: user info + dark mode + signout */}
        <div className={`px-3 py-4 border-t space-y-1 ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Current user */}
          <div className={`px-3 py-2 rounded-lg text-xs ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
            <p className="font-medium truncate">👤 {userEmail || 'Admin'}</p>
          </div>
          {/* Dark mode toggle */}
          <button onClick={toggleDark}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            <span>{dark ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
            <span className={`w-8 h-4 rounded-full transition-colors relative ${dark ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${dark ? 'left-4' : 'left-0.5'}`} />
            </span>
          </button>
          {/* Sign out */}
          <button onClick={handleLogout}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${dark ? 'text-red-400 hover:bg-gray-700' : 'text-red-500 hover:bg-red-50'}`}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`lg:hidden border-b px-4 py-3 flex items-center gap-3 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Inventory Manager</span>
        </header>
        <main className={`flex-1 overflow-auto p-6 ${dark ? 'text-gray-100' : ''}`}>{children}</main>
      </div>
    </div>
  )
}
