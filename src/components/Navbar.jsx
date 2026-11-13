'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  // State untuk menyimpan data dari API
  const [user, setUser] = useState({ name: '-', tier: '' })

  useEffect(() => {
    async function fetchProfile() {
      try {
        // 1. Dapatkan ID dari sesi login Supabase
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return

        const combatId = authUser.email.split('@')[0].trim().toUpperCase()

        // 2. Panggil API yang sama persis dengan Dashboard
        const res = await fetch(`/api/profile?id=${combatId}`)
        const result = await res.json()
        
        // 3. Simpan Nama dan Tier ke state
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
  }, [supabase]) // Cukup jalankan sekali saat komponen dimuat

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
            className="w-9 h-9 object-contain" 
          />
          <div className="flex flex-col justify-center">
            <span className="text-[#8c7f73] text-[9px] font-bold uppercase tracking-[2px] leading-none mb-1">
              Practitioner Device
            </span>
            <span className="text-[#e3d0b3] font-bold tracking-widest text-sm leading-none">
              COMBAT CONSOLE
            </span>
          </div>
        </Link>

        {/* Menu Tengah */}
        <nav className="flex gap-1 md:gap-4">
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

        {/* Profil & Logout (Kanan) */}
        <div className="flex items-center gap-4">
          {/* Ikon Pencarian */}
          <button className="text-[#8c7f73] hover:text-[#e3d0b3] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>

          {/* Garis Pemisah */}
          <div className="w-[1px] h-6 bg-[#8c7f73] opacity-50"></div>

          {/* Info User */}
          <div className="flex flex-col items-end">
            <span className="text-[#e3d0b3] font-bold text-sm leading-tight">{user.name}</span>
            {user.tier && (
              <span className="text-[#8c7f73] text-[9px] font-bold tracking-widest uppercase border border-[#8c7f73] px-1.5 py-0.5 mt-0.5">
                {user.tier}
              </span>
            )}
          </div>

          {/* Tombol Logout Bulat */}
          <button 
            onClick={handleLogout}
            className="ml-2 w-9 h-9 rounded-full border border-[#85200c] text-[#f0b9a8] flex items-center justify-center hover:bg-[#85200c] transition-colors"
            title="Keluar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>

      </div>
    </header>
  )
}