'use client';

import { ToastProvider, useToastStore } from '@/store/toastStore';
import { ToastContainer } from '@/components/Toast';

function ToastDisplay() {
  const { toasts, removeToast } = useToastStore();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export function ToastWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastDisplay />
    </ToastProvider>
  );
}
