import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventId, reason } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'イベントIDが必要です' });
    }

    // イベント情報を取得
    const event = await kv.get(`event:${eventId}`);
    if (!event) {
      return res.status(404).json({ error: 'イベントが見つかりません' });
    }

    // 報告数を取得・更新
    const reportKey = `event:${eventId}:reports`;
    const currentReports = await kv.get(reportKey) || 0;
    const newReportCount = currentReports + 1;

    // 報告数を保存
    await kv.set(reportKey, newReportCount);

    // 報告詳細を保存（オプション：後でメール送信時に利用可能）
    const reportDetailKey = `event:${eventId}:report:${newReportCount}`;
    await kv.set(reportDetailKey, {
      reason: reason || '不適切なコンテンツ',
      reportedAt: new Date().toISOString()
    });

    // 3件以上の報告で自動削除
    if (newReportCount >= 3) {
      // イベントを削除
      await kv.del(`event:${eventId}`);

      // イベント一覧から削除
      const allEvents = await kv.get('events') || [];
      const updatedEvents = allEvents.filter(e => e.id !== eventId);
      await kv.set('events', updatedEvents);

      // 報告データもクリーンアップ
      await kv.del(reportKey);
      for (let i = 1; i <= newReportCount; i++) {
        await kv.del(`event:${eventId}:report:${i}`);
      }

      // TODO: ここでメール送信を実装可能
      // sendEmail({
      //   to: 'roiro0607@gmail.com',
      //   subject: `イベントが報告により削除されました: ${event.title}`,
      //   body: `イベントID: ${eventId}\n報告数: ${newReportCount}`
      // });

      return res.status(200).json({
        message: 'イベントが報告されました。報告数が3件に達したため、イベントを削除しました。',
        deleted: true,
        reportCount: newReportCount
      });
    }

    return res.status(200).json({
      message: 'イベントを報告しました',
      deleted: false,
      reportCount: newReportCount
    });
  } catch (error) {
    console.error('Report error:', error);
    return res.status(500).json({
      error: 'イベントの報告に失敗しました',
      details: error.message
    });
  }
}
