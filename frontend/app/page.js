'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function HomePage() {
  const [longUrl, setLongUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.myUrls().then(setUrls).catch(() => setUrls(null));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await api.shorten(longUrl);
      setResult(data);
      setLongUrl('');
      api.myUrls().then(setUrls).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyShortUrl() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        if (window.ClipboardItem) {
          const linkHtml = `<a href="${result.short_url}">${result.short_url}</a>`;
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([linkHtml], { type: 'text/html' }),
              'text/plain': new Blob([result.short_url], { type: 'text/plain' }),
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(result.short_url);
        }
      } else {
        const input = document.createElement('textarea');
        input.value = result.short_url;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.focus();
        input.select();
        if (!document.execCommand('copy')) throw new Error('copy failed');
        document.body.removeChild(input);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy the short link. Please copy it manually.');
    }
  }

  return (
    <main className="shell">
      <h1>Paste a long link. Get a short one back.</h1>
      <p className="lead">
        Every short link is cached the moment it&apos;s created, so redirects
        stay fast even under heavy traffic — and every click is logged
        in the background for your analytics dashboard.
      </p>

      <div className="card">
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="long_url">Destination URL</label>
            <input
              id="long_url"
              type="url"
              required
              placeholder="https://example.com/a/very/long/path"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Shortening…' : 'Shorten link'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {result && (
          <div className="result">
            <a href={result.short_url} target="_blank" rel="noreferrer">
              {result.short_url}
            </a>
            <button
              type="button"
              className="secondary"
              onClick={copyShortUrl}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {urls && (
        <div className="card links-card">
          <div className="section-heading">
            <h2>Your links</h2>
            <a href="/analytics">View analytics</a>
          </div>
          {urls.length === 0 ? (
            <p className="empty">Your signed-in links will appear here.</p>
          ) : (
            <div className="link-list">
              {urls.map((url) => (
                <div className="link-row" key={url.short_code}>
                  <a href={url.short_url || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/${url.short_code}`} target="_blank" rel="noreferrer">
                    {url.short_code}
                  </a>
                  <span>{url.long_url}</span>
                  <span>{url.clicks || 0} views</span>
                  <a href={`/analytics?code=${encodeURIComponent(url.short_code)}`}>analytics</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
