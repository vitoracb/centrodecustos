import { Alert } from 'react-native';

/**
 * Exibe uma mensagem de sucesso
 */
export const showSuccess = (title: string, message?: string): void => {
  Alert.alert(title, message);
};

/**
 * Exibe uma mensagem de erro
 */
export const showError = (title: string, message?: string): void => {
  Alert.alert(title, message);
};
