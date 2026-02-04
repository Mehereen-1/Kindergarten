'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  type: 'notification' | 'sound' | 'message';
}

// Global toast store
let toasts: ToastNotification[] = [];
let listeners: ((toasts: ToastNotification[]) => void)[] = [];

function notifyListeners(toasts: ToastNotification[]) {
  listeners.forEach(listener => listener(toasts));
}

export function addToast(title: string, body: string, type: 'notification' | 'sound' | 'message' = 'notification') {
  const id = Date.now().toString();
  const toast: ToastNotification = { id, title, body, type };
  
  toasts = [...toasts, toast];
  notifyListeners(toasts);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    removeToast(id);
  }, 5000);
  
  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  notifyListeners(toasts);
}

/**
 * Toast notification container - place this at the top of your app
 */
export function ToastContainer() {
  const [toastList, setToastList] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastNotification[]) => {
      setToastList(newToasts);
    };
    
    listeners.push(listener);
    
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toastList.map((toast) => (
        <div
          key={toast.id}
          className="bg-white border-2 border-amber-200 rounded-lg shadow-xl p-4 max-w-sm pointer-events-auto animate-in slide-in-from-right-5 duration-300"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-bold text-amber-900">{toast.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{toast.body}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
