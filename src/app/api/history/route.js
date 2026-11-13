import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')?.trim().toUpperCase()
    
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL
    const res = await fetch(`${gasUrl}?action=history&id=${id}`, { cache: 'no-store' })
    
    const rawText = await res.text()
    try {
      const data = JSON.parse(rawText)
      return NextResponse.json(data)
    } catch (e) {
      console.error("Apps Script Error:", rawText.substring(0, 100))
      return NextResponse.json({ success: false, message: 'Apps Script Error' }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}