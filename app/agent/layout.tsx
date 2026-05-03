'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { href: '/agent/dashboard', label: 'My Sales' },
  { href: '/agent/new-sale', label: 'New Voucher' },
  { href: '/agent/receipts', label: 'My Vouchers' },
]

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [fullName, setFullName]       = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState('')
  const [savingName, setSavingName]   = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: p } = await supabase.from('users_profiles').select('full_name').eq('id', data.user.id).single()
        setFullName(p?.full_name ?? '')
        setNameInput(p?.full_name ?? '')
      }
    })
  }, [])

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Logo" className="w-7 h-7 object-contain rounded"
                onError={e => (e.target as HTMLImageElement).style.display='none'} />
              <span className="text-sm font-bold text-gray-900 hidden sm:block">Zay Shop</span>
            </div>
            <nav className="flex gap-1">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors min-h-[44px] flex items-center ${pathname === link.href ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Agent name + edit + logout */}
          <div className="flex items-center gap-2 relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 min-h-[44px]">
              <span className="text-xs">👤</span>
              <span className="hidden sm:block max-w-[100px] truncate">{fullName || 'Agent'}</span>
              <span className="text-gray-400 text-xs">▾</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56 z-50">
                <p className="text-xs text-gray-500 mb-2">Signed in as <span className="font-medium text-gray-700">{fullName}</span></p>
                {!editingName ? (
                  <button onClick={() => { setEditingName(true); setNameInput(fullName) }}
                    className="w-full text-left text-xs text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg mb-1 min-h-[36px]">
                    ✏️ Edit Display Name
                  </button>
                ) : (
                  <div className="space-y-1.5 mb-2">
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveName()}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Display name" autoFocus />
                    <div className="flex gap-1">
                      <button onClick={saveName} disabled={savingName}
                        className="flex-1 text-[10px] py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[32px]">
                        {savingName ? '...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingName(false)}
                        className="flex-1 text-[10px] py-1.5 bg-gray-100 text-gray-600 rounded-lg min-h-[32px]">Cancel</button>
                    </div>
                  </div>
                )}
                <hr className="my-1 border-gray-100" />
                <button onClick={handleLogout}
                  className="w-full text-left text-xs text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg min-h-[36px]">
                  🚪 Sign Out
                </button>
              </div>
            )}
            {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-4 md:py-6">{children}</main>
    </div>
  )
}