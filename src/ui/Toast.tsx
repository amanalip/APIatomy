import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto min-w-[240px] max-w-[360px] px-3 py-2 rounded-lg shadow-lg border text-xs flex items-start gap-2 ${
              t.type === 'error'
                ? 'bg-red-600 text-white border-red-700'
                : t.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : t.type === 'warning'
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
