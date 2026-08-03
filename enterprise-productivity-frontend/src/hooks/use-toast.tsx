'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { IconAlertCircle, IconCheckCircle, IconClose, IconInfo } from '@/components/ui/icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (text: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });
export function useToast() {
  return useContext(ToastContext);
}

const TOAST_STYLES: Record<ToastType, { container: string; icon: ReactNode }> = {
  success: {
    container: 'border-emerald-200 bg-white text-emerald-700',
    icon: <IconCheckCircle width={18} height={18} className="shrink-0 text-emerald-600" />,
  },
  error: {
    container: 'border-red-200 bg-white text-red-700',
    icon: <IconAlertCircle width={18} height={18} className="shrink-0 text-red-600" />,
  },
  info: {
    container: 'border-blue-200 bg-white text-blue-700',
    icon: <IconInfo width={18} height={18} className="shrink-0 text-blue-600" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-3.5 py-3 shadow-popover animate-toast-in ${style.container}`}
            >
              {style.icon}
              <p className="min-w-0 flex-1 text-sm font-medium">{t.text}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600"
              >
                <IconClose width={14} height={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
