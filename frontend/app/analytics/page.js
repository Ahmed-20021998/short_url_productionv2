'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function AnalyticsPage() {
  const [events, setEvents] = useState(null);
  const [urls, setUrls] = useState([]);
  const [selectedCode, setSelectedCode] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.myAnalytics(), api.myUrls()])
      .then(([analytics, userUrls]) => {
        setUrls(userUrls);
        const codeFromUrl = new URLSearchParams(window.location.search).get('code');
        if (codeFromUrl && userUrls.some((url) => url.short_code === codeFromUrl)) {
          setSelectedCode(codeFromUrl);
          return api.analyticsForCode(codeFromUrl).then(setEvents);
        }
        setEvents(analytics);
      })
      .catch((err) => setError(err.message || 'sign in to see your analytics'));
  }, []);

  async function onCodeChange(e) {
    const code = e.target.value;
    setSelectedCode(code);
    setError('');
    try {
      setEvents(code === 'all' ? await api.myAnalytics() : await api.analyticsForCode(code));
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedUrl = urls.find((url) => url.short_code === selectedCode);
  const totalClicks = selectedCode === 'all'
    ? urls.reduce((total, url) => total + (url.clicks || 0), 0)
    : (selectedUrl?.clicks || 0);
  const uniqueCodes = selectedCode === 'all'
    ? urls.filter((url) => (url.clicks || 0) > 0).length
    : (selectedUrl && (selectedUrl.clicks || 0) > 0 ? 1 : 0);
  const mobileClicks = events ? events.filter((e) => e.device === 'mobile').length : 0;

  return (
    <main className="shell">
      <h1>Click analytics</h1>
      <p className="lead">
        Every redirect is queued to the Analytics Worker in the background,
        so this dashboard never slows down a visitor&apos;s redirect.
      </p>

      {error && (
        <div className="card">
          <p className="error" style={{ marginTop: 0 }}>{error}</p>
          <a href="/auth"><button type="button">Go to sign in</button></a>
        </div>
      )}

      {events && (
        <>
          <div className="filter-row">
            <label htmlFor="analytics-code">Show analytics for</label>
            <select id="analytics-code" value={selectedCode} onChange={onCodeChange}>
              <option value="all">All my links</option>
              {urls.map((url) => <option key={url.short_code} value={url.short_code}>{url.short_code}</option>)}
            </select>
          </div>
          <div className="stat-row">
            <div className="stat">
              <div className="num">{totalClicks}</div>
              <div className="label">Total clicks</div>
            </div>
            <div className="stat">
              <div className="num">{uniqueCodes}</div>
              <div className="label">Links clicked</div>
            </div>
            <div className="stat">
              <div className="num">{mobileClicks}</div>
              <div className="label">From mobile</div>
            </div>
          </div>

          <div className="card">
            {events.length === 0 ? (
              <p className="empty">No clicks yet — share a short link to see data here.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Short code</th>
                    <th>Country</th>
                    <th>Device</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={i}>
                      <td className="mono">{e.short_code}</td>
                      <td>{e.country}</td>
                      <td>{e.device}</td>
                      <td>{new Date(e.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </main>
  );
}
