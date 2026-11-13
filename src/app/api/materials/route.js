import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL

    // Tembak Apps Script dengan action=materials
    const res = await fetch(`${gasUrl}?action=materials`, {
      method: 'GET',
      cache: 'no-store' // Jangan disimpan di cache, biar selalu update
    })

    const data = await res.json()
    return NextResponse.json(data)

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}