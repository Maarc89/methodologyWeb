import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  authAxiosConfig,
  authFetch,
  authHeaders,
  clearAuthToken,
  getAuthToken,
  hasAuthToken,
  setAuthToken,
} from './auth.js';

describe('auth utilities', () => {
  afterEach(() => {
    clearAuthToken();
    vi.restoreAllMocks();
  });

  it('stores and retrieves auth token', () => {
    expect(hasAuthToken()).toBe(false);

    setAuthToken('abc123');

    expect(getAuthToken()).toBe('abc123');
    expect(hasAuthToken()).toBe(true);

    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('builds auth headers when token is present', () => {
    setAuthToken('tok-1');

    const headers = authHeaders({ 'Content-Type': 'application/json' });

    expect(headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Token tok-1',
    });
  });

  it('keeps existing headers when token is missing', () => {
    const headers = authHeaders({ Accept: 'application/json' });

    expect(headers).toEqual({ Accept: 'application/json' });
  });

  it('injects Authorization header in authAxiosConfig', () => {
    setAuthToken('tok-2');

    const config = authAxiosConfig({ timeout: 1000, headers: { Accept: 'application/json' } });

    expect(config).toEqual({
      timeout: 1000,
      headers: {
        Accept: 'application/json',
        Authorization: 'Token tok-2',
      },
    });
  });

  it('injects Authorization header in authFetch', async () => {
    setAuthToken('tok-fetch');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await authFetch('/api/example', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/example', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Token tok-fetch',
      },
      body: JSON.stringify({ a: 1 }),
    });
  });
});
