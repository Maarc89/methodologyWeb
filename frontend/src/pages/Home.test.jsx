import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../config.js', () => ({
  API_BASE: 'http://test-api',
}));

const mockNavigate = vi.fn();
const mockAuthFetch = vi.fn();
const mockGetAuthToken = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../utils/auth.js', () => ({
  authFetch: (...args) => mockAuthFetch(...args),
  getAuthToken: () => mockGetAuthToken(),
}));

vi.mock('../functionalities/ImportAssessment.jsx', () => ({
  default: () => <div data-testid="import-assessment-mock" />,
}));

import Home from './Home.jsx';

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthToken.mockReturnValue('token-1');

    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ is_staff: true, is_admin: true, is_editor: false, roles: ['admin'] }),
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: 'Assessment A',
          description: 'Desc A',
          access_status: 'approved',
        },
      ],
    });
  });

  it('shows loading and then renders assessments', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('Cargando evaluaciones...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Assessment A')).toBeInTheDocument();
    });
  });

  it('shows delete confirmation and cancels it', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Assessment A')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('Borrar');
    fireEvent.click(deleteButton);

    expect(screen.getByText('¿Seguro que quieres borrar esta evaluación?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('¿Seguro que quieres borrar esta evaluación?')).not.toBeInTheDocument();
  });
});
