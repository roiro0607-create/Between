import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';

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
    const { email, newPassword } = req.body;

    // バリデーション
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'メールアドレスと新しいパスワードを入力してください' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'パスワードは6文字以上にしてください' });
    }

    // ユーザーIDを取得
    const userId = await kv.get(`user:email:${email}`);
    if (!userId) {
      return res.status(404).json({ error: 'このメールアドレスは登録されていません' });
    }

    // ユーザー情報を取得
    const userData = await kv.get(`user:${userId}`);
    if (!userData) {
      return res.status(404).json({ error: 'ユーザー情報が見つかりません' });
    }

    const user = typeof userData === 'string' ? JSON.parse(userData) : userData;

    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ユーザー情報を更新
    const updatedUser = {
      ...user,
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    };

    // ユーザーデータを保存
    await kv.set(`user:${userId}`, JSON.stringify(updatedUser));

    return res.status(200).json({
      message: 'パスワードをリセットしました。新しいパスワードでログインしてください。'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'パスワードのリセットに失敗しました' });
  }
}
