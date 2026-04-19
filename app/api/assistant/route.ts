import { NextRequest, NextResponse } from 'next/server'
import { getAssistantDecision } from '@/lib/ai/assistant'
import type { AssistantRequest } from '@/types/assistant'

export async function POST(req: NextRequest) {
  let body: Partial<AssistantRequest>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = String(body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const decision = await getAssistantDecision({
    message,
    currentPath: String(body.currentPath ?? '/dashboard'),
    recentExecutedActionIds: Array.isArray(body.recentExecutedActionIds)
      ? body.recentExecutedActionIds.filter((id): id is string => typeof id === 'string')
      : [],
  })

  return NextResponse.json(decision, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
