'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Nav() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function onLogout() {
    try {
      await api.logout();
      setUser(null);
    } catch {
      setUser(null);
    }
  }

  return (
    <nav className="nav">
      <a className="brand" href="/">short<span>n</span></a>
      <div className="nav-links">
        <a href="/">shorten</a>
        <a href="/analytics">analytics</a>
        {!loading && (user ? (
          <>
            <span className="nav-user">{user.email}</span>
            <button type="button" className="nav-button" onClick={onLogout}>log out</button>
          </>
        ) : (
          <a href="/auth">sign in</a>
        ))}
      </div>
    </nav>
  );
}