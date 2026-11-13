import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL
    
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'finalize_duel',
        id: body.id,
        duelKey: body.duelKey
      })
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}