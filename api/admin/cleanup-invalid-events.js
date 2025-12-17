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
    console.log('不正なイベントのクリーンアップを開始...');

    // すべてのイベントを取得
    const events = await kv.get('events') || [];
    console.log(`合計 ${events.length} 件のイベントを検索中...`);

    const deletedEvents = [];
    const validEvents = [];

    for (const event of events) {
      let isInvalid = false;
      let reason = '';

      // 1. タイトルが設定されていない、または空
      if (!event.title || event.title.trim() === '') {
        isInvalid = true;
        reason = 'タイトルなし';
      }
      // 2. maxParticipantsが未定義、null、または不正な値
      else if (event.maxParticipants === undefined ||
               event.maxParticipants === null ||
               isNaN(event.maxParticipants) ||
               event.maxParticipants < 0) {
        isInvalid = true;
        reason = '募集人数が不正';
      }
      // 3. 説明が設定されていない、または空
      else if (!event.description || event.description.trim() === '') {
        isInvalid = true;
        reason = '説明なし';
      }

      if (isInvalid) {
        // イベント詳細を削除
        await kv.del(`event:${event.id}`);

        deletedEvents.push({
          id: event.id,
          title: event.title || '(タイトルなし)',
          maxParticipants: event.maxParticipants,
          reason: reason
        });

        console.log(`✓ 不正なイベント削除: ${event.title || '(タイトルなし)'} (理由: ${reason})`);
      } else {
        validEvents.push(event);
      }
    }

    // イベント一覧を更新
    if (deletedEvents.length > 0) {
      await kv.set('events', validEvents);
      console.log(`${deletedEvents.length} 件の不正なイベントを削除しました`);
    } else {
      console.log('不正なイベントはありませんでした');
    }

    return res.status(200).json({
      message: `${deletedEvents.length} 件の不正なイベントを削除しました`,
      deletedEvents: deletedEvents,
      remainingEvents: validEvents.length
    });

  } catch (error) {
    console.error('クリーンアップエラー:', error);
    return res.status(500).json({
      error: 'クリーンアップに失敗しました',
      details: error.message
    });
  }
}
