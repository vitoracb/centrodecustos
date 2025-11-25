/**
 * Sistema de Toast Notifications
 * 
 * Fornece feedback visual para ações do usuário
 */

import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  type?: ToastType;
  text1: string;
  text2?: string;
  duration?: number;
  position?: 'top' | 'bottom';
}

export const showToast = (options: ToastOptions) => {
  Toast.show({
    type: options.type || 'info',
    text1: options.text1,
    text2: options.text2,
    visibilityTime: options.duration || 3000,
    position: options.position || 'top',
  });
};

// Helpers para tipos específicos
export const showSuccess = (message: string, description?: string) => {
  showToast({
    type: 'success',
    text1: message,
    text2: description,
  });
};

export const showError = (message: string, description?: string) => {
  showToast({
    type: 'error',
    text1: message,
    text2: description,
    duration: 4000, // Erros ficam mais tempo visíveis
  });
};

export const showInfo = (message: string, description?: string) => {
  showToast({
    type: 'info',
    text1: message,
    text2: description,
  });
};

