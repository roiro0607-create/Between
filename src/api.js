// API呼び出し用のヘルパー関数
import Cookies from 'js-cookie';

const API_BASE_URL = import.meta.env.PROD ? '/api' : '/api';

// 認証トークンを取得
function getAuthToken() {
  return Cookies.get('auth_token');
}

// 認証ヘッダーを取得
function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const api = {
  // 認証関連
  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    // レスポンステキストを取得
    const text = await response.text();

    // JSONパースを試みる
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('JSONパースエラー:', text);
      throw new Error('サーバーからの応答が無効です。管理者に連絡してください。');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to register');
    }

    // トークンをCookieに保存（5年間有効）
    Cookies.set('auth_token', data.token, { expires: 1825 });
    return data;
  },

  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    // レスポンステキストを取得
    const text = await response.text();

    // JSONパースを試みる
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('JSONパースエラー:', text);
      throw new Error('サーバーからの応答が無効です。管理者に連絡してください。');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    // トークンをCookieに保存（5年間有効）
    Cookies.set('auth_token', data.token, { expires: 1825 });
    return data;
  },

  async getCurrentUser() {
    const token = getAuthToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) {
      Cookies.remove('auth_token');
      return null;
    }
    const data = await response.json();
    return data.user;
  },

  logout() {
    Cookies.remove('auth_token');
  },

  async updateProfile(profileData) {
    const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(profileData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }
    const data = await response.json();
    return data.user;
  },

  // イベント関連
  async getEvents(userId = null) {
    const url = userId
      ? `${API_BASE_URL}/events?userId=${userId}`
      : `${API_BASE_URL}/events`;

    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  async createEvent(eventData) {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  async getEvent(eventId) {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`);
    if (!response.ok) throw new Error('Failed to fetch event');
    return response.json();
  },

  async updateEvent(eventId, updates) {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },

  async updateEventInfo(eventId, eventData) {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error('Failed to update event info');
    return response.json();
  },

  async deleteEvent(eventId) {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) throw new Error('Failed to delete event');
    return response.json();
  },

  // 応募関連
  async getApplications(eventId = null) {
    const url = eventId
      ? `${API_BASE_URL}/applications?eventId=${eventId}`
      : `${API_BASE_URL}/applications`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch applications');
    return response.json();
  },

  async createApplication(applicationData) {
    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(applicationData),
    });
    if (!response.ok) throw new Error('Failed to create application');
    return response.json();
  },

  async getApplication(appId) {
    const response = await fetch(`${API_BASE_URL}/applications/${appId}`);
    if (!response.ok) throw new Error('Failed to fetch application');
    return response.json();
  },

  async updateApplication(appId, updates) {
    const response = await fetch(`${API_BASE_URL}/applications/${appId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update application');
    return response.json();
  },
};
