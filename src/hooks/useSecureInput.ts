import { useState, useCallback, useMemo } from 'react';
import {
  sanitizeName,
  sanitizeText,
  sanitizeNumber,
  sanitizeCurrency,
  sanitizeCode,
  validateAndSanitize,
  validateEmail,
  validatePassword,
} from '../lib/security';

type InputType = 'name' | 'text' | 'code' | 'number' | 'currency' | 'email' | 'password' | 'general';

interface UseSecureInputOptions {
  type?: InputType;
  maxLength?: number;
  required?: boolean;
  min?: number;
  max?: number;
  initialValue?: string;
}

interface SecureInputState {
  value: string;
  displayValue: string;
  error: string | null;
  warnings: string[];
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
}

interface UseSecureInputReturn extends SecureInputState {
  setValue: (value: string) => void;
  setTouched: () => void;
  reset: () => void;
  validate: () => boolean;
  getSanitizedValue: () => string | number;
}

/**
 * Hook para gerenciar inputs com sanitização e validação de segurança
 */
export function useSecureInput(options: UseSecureInputOptions = {}): UseSecureInputReturn {
  const {
    type = 'general',
    maxLength = 1000,
    required = false,
    min,
    max,
    initialValue = '',
  } = options;

  const [state, setState] = useState<SecureInputState>({
    value: initialValue,
    displayValue: initialValue,
    error: null,
    warnings: [],
    isValid: !required || initialValue.length > 0,
    isDirty: false,
    isTouched: false,
  });

  const sanitizeValue = useCallback((input: string): { sanitized: string; warnings: string[] } => {
    switch (type) {
      case 'name':
        return { sanitized: sanitizeName(input), warnings: [] };
      case 'text':
        return { sanitized: sanitizeText(input, maxLength), warnings: [] };
      case 'code':
        return { sanitized: sanitizeCode(input), warnings: [] };
      case 'number':
      case 'currency':
        // Para números, mantém como string para display
        return { sanitized: input.replace(/[^\d.,\-]/g, ''), warnings: [] };
      case 'email':
        return { sanitized: input.trim().toLowerCase(), warnings: [] };
      case 'password':
        return { sanitized: input, warnings: [] }; // Não sanitiza senhas
      default:
        const result = validateAndSanitize(input, 'general', { maxLength, required });
        return { sanitized: result.value, warnings: result.warnings };
    }
  }, [type, maxLength, required]);

  const validateValue = useCallback((input: string): { isValid: boolean; error: string | null } => {
    // Verifica se é obrigatório
    if (required && (!input || input.trim() === '')) {
      return { isValid: false, error: 'Campo obrigatório' };
    }

    if (!input || input.trim() === '') {
      return { isValid: true, error: null };
    }

    switch (type) {
      case 'email': {
        const result = validateEmail(input);
        return { isValid: result.isValid, error: result.errorMessage || null };
      }
      case 'password': {
        const result = validatePassword(input);
        return { isValid: result.isValid, error: result.errorMessage || null };
      }
      case 'number':
      case 'currency': {
        const num = sanitizeNumber(input, { min, max, allowDecimals: type === 'currency' });
        if (isNaN(num)) {
          return { isValid: false, error: 'Valor numérico inválido' };
        }
        if (min !== undefined && num < min) {
          return { isValid: false, error: `Valor mínimo: ${min}` };
        }
        if (max !== undefined && num > max) {
          return { isValid: false, error: `Valor máximo: ${max}` };
        }
        return { isValid: true, error: null };
      }
      case 'name':
        if (input.length > 200) {
          return { isValid: false, error: 'Nome muito longo (máximo 200 caracteres)' };
        }
        return { isValid: true, error: null };
      case 'text':
        if (input.length > maxLength) {
          return { isValid: false, error: `Texto muito longo (máximo ${maxLength} caracteres)` };
        }
        return { isValid: true, error: null };
      case 'code':
        if (!/^[a-z0-9_]+$/.test(sanitizeCode(input))) {
          return { isValid: false, error: 'Use apenas letras minúsculas, números e underscore' };
        }
        return { isValid: true, error: null };
      default:
        return { isValid: true, error: null };
    }
  }, [type, required, min, max, maxLength]);

  const setValue = useCallback((newValue: string) => {
    const { sanitized, warnings } = sanitizeValue(newValue);
    const { isValid, error } = validateValue(sanitized);

    setState(prev => ({
      ...prev,
      value: sanitized,
      displayValue: type === 'password' ? newValue : sanitized,
      error: prev.isTouched ? error : null,
      warnings,
      isValid,
      isDirty: true,
    }));
  }, [sanitizeValue, validateValue, type]);

  const setTouched = useCallback(() => {
    setState(prev => {
      const { isValid, error } = validateValue(prev.value);
      return {
        ...prev,
        isTouched: true,
        error,
        isValid,
      };
    });
  }, [validateValue]);

  const reset = useCallback(() => {
    setState({
      value: initialValue,
      displayValue: initialValue,
      error: null,
      warnings: [],
      isValid: !required || initialValue.length > 0,
      isDirty: false,
      isTouched: false,
    });
  }, [initialValue, required]);

  const validate = useCallback((): boolean => {
    const { isValid, error } = validateValue(state.value);
    setState(prev => ({
      ...prev,
      isTouched: true,
      error,
      isValid,
    }));
    return isValid;
  }, [state.value, validateValue]);

  const getSanitizedValue = useCallback((): string | number => {
    switch (type) {
      case 'number':
        return sanitizeNumber(state.value, { min, max, allowDecimals: false });
      case 'currency':
        return sanitizeCurrency(state.value);
      default:
        return state.value;
    }
  }, [type, state.value, min, max]);

  return {
    ...state,
    setValue,
    setTouched,
    reset,
    validate,
    getSanitizedValue,
  };
}

/**
 * Hook para gerenciar múltiplos inputs de formulário com segurança
 */
export function useSecureForm<T extends Record<string, UseSecureInputOptions>>(
  fields: T
): {
  inputs: { [K in keyof T]: UseSecureInputReturn };
  validateAll: () => boolean;
  resetAll: () => void;
  getValues: () => { [K in keyof T]: string | number };
  isFormValid: boolean;
} {
  const inputHooks: { [key: string]: UseSecureInputReturn } = {};

  // Cria hooks para cada campo
  for (const [key, options] of Object.entries(fields)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    inputHooks[key] = useSecureInput(options);
  }

  const validateAll = useCallback((): boolean => {
    let allValid = true;
    for (const hook of Object.values(inputHooks)) {
      if (!hook.validate()) {
        allValid = false;
      }
    }
    return allValid;
  }, [inputHooks]);

  const resetAll = useCallback(() => {
    for (const hook of Object.values(inputHooks)) {
      hook.reset();
    }
  }, [inputHooks]);

  const getValues = useCallback(() => {
    const values: { [key: string]: string | number } = {};
    for (const [key, hook] of Object.entries(inputHooks)) {
      values[key] = hook.getSanitizedValue();
    }
    return values as { [K in keyof T]: string | number };
  }, [inputHooks]);

  const isFormValid = useMemo(() => {
    return Object.values(inputHooks).every(hook => hook.isValid);
  }, [inputHooks]);

  return {
    inputs: inputHooks as { [K in keyof T]: UseSecureInputReturn },
    validateAll,
    resetAll,
    getValues,
    isFormValid,
  };
}

export default useSecureInput;
