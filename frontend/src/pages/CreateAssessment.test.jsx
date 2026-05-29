import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../config.js', () => ({
  API_BASE: 'http://test-api',
}));

const mockNavigate = vi.fn();
const mockAuthFetch = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../utils/auth.js', () => ({
  authFetch: (...args) => mockAuthFetch(...args),
}));

import CreateAssessment from './CreateAssessment.jsx';

describe('CreateAssessment page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, text: 'Question 1', area: 'Area A', option_set: null }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 10, name: 'Options Set A' }],
      });
  });

  it('shows validation error when submitting without selected questions', async () => {
    render(
      <MemoryRouter>
        <CreateAssessment />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Nuevo assessment' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(
      await screen.findByText('Selecciona o añade al menos una pregunta')
    ).toBeInTheDocument();
  });

  it('submits assessment and navigates to home on success', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 99 }),
    });

    render(
      <MemoryRouter>
        <CreateAssessment />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Assessment de prueba' },
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
