import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const table = process.env.PARTICIPANTS_TABLE;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

function claims(event) {
  return event?.requestContext?.authorizer?.jwt?.claims ?? {};
}

function groups(event) {
  const raw = claims(event)['cognito:groups'];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

function requireAdmin(event) {
  if (!groups(event).includes('admin')) {
    const err = new Error('admin required');
    err.statusCode = 403;
    throw err;
  }
}

function normalizeWallet(value) {
  const wallet = String(value ?? '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    const err = new Error('invalid wallet');
    err.statusCode = 400;
    throw err;
  }
  return wallet;
}

function bodyOf(event) {
  if (!event.body) return {};
  try { return JSON.parse(event.body); }
  catch {
    const err = new Error('invalid JSON');
    err.statusCode = 400;
    throw err;
  }
}

export async function handler(event) {
  try {
    const method = event.requestContext?.http?.method;
    const path = event.rawPath;

    if (method === 'GET' && path === '/health') {
      return json(200, {
        ok: true,
        chainId: Number(process.env.CHAIN_ID),
        contractAddress: process.env.CARD_CONTRACT_ADDRESS || null,
        mode: 'controlled-pilot',
      });
    }

    if (method === 'GET' && path === '/me') {
      const email = claims(event).email ?? null;
      const sub = claims(event).sub ?? null;
      return json(200, { sub, email, groups: groups(event) });
    }

    if (path === '/admin/participants') {
      requireAdmin(event);

      if (method === 'GET') {
        const result = await db.send(new ScanCommand({ TableName: table, Limit: 200 }));
        return json(200, { participants: result.Items ?? [] });
      }

      if (method === 'POST') {
        const input = bodyOf(event);
        const wallet = normalizeWallet(input.wallet);
        const role = input.role;
        const approved = Boolean(input.approved);
        if (!['member', 'merchant'].includes(role)) return json(400, { error: 'role must be member or merchant' });

        const existing = await db.send(new GetCommand({ TableName: table, Key: { wallet } }));
        if (approved && existing.Item?.approved && existing.Item?.role && existing.Item.role !== role) {
          return json(409, { error: 'wallet already approved for the other role' });
        }

        const now = new Date().toISOString();
        const item = {
          wallet,
          role,
          approved,
          updatedAt: now,
          updatedBy: claims(event).sub ?? 'unknown',
        };
        await db.send(new PutCommand({ TableName: table, Item: item }));
        console.log(JSON.stringify({ event: 'participant_change', ...item }));
        return json(200, { participant: item });
      }
    }

    return json(404, { error: 'not found' });
  } catch (err) {
    console.error(err);
    return json(err.statusCode ?? 500, { error: err.statusCode ? err.message : 'internal error' });
  }
}
