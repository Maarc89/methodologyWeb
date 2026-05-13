// filepath: c:\Users\marc.ferreres\PycharmProjects\servidorMethodology\frontend\src\components\ui\Modal.jsx
import React, { useEffect, useRef } from 'react';

export default function Modal({ open, title, children, onClose, initialFocusRef }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement;
    const focusEl = initialFocusRef?.current || dialogRef.current;
    focusEl?.focus();
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('keydown', onEsc);
      prevActive?.focus?.();
    };
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && <h2 id="modal-title" className="card-title mb-3">{title}</h2>}
        <div tabIndex={-1} ref={dialogRef}>
          {children}
        </div>
      </div>
    </div>
  );
}

