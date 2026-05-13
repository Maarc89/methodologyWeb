// filepath: c:\Users\marc.ferreres\PycharmProjects\servidorMethodology\frontend\src\components\ui\Card.jsx
import React from 'react';

export default function Card({ title, subtitle, headerActions, children, className = '', centerTitle = false }) {
  const headerClass = centerTitle ? 'card-header p-4 relative flex items-center justify-center' : 'card-header p-4';
  const headerActionsClass = centerTitle ? 'absolute right-4 top-4 flex items-center gap-2' : 'flex items-center gap-2';
  const innerDivClass = centerTitle ? 'w-full text-center flex flex-col items-center' : '';

  return (
    <div className={`card ${className}`.trim()}>
      {(title || headerActions) && (
        <div className={headerClass}>
          <div className={innerDivClass}>
            {title && <h3 className={`card-title ${centerTitle ? 'text-center' : ''}`.trim()}>{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {headerActions && (
            <div className={headerActionsClass}>
              {headerActions}
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
