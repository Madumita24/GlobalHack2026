import { NextResponse } from 'next/server'
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb } from '@/lib/data/dynamodb'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ actionId: string }> },
) {
  const { actionId } = await params
  const tableName = process.env.DDB_ACTIONS_TABLE

  if (!tableName) {
    return NextResponse.json({ ok: false, error: 'Missing DDB_ACTIONS_TABLE' }, { status: 500 })
  }

  const lookup = await ddb.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: 'actionId = :actionId',
      ExpressionAttributeValues: {
        ':actionId': actionId,
      },
      Limit: 1,
    }),
  )

  const action = lookup.Items?.[0] as { pk?: string; sk?: string } | undefined
  if (!action?.pk || !action?.sk) {
    return NextResponse.json({ ok: false, error: 'Action not found' }, { status: 404 })
  }

  await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        pk: action.pk,
        sk: action.sk,
      },
      UpdateExpression: 'SET #status = :status, completedAt = :completedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'done',
        ':completedAt': new Date().toISOString(),
      },
    }),
  )

  return NextResponse.json({ ok: true })
}
