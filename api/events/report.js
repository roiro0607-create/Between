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

    console.log('Report request:', { eventId, reason });

    if (!eventId) {
      return res.status(400).json({ error: 'イベントIDが必要です' });
    }

    // イベント情報を取得
    const event = await kv.get(`event:${eventId}`);
    if (!event) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ error: 'イベントが見つかりません' });
    }

    // イベントの基本情報チェック
    if (!event.title || event.maxParticipants === undefined || event.maxParticipants === null) {
      console.log('Invalid event data:', event);
      return res.status(400).json({ error: 'このイベントは不正なデータのため報告できません。管理者にお問い合わせください。' });
    }

    // 報告数を取得・更新
    const reportKey = `event:${eventId}:reports`;
    const currentReports = await kv.get(reportKey) || 0;
    const newReportCount = currentReports + 1;

    // 報告数を保存
    await kv.set(reportKey, newReportCount);

    // 報告詳細を保存
    const reportDetailKey = `event:${eventId}:report:${newReportCount}`;
    await kv.set(reportDetailKey, {
      reason: reason || '不適切なコンテンツ',
      reportedAt: new Date().toISOString()
    });

    // 1件の報告で募集を強制終了（削除はしない）
    // イベントの募集人数を現在の選択済み人数に設定して募集終了状態にする
    const updatedEvent = {
      ...event,
      maxParticipants: event.selectedApplicants?.length || 0,
      reportedAt: new Date().toISOString(),
      reportReason: reason || '不適切なコンテンツ'
    };

    // イベント詳細を更新
    await kv.set(`event:${eventId}`, updatedEvent);

    // イベント一覧も更新
    const allEvents = await kv.get('events') || [];
    const updatedEvents = allEvents.map(e =>
      e.id === eventId ? updatedEvent : e
    );
    await kv.set('events', updatedEvents);

    return res.status(200).json({
      message: 'イベントが報告されました。募集を終了しました。',
      closed: true,
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
