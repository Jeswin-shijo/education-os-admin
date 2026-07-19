import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastViewport, type ToastRecord, type ToastTone } from '../components/Toast';

interface ToastApi {
  /** Low-level: show a toast of any tone. */
  show: (tone: ToastTone, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const MAX_VISIBLE = 4;

// Colour a success toast by the action in its title so it matches the row-action
// button colours: edit/update = orange, delete/remove = red, everything else = green.
function successTone(title: string): ToastTone {
  const t = title.toLowerCase();
  if (/\b(updated|edited|changed|renamed|saved)\b/.test(t)) return 'update';
  if (/\b(removed|deleted)\b/.test(t)) return 'delete';
  return 'success';
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((tone: ToastTone, title: string, message?: string, duration = 4000) => {
    const id = (idRef.current += 1);
    setToasts((list) => [...list, { id, tone, title, message, duration }].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, message) => show(successTone(title), title, message),
      error: (title, message) => show('error', title, message, 6000),
      info: (title, message) => show('info', title, message),
      warning: (title, message) => show('warning', title, message),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
