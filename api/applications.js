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
      // すべての応募を取得、またはイベントIDでフィルタリング
      const { eventId } = req.query;
      const appKeys = await kv.keys('app:*');
      const applications = [];

      for (const key of appKeys) {
        const app = await kv.get(key);
        if (app) {
          const appData = typeof app === 'string' ? JSON.parse(app) : app;

          // eventIdが指定されている場合はフィルタリング
          if (!eventId || appData.eventId === eventId) {
            applications.push(appData);
          }
        }
      }

      return res.status(200).json(applications);
    }

    if (req.method === 'POST') {
      // 新しい応募を作成
      const applicationData = req.body;
      const appId = `app_${Date.now()}`;

      const newApplication = {
        id: appId,
        ...applicationData,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      await kv.set(`app:${appId}`, JSON.stringify(newApplication));

      return res.status(201).json(newApplication);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
