import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message, duration) => {
    addToast({ message, type: 'success', duration });
  }, [addToast]);

  const showError = useCallback((message, duration = 6000) => {
    addToast({ message, type: 'error', duration });
  }, [addToast]);

  const showInfo = useCallback((message, duration) => {
    addToast({ message, type: 'info', duration });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, showSuccess, showError, showInfo, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {toast.type === 'success' && <CheckCircle2 size={18} color="#34D399" />}
              {toast.type === 'error' && <AlertCircle size={18} color="#F87171" />}
              {toast.type === 'info' && <Info size={18} color="#93C5FD" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center' }}
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
