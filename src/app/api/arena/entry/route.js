import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')?.trim().toUpperCase()
    
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL
    const res = await fetch(`${gasUrl}?action=arena_entry&id=${id}`, { cache: 'no-store' })
    
    // Baca response sebagai teks dulu
    const rawText = await res.text()

    try {
      // Coba jadikan JSON
      const data = JSON.parse(rawText)
      return NextResponse.json(data)
    } catch (e) {
      // Kalau gagal, berarti yang dikirim bukan JSON (kemungkinan HTML)
      console.error("Apps Script mengembalikan HTML, bukan JSON:", rawText.substring(0, 200))
      return NextResponse.json({ 
        success: false, 
        message: 'Apps Script tidak mengembalikan JSON. Pastikan Deploy ulang sudah dilakukan.' 
      }, { status: 500 })
    }

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}