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
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'タイトルが必要です' });
    }

    console.log(`タイトル「${title}」のイベントを検索中...`);

    // すべてのイベントを取得
    const events = await kv.get('events') || [];
    console.log(`合計 ${events.length} 件のイベントが見つかりました`);

    // タイトルが一致するイベントを検索
    const targetEvents = events.filter(event => event.title === title);

    if (targetEvents.length === 0) {
      return res.status(404).json({
        error: `タイトル「${title}」のイベントが見つかりませんでした`,
        totalEvents: events.length
      });
    }

    console.log(`${targetEvents.length} 件の一致するイベントが見つかりました`);

    const deletedEvents = [];

    // 各イベントを削除
    for (const event of targetEvents) {
      console.log(`イベントを削除中: ${event.title} (ID: ${event.id})`);

      // イベント詳細を削除
      await kv.del(`event:${event.id}`);

      deletedEvents.push({
        id: event.id,
        title: event.title,
        date: event.date,
        location: event.location
      });

      console.log(`✓ イベント「${event.title}」を削除しました`);
    }

    // イベント一覧を更新（削除したイベントを除外）
    const updatedEvents = events.filter(e => !targetEvents.some(t => t.id === e.id));
    await kv.set('events', updatedEvents);

    console.log('削除完了！');

    return res.status(200).json({
      message: `${deletedEvents.length} 件のイベントを削除しました`,
      deletedEvents: deletedEvents,
      remainingEvents: updatedEvents.length
    });

  } catch (error) {
    console.error('削除エラー:', error);
    return res.status(500).json({
      error: 'イベントの削除に失敗しました',
      details: error.message
    });
  }
}
