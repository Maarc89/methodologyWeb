import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../config.js', () => ({
  API_BASE: 'http://test-api',
}));

const mockAuthFetch = vi.fn();
const mockGetAuthToken = vi.fn();
const mockDownloadCSV = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '123' }),
  };
});

vi.mock('../utils/auth.js', () => ({
  authFetch: (...args) => mockAuthFetch(...args),
  getAuthToken: () => mockGetAuthToken(),
}));

vi.mock('../functionalities/AssessmentAnalysis.jsx', () => ({
  default: ({ userAssessmentId }) => <div data-testid="assessment-analysis">analysis-{userAssessmentId}</div>,
}));

vi.mock('../functionalities/ExportAssessment.jsx', () => ({
  downloadCSV: (...args) => mockDownloadCSV(...args),
}));

import UserAssessmentDetail from './UserAssessmentDetail.jsx';

const baseAssessment = {
  id: 123,
  completed: false,
  assessment_template: {
    title: 'Evaluación Demo',
    description: 'Descripción demo',
  },
  answers: [
    {
      id: 10,
      selected_option: { id: 1, value: 'yes', label: 'Sí' },
      question_template: {
        text: '¿Hay política documentada?',
        area: 'Gobierno',
        options: [
          { id: 1, value: 'yes', label: 'Sí' },
          { id: 2, value: 'no', label: 'No' },
        ],
      },
    },
  ],
};

describe('UserAssessmentDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthToken.mockReturnValue('token-1');
  });

  it('loads assessment and shows grouped question when area is expanded', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => baseAssessment,
    });

    render(
      <MemoryRouter>
        <UserAssessmentDetail />
      </MemoryRouter>
    );

    expect(screen.getByText('Cargando la evaluación...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Evaluación Demo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Gobierno/i }));

    expect(screen.getByText('¿Hay política documentada?')).toBeInTheDocument();
  });

  it('updates answer by calling patch endpoint with selected option id', async () => {
    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => baseAssessment,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    render(
      <MemoryRouter>
        <UserAssessmentDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Evaluación Demo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Gobierno/i }));
    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledTimes(2);
    });

    expect(mockAuthFetch).toHaveBeenLastCalledWith(
      'http://test-api/user-assessments/answers/10/',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selected_option: 2 }),
      }
    );
  });

  it('finalizes assessment, loads analysis and exports csv', async () => {
    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => baseAssessment,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pie: {}, bar: [], spider: [] }),
      });

    render(
      <MemoryRouter>
        <UserAssessmentDetail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Evaluación Demo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Evaluación' }));

    await waitFor(() => {
      expect(screen.getByText('Evaluación finalizada.')).toBeInTheDocument();
    });

    expect(screen.getByText('Análisis de la Evaluación')).toBeInTheDocument();
    expect(screen.getByTestId('assessment-analysis')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Exportar en formato CSV' }));

    expect(mockDownloadCSV).toHaveBeenCalledWith(
      'http://test-api/export-user-assessment-csv/123/',
      'assessment_123.csv'
    );
  });
});