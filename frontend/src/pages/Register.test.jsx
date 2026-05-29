import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('../config.js', () => ({
  API_BASE: 'http://test-api',
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import Register from './Register.jsx';

describe('Register page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
  });

  it('calls onRegisterSuccess and navigates on successful register', async () => {
    const onRegisterSuccess = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'token-456' }),
      })
    );

    render(
      <MemoryRouter>
        <Register onRegisterSuccess={onRegisterSuccess} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Nombre de usuario'), {
      target: { value: 'new-user' },
    });
    fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), {
      target: { value: 'mail@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'pass1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => {
      expect(onRegisterSuccess).toHaveBeenCalledWith('token-456');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows backend error when register fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'Usuario ya existe' }),
      })
    );

    render(
      <MemoryRouter>
        <Register onRegisterSuccess={vi.fn()} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Usuario ya existe')).toBeInTheDocument();
  });
});
