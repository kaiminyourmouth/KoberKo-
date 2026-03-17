import { useEffect, useState } from 'react';
import './Toast.css';

export function useToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message, variant = 'primary') {
    setToast({
      id: Date.now(),
      message,
      variant,
    });
  }

  function ToastContainer() {
    if (!toast) {
      return null;
    }

    return (
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        <div key={toast.id} className={`toast toast--${toast.variant}`}>
          {toast.message}
        </div>
      </div>
    );
  }

  return { showToast, ToastContainer };
}
