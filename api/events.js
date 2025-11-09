import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // すべてのイベントを取得
      const eventKeys = await kv.keys('event:*');
      const events = [];

      for (const key of eventKeys) {
        const event = await kv.get(key);
        if (event) {
          events.push(event);
        }
      }

      return res.status(200).json(events);
    }

    if (req.method === 'POST') {
      // 新しいイベントを作成
      const eventData = req.body;
      const eventId = `evt_${Date.now()}`;

      const newEvent = {
        id: eventId,
        ...eventData,
        createdAt: new Date().toISOString(),
        status: 'open',
        selectedApplicants: []
      };

      await kv.set(`event:${eventId}`, JSON.stringify(newEvent));

      return res.status(201).json(newEvent);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
