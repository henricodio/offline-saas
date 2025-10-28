import { useCallback } from 'react';
import { useToastStore } from '@/store/toastStore';
import type { ToastType } from '@/components/Toast';

export function useToast() {
  const { addToast } = useToastStore();

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      addToast({
        id: `${Date.now()}-${Math.random()}`,
        message,
        type,
        duration,
      });
    },
    [addToast]
  );

  return {
    success: (message: string, duration?: number) => toast(message, 'success', duration),
    error: (message: string, duration?: number) => toast(message, 'error', duration),
    info: (message: string, duration?: number) => toast(message, 'info', duration),
    warning: (message: string, duration?: number) => toast(message, 'warning', duration),
  };
}
