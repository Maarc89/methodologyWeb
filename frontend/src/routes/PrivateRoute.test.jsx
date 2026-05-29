import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import PrivateRoute from './PrivateRoute.jsx';
import { clearAuthToken, setAuthToken } from '../utils/auth.js';

describe('PrivateRoute', () => {
  it('renders children when auth token exists', () => {
    setAuthToken('valid-token');

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={(
              <PrivateRoute>
                <div>Private content</div>
              </PrivateRoute>
            )}
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Private content')).toBeInTheDocument();
    clearAuthToken();
  });

  it('redirects to login when auth token is missing', () => {
    clearAuthToken();

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={(
              <PrivateRoute>
                <div>Private content</div>
              </PrivateRoute>
            )}
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
