import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      // 特定のイベントを取得
      const event = await kv.get(`event:${id}`);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // 文字列の場合はパース
      const eventData = typeof event === 'string' ? JSON.parse(event) : event;
      return res.status(200).json(eventData);
    }

    if (req.method === 'PATCH') {
      // イベントを更新（応募者選択など）
      const event = await kv.get(`event:${id}`);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const eventData = typeof event === 'string' ? JSON.parse(event) : event;
      const updates = req.body;

      const updatedEvent = {
        ...eventData,
        ...updates
      };

      await kv.set(`event:${id}`, JSON.stringify(updatedEvent));

      return res.status(200).json(updatedEvent);
    }

    if (req.method === 'PUT') {
      // イベント情報を更新（タイトル、説明など）
      const event = await kv.get(`event:${id}`);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const eventData = typeof event === 'string' ? JSON.parse(event) : event;
      const updates = req.body;

      const updatedEvent = {
        ...eventData,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await kv.set(`event:${id}`, JSON.stringify(updatedEvent));

      return res.status(200).json(updatedEvent);
    }

    if (req.method === 'DELETE') {
      // イベントを削除
      const event = await kv.get(`event:${id}`);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      await kv.del(`event:${id}`);

      return res.status(200).json({ message: 'Event deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
