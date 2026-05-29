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
    useParams: () => ({ id: '1' }),
  };
});

vi.mock('../utils/auth.js', () => ({
  authFetch: (...args) => mockAuthFetch(...args),
}));

import EditAssessment from './EditAssessment.jsx';

describe('EditAssessment page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Assessment original',
          description: 'Desc',
          questions: [
            {
              id: 100,
              text: 'Pregunta existente',
              area: { name: 'Area A' },
              option_set: null,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'Area A' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'Option A' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 100,
            text: 'Pregunta existente',
            area: { name: 'Area A' },
            option_set: null,
          },
        ],
      });
  });

  it('shows duplicate warning when adding an existing question twice', async () => {
    render(
      <MemoryRouter>
        <EditAssessment />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Editar Assessment')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue('Selecciona una pregunta'), {
      target: { value: '100' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Pregunta Existente' }));

    expect(await screen.findByText('La pregunta ya está añadida.')).toBeInTheDocument();
  });

  it('submits updated assessment and navigates home on success', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(
      <MemoryRouter>
        <EditAssessment />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Assessment original')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue('Assessment original'), {
      target: { value: 'Assessment actualizado' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
