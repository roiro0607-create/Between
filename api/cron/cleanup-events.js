import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('イベントクリーンアップを開始...');

    // すべてのイベントを取得
    const events = await kv.get('events') || [];
    console.log(`合計 ${events.length} 件のイベントを検索中...`);

    const now = new Date();
    const deletedEvents = [];
    const eventsToKeep = [];

    for (const event of events) {
      let shouldDelete = false;
      let reason = '';

      // 1. タイトルが設定されていない場合
      if (!event.title || event.title.trim() === '') {
        shouldDelete = true;
        reason = 'タイトルなし';
      }
      // 2. 募集終了後24時間経過している場合
      else if (event.reportedAt) {
        const reportedDate = new Date(event.reportedAt);
        const hoursSinceReport = (now - reportedDate) / (1000 * 60 * 60);

        if (hoursSinceReport >= 24) {
          shouldDelete = true;
          reason = '報告後24時間経過';
        }
      }
      // 3. 募集期限切れで24時間経過している場合
      else if (event.deadline) {
        const deadline = new Date(event.deadline);
        const hoursSinceDeadline = (now - deadline) / (1000 * 60 * 60);

        if (hoursSinceDeadline >= 24) {
          shouldDelete = true;
          reason = '募集期限切れ後24時間経過';
        }
      }

      if (shouldDelete) {
        // イベント詳細を削除
        await kv.del(`event:${event.id}`);

        deletedEvents.push({
          id: event.id,
          title: event.title || '(タイトルなし)',
          reason: reason
        });

        console.log(`✓ イベント削除: ${event.title || '(タイトルなし)'} (理由: ${reason})`);
      } else {
        eventsToKeep.push(event);
      }
    }

    // イベント一覧を更新
    if (deletedEvents.length > 0) {
      await kv.set('events', eventsToKeep);
      console.log(`${deletedEvents.length} 件のイベントを削除しました`);
    } else {
      console.log('削除対象のイベントはありませんでした');
    }

    return res.status(200).json({
      message: `クリーンアップ完了: ${deletedEvents.length} 件削除`,
      deletedEvents: deletedEvents,
      remainingEvents: eventsToKeep.length
    });

  } catch (error) {
    console.error('クリーンアップエラー:', error);
    return res.status(500).json({
      error: 'クリーンアップに失敗しました',
      details: error.message
    });
  }
}
