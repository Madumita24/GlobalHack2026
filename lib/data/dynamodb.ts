import 'server-only'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const region = process.env.AWS_REGION ?? 'us-east-1'

const client = new DynamoDBClient({ region })

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

export async function scanTable<T extends Record<string, unknown>>(tableName?: string): Promise<T[]> {
  if (!tableName) return []

  const items: T[] = []
  let ExclusiveStartKey: Record<string, unknown> | undefined

  do {
    const result = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey,
      }),
    )

    items.push(...((result.Items ?? []) as T[]))
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (ExclusiveStartKey)

  return items
}
