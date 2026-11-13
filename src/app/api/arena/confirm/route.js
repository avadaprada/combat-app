import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL
    
    // Tembak doPost di Apps Script
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/plain' }, // Apps Script lebih suka plain text
      body: JSON.stringify({
        action: 'confirm_deck',
        id: body.id,
        duelKey: body.duelKey,
        style: body.style,
        materials: body.materials
      })
    })
    const data = await res.json()
    
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}