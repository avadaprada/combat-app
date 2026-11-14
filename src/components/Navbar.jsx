'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState({ name: '-', tier: '' })
  const [isMenuOpen, setIsMenuOpen] = useState(false) // State untuk menu mobile

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return

        const combatId = authUser.email.split('@')[0].trim().toUpperCase()
        const res = await fetch(`/api/profile?id=${combatId}`)
        const result = await res.json()
        
        if (result.success && result.data) {
          setUser({ 
            name: result.data.name || combatId, 
            tier: result.data.tier || '' 
          })
        }
      } catch (err) {
        console.error("Gagal memuat profil di navbar:", err)
      }
    }

    fetchProfile()
  }, [supabase])

  // Tutup menu mobile setiap kali pindah halaman
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Combat Arena', path: '/arena' },
    { name: 'History', path: '/history' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-[#1c222e]/90 backdrop-blur-md border-b border-[#8c7f73]">
      <div className="max-w-[1250px] mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo Kiri */}
        <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
          <img 
            src="https://i.imgur.com/e2FcAoM.png" 
            alt="Logo" 
            className="w-8 h-8 md:w-9 md:h-9 object-contain" 
          />
          <div className="flex flex-col justify-center">
            <span className="text-[#8c7f73] text-[8px] md:text-[9px] font-bold uppercase tracking-[2px] leading-none mb-1">
              Practitioner Device
            </span>
            <span className="text-[#e3d0b3] font-bold tracking-widest text-xs md:text-sm leading-none">
              COMBAT CONSOLE
            </span>
          </div>
        </Link>

        {/* Menu Tengah (Hanya Desktop) */}
        <nav className="hidden md:flex gap-4">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.path)
            return (
              <Link 
                key={link.path} 
                href={link.path}
                className={`px-3 py-2 text-xs font-bold tracking-wider transition-colors ${
                  isActive 
                    ? 'text-[#e3d0b3] border-b-2 border-[#e3d0b3]' 
                    : 'text-[#8c7f73] hover:text-[#e3d0b3] border-b-2 border-transparent'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Sisi Kanan */}
        <div className="flex items-center gap-3 md:gap-4">
          
          {/* PROFIL MOBILE (Hanya Nama & Tier) */}
          <div className="flex md:hidden flex-col items-end">
            <span className="text-[#e3d0b3] font-bold text-xs leading-tight">{user.name}</span>
            {user.tier && (
              <span className="text-[#8c7f73] text-[9px] font-bold tracking-widest uppercase border border-[#8c7f73] px-1 py-0.5 mt-0.5 rounded-sm">
                {user.tier}
              </span>
            )}
          </div>

          {/* TOMBOL HAMBURGER MOBILE */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-[#e3d0b3] p-1 focus:outline-none"
          >
            {isMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            )}
          </button>

          {/* PROFIL & LOGOUT DESKTOP */}
          <div className="hidden md:flex items-center gap-4">
            <button className="text-[#8c7f73] hover:text-[#e3d0b3] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>
            <div className="w-[1px] h-6 bg-[#8c7f73] opacity-50"></div>
            <div className="flex flex-col items-end">
              <span className="text-[#e3d0b3] font-bold text-sm leading-tight">{user.name}</span>
              {user.tier && (
                <span className="text-[#8c7f73] text-[9px] font-bold tracking-widest uppercase border border-[#8c7f73] px-1.5 py-0.5 mt-0.5">
                  {user.tier}
                </span>
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="ml-2 w-9 h-9 rounded-full border border-[#85200c] text-[#f0b9a8] flex items-center justify-center hover:bg-[#85200c] transition-colors"
              title="Keluar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </button>
          </div>
        </div>

      </div>

      {/* DROPDOWN MENU MOBILE */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-[#1c222e] border-b border-[#8c7f73] flex flex-col px-4 py-4 shadow-xl z-50">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.path)
            return (
              <Link 
                key={link.path} 
                href={link.path}
                className={`py-3 text-sm font-bold tracking-wider border-b border-[#8c7f73]/30 ${
                  isActive ? 'text-[#e3d0b3]' : 'text-[#8c7f73]'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
          <button 
            onClick={handleLogout}
            className="mt-4 w-full bg-[#85200c] text-white py-3 rounded text-xs font-bold tracking-widest uppercase transition-colors"
          >
            LOGOUT
          </button>
        </div>
      )}
    </header>
  )
}