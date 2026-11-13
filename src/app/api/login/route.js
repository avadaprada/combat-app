import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const { id, password } = await req.json()

    if (!id || !password) {
      return NextResponse.json({ success: false, message: 'ID dan password wajib diisi' })
    }

    const supabaseAdmin = createAdminClient()
    const email = `${id.toLowerCase()}@combat.local`
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL

    // 1. Cek ke Google Sheets
    const verifyRes = await fetch(`${gasUrl}?action=verify_login&id=${id}&password=${encodeURIComponent(password)}`)
    const rawText = await verifyRes.text()

    let verifyData;
    try {
      verifyData = JSON.parse(rawText)
    } catch (e) {
      console.error("Apps Script Error (Bukan JSON):", rawText.substring(0, 100))
      return NextResponse.json({ success: false, message: 'Sistem Google Sheets sedang error. Pastikan Apps Script sudah di-Deploy ulang (New Version).' })
    }

    if (!verifyData.success) {
      return NextResponse.json({ success: false, message: verifyData.message || 'ID atau Password salah.' })
    }

    // 2. Sinkronisasi ke Supabase Auth
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = users.find(u => u.email === email)

    let authData, authError

    if (existingUser) {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password })
      const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
      authData = data
      authError = error
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true
      })
      if (createError) throw createError
      
      await supabaseAdmin.from('practitioners').update({ auth_user_id: newUser.user.id }).eq('combat_id', id)
      const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
      authData = data
      authError = error
    }

    if (authError) throw authError
    return NextResponse.json({ success: true, session: authData.session })

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}