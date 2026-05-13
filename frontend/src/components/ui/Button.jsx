// filepath: c:\Users\marc.ferreres\PycharmProjects\servidorMethodology\frontend\src\components\ui\Button.jsx
import React from 'react';

const variantClass = {
  brand: 'btn btn-md btn-brand',
  ghost: 'btn btn-md btn-ghost',
  danger: 'btn btn-md btn-danger',
  success: 'btn btn-md btn-success',
  muted: 'btn btn-md btn-muted',
};

export default function Button({
  children,
  variant = 'brand',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : 'btn-md';
  const base = `btn ${sizeClass} ${variantClass[variant] || ''}`.trim();
  return (
    <button type={type} className={`${base} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

