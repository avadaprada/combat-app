import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    // Ubah ke huruf besar semua
    const id = searchParams.get('id')?.trim().toUpperCase()

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID kosong' }, { status: 400 })
    }

    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL
    if (!gasUrl) {
       return NextResponse.json({ success: false, message: 'URL Google Apps Script belum di-set' }, { status: 500 })
    }

    const targetUrl = `${gasUrl}?action=api&id=${encodeURIComponent(id)}`
    
    // Tembak API Apps Script
    const res = await fetch(targetUrl, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow'
    })

    // Ambil response mentahnya dulu
    const rawText = await res.text()
    
    // CETAK DI TERMINAL VS CODE UNTUK CEK
    console.log("=== CCTV API PROFILE ===")
    console.log("Mencari ID:", id)
    console.log("Jawaban dari Google Sheets:", rawText)

    // Coba ubah teks menjadi JSON
    try {
      const data = JSON.parse(rawText)
      return NextResponse.json(data)
    } catch (parseError) {
      console.error("Format dari Apps Script bukan JSON:", rawText)
      return NextResponse.json({ success: false, message: 'Apps Script tidak mengembalikan JSON yang valid.' }, { status: 500 })
    }

  } catch (err) {
    console.error("Error Fetch:", err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}