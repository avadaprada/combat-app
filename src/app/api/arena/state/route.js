import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const duelKey = searchParams.get('duelKey')
    
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL
    const res = await fetch(`${gasUrl}?action=duel_state&duelKey=${duelKey}`, { cache: 'no-store' })
    const rawText = await res.text()
    
    try {
      const data = JSON.parse(rawText)
      return NextResponse.json(data)
    } catch (e) {
      return NextResponse.json({ success: false, message: 'Apps Script Error' }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}