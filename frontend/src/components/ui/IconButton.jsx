// filepath: c:\Users\marc.ferreres\PycharmProjects\servidorMethodology\frontend\src\components\ui\IconButton.jsx
import React from 'react';

const variantClass = {
  brand: 'btn-brand',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  success: 'btn-success',
  muted: 'btn-muted',
};

export default function IconButton({ children, variant = 'ghost', size = 'md', className = '', ariaLabel, type = 'button', ...props }) {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  const sizeClass = sizeMap[size] || sizeMap.md;
  const base = `btn p-0 inline-flex items-center justify-center ${sizeClass} ${variantClass[variant] || ''} ${className}`.trim();
  return (
    <button type={type} className={base} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  );
}
