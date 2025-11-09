import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// トークンからユーザーIDを取得（オプショナル）
function getUserIdFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { userId } = req.query;

      // すべてのイベントを取得
      const eventKeys = await kv.keys('event:*');
      const events = [];

      for (const key of eventKeys) {
        const eventData = await kv.get(key);
        if (eventData) {
          const event = typeof eventData === 'string' ? JSON.parse(eventData) : eventData;

          // userIdが指定されている場合はフィルタリング
          if (!userId || event.creatorId === userId) {
            events.push(event);
          }
        }
      }

      return res.status(200).json(events);
    }

    if (req.method === 'POST') {
      // 認証トークンからユーザーIDを取得（オプショナル）
      const userId = getUserIdFromToken(req.headers.authorization);

      const eventData = req.body;
      const eventId = `evt_${Date.now()}`;

      const newEvent = {
        id: eventId,
        ...eventData,
        creatorId: userId || null,
        isAnonymous: !userId,
        createdAt: new Date().toISOString(),
        status: 'open',
        selectedApplicants: []
      };

      // イベントを保存
      // 匿名イベント（未ログイン）の場合は7日後に自動削除
      if (!userId) {
        const ttl = 7 * 24 * 60 * 60; // 7日間（秒）
        await kv.set(`event:${eventId}`, JSON.stringify(newEvent), { ex: ttl });
      } else {
        await kv.set(`event:${eventId}`, JSON.stringify(newEvent));
      }

      return res.status(201).json(newEvent);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
