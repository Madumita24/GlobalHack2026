import { NextRequest, NextResponse } from 'next/server'

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey || apiKey === 'your_api_key_here') {
    return NextResponse.json(
      { error: 'ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to .env.local.' },
      { status: 503 },
    )
  }

  let text: string
  try {
    const body = await req.json()
    text = String(body.text ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // Truncate to 5000 chars (ElevenLabs limit per request)
  const truncated = text.slice(0, 5000)

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: truncated,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    },
  )

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => 'unknown error')
    return NextResponse.json(
      { error: `ElevenLabs error ${upstream.status}: ${errText}` },
      { status: upstream.status },
    )
  }

  const audio = await upstream.arrayBuffer()

  return new NextResponse(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
