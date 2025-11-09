import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    const { email, password, name, age } = req.body;

    // バリデーション
    if (!email || !password || !name || !age) {
      return res.status(400).json({ error: 'すべての項目を入力してください' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'パスワードは6文字以上にしてください' });
    }

    // メールアドレスの重複チェック
    const existingUser = await kv.get(`user:email:${email}`);
    if (existingUser) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザーIDを生成
    const userId = `user_${Date.now()}`;

    // ユーザーデータを作成
    const user = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      age: parseInt(age),
      createdAt: new Date().toISOString()
    };

    // ユーザーデータを保存
    await kv.set(`user:${userId}`, JSON.stringify(user));
    await kv.set(`user:email:${email}`, userId);

    // JWTトークンを生成
    const token = jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // パスワードを除いたユーザー情報を返す
    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: '登録に失敗しました' });
  }
}
