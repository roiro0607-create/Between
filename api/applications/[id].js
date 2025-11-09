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
      // 特定の応募を取得
      const application = await kv.get(`app:${id}`);

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const appData = typeof application === 'string' ? JSON.parse(application) : application;
      return res.status(200).json(appData);
    }

    if (req.method === 'PATCH') {
      // 応募を更新（ステータス変更など）
      const application = await kv.get(`app:${id}`);

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const appData = typeof application === 'string' ? JSON.parse(application) : application;
      const updates = req.body;

      const updatedApplication = {
        ...appData,
        ...updates
      };

      await kv.set(`app:${id}`, JSON.stringify(updatedApplication));

      return res.status(200).json(updatedApplication);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
