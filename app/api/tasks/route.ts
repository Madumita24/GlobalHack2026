import { NextResponse } from 'next/server'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { ddb } from '@/lib/data/dynamodb'

type CreateTaskRequest = {
  title?: unknown
  description?: unknown
  actionType?: unknown
  personId?: unknown
  dueDate?: unknown
  dueTime?: unknown
}

const VALID_ACTION_TYPES = new Set(['call', 'text', 'email', 'schedule_followup'])

export async function POST(request: Request) {
  const tableName = process.env.DDB_ACTIONS_TABLE

  if (!tableName) {
    return NextResponse.json({ ok: false, error: 'Missing DDB_ACTIONS_TABLE' }, { status: 500 })
  }

  let payload: CreateTaskRequest
  try {
    payload = (await request.json()) as CreateTaskRequest
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid task payload.' }, { status: 400 })
  }

  const title = cleanString(payload.title)
  const description = cleanString(payload.description) || title
  const rawActionType = cleanString(payload.actionType) || 'schedule_followup'
  const actionType = VALID_ACTION_TYPES.has(rawActionType) ? rawActionType : 'schedule_followup'
  const personId = cleanString(payload.personId)
  const dueAt = buildDueAt(cleanString(payload.dueDate), cleanString(payload.dueTime))

  if (!title) {
    return NextResponse.json({ ok: false, error: 'Task title is required.' }, { status: 400 })
  }

  const actionId = `manual_task_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
  const now = new Date().toISOString()

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: personId ? `PERSON#${personId}` : `TASK#${actionId}`,
        sk: `ACTION#${actionId}`,
        actionId,
        actionType,
        title,
        description,
        personId: personId || undefined,
        priorityScore: 55,
        urgency: dueAt ? 'medium' : 'low',
        confidence: 88,
        reasons: ['Created manually by the agent.', dueAt ? `Scheduled for ${dueAt}` : 'No due time set.'],
        status: 'pending',
        draftMessage: description,
        dueAt,
        origin: 'manual',
        createdAt: now,
      },
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
    }),
  )

  return NextResponse.json({ ok: true, actionId })
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildDueAt(date: string, time: string) {
  if (!date) return undefined
  const normalizedTime = time || '09:00'
  const parsed = new Date(`${date}T${normalizedTime}:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}
