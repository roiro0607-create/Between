// API呼び出し用のヘルパー関数

const API_BASE_URL = import.meta.env.PROD ? '/api' : '/api';

export const api = {
  // イベント関連
  async getEvents() {
    const response = await fetch(`${API_BASE_URL}/events`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  async createEvent(eventData) {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
