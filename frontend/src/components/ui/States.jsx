// filepath: c:\Users\marc.ferreres\PycharmProjects\servidorMethodology\frontend\src\components\ui\States.jsx
import React from 'react';
import Button from './Button';

export function Loading({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center py-10 text-gray-600" role="status" aria-live="polite">
      <svg className="animate-spin h-5 w-5 mr-3 text-blau" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      {label}
    </div>
  );
}

export function ErrorState({ title = 'Ha ocurrido un error', message = 'Intenta de nuevo.', onRetry }) {
  return (
    <div className="card p-6 text-center">
      <h3 className="card-title mb-2">{title}</h3>
      <p className="card-subtitle mb-4">{message}</p>
      {onRetry && <Button variant="brand" onClick={onRetry}>Reintentar</Button>}
    </div>
  );
}

export function EmptyState({ title = 'Sin resultados', message = 'Aún no tienes contenido aquí.', actionLabel, onAction }) {
  return (
    <div className="card p-6 text-center">
      <h3 className="card-title mb-2">{title}</h3>
      <p className="card-subtitle mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button variant="brand" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

