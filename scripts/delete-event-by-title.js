// イベントをタイトルで削除するスクリプト
import { kv } from '@vercel/kv';

async function deleteEventByTitle(titleToDelete) {
  try {
    console.log(`タイトル「${titleToDelete}」のイベントを検索中...`);

    // すべてのイベントを取得
    const events = await kv.get('events') || [];
    console.log(`合計 ${events.length} 件のイベントが見つかりました`);

    // タイトルが一致するイベントを検索
    const targetEvents = events.filter(event => event.title === titleToDelete);

    if (targetEvents.length === 0) {
      console.log(`タイトル「${titleToDelete}」のイベントが見つかりませんでした`);
      return;
    }

    console.log(`${targetEvents.length} 件の一致するイベントが見つかりました`);

    // 各イベントを削除
    for (const event of targetEvents) {
      console.log(`イベントを削除中: ${event.title} (ID: ${event.id})`);

      // イベント詳細を削除
      await kv.del(`event:${event.id}`);

      // イベント一覧から削除
      const updatedEvents = events.filter(e => e.id !== event.id);
      await kv.set('events', updatedEvents);

      console.log(`✓ イベント「${event.title}」を削除しました`);
    }

    console.log('削除完了！');
  } catch (error) {
    console.error('削除エラー:', error);
    throw error;
  }
}

// タイトル「n」のイベントを削除
deleteEventByTitle('n')
  .then(() => {
    console.log('スクリプト完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('スクリプトエラー:', error);
    process.exit(1);
  });
