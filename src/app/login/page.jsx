'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Panggil API backend kita (untuk cek password lama & migrasi)
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
      })
      
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.message || 'Login gagal')
      }

      // 2. Set session login di browser
      const { error } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      })

      if (error) throw error

      // 3. Pindah ke halaman dashboard
      router.push('/dashboard')
      router.refresh()

    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1c222e] flex items-center justify-center p-4">
      <div className="max-w-md w-full border-2 border-[#8c7f73] p-8 relative">
        
        {/* Dekorasi sudut */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#e3d0b3]"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#e3d0b3]"></div>

        <h1 className="text-3xl font-bold text-center text-[#e3d0b3] mb-2 tracking-widest">
          COMBAT CONSOLE
        </h1>
        <p className="text-center text-[#8c7f73] text-sm mb-8 uppercase tracking-widest">
          Practitioner Access Portal
        </p>

        {errorMsg && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 mb-6 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[#8c7f73] text-sm mb-2">ID Praktisi</label>
            <input 
              type="text" 
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="cth: 2402JM001"
              className="w-full bg-[#12161f] border border-[#8c7f73] text-[#e3d0b3] p-3 focus:outline-none focus:border-[#e3d0b3]"
              required
            />
          </div>

                    <div>
            <label className="block text-[#8c7f73] text-sm mb-2">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#12161f] border border-[#8c7f73] text-[#e3d0b3] p-3 pr-12 focus:outline-none focus:border-[#e3d0b3]"
                required
              />
              {/* Tombol Mata */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c7f73] hover:text-[#e3d0b3] transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                )}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#e3d0b3] text-[#1c222e] font-bold p-3 mt-4 hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

      </div>
    </div>
  )
}