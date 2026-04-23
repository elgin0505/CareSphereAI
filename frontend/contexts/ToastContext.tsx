'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';
export interface Toast { id: string; message: string; type: ToastType; }
interface ToastCtx { addToast: (message: string, type?: ToastType) => void; }
const ToastContext = createContext<ToastCtx>({ addToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast stack */}
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up text-sm font-medium ${
            toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
            toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                                       'bg-brand-50 border-brand-200 text-brand-800'
          }`}>
            <span className="shrink-0 mt-0.5">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : toast.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <p>{toast.message}</p>
            <button onClick={() => setToasts((t) => t.filter((x) => x.id !== toast.id))} className="ml-auto shrink-0 opacity-50 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
