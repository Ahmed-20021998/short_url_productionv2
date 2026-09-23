const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

export const api = {
  register: (email, password) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  shorten: (long_url) => request('/api/url/shorten', { method: 'POST', body: JSON.stringify({ long_url }) }),
  myUrls: () => request('/api/url/mine'),
  myAnalytics: () => request('/api/analytics/mine'),
  analyticsForCode: (code) => request(`/api/analytics/${encodeURIComponent(code)}`),
};

export { API_URL };
