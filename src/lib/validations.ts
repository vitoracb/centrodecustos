import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { Alert } from 'react-native';
import { showError } from './toast';
import * as FileSystem from 'expo-file-system/legacy';

dayjs.extend(customParseFormat);

/**
 * Valida se uma data está no formato DD/MM/YYYY e é válida
 * 
 * @param dateString - Data no formato DD/MM/YYYY
 * @param allowFuture - Se permite datas futuras (padrão: true)
 * @param allowPast - Se permite datas passadas (padrão: true)
 * @returns Objeto com isValid e errorMessage
 */
export function validateDate(
  dateString: string,
  options: {
    allowFuture?: boolean;
    allowPast?: boolean;
    minDate?: Date;
    maxDate?: Date;
  } = {}
): { isValid: boolean; errorMessage?: string } {
  const { allowFuture = true, allowPast = true, minDate, maxDate } = options;

  // Verifica formato básico
  if (!dateString || dateString.trim() === '') {
    return { isValid: false, errorMessage: 'Data é obrigatória' };
  }

  // Verifica formato DD/MM/YYYY
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(dateRegex);

  if (!match) {
    return { isValid: false, errorMessage: 'Data deve estar no formato DD/MM/YYYY' };
  }

  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // Valida valores básicos
  if (monthNum < 1 || monthNum > 12) {
    return { isValid: false, errorMessage: 'Mês inválido. Use um valor entre 01 e 12' };
  }

  if (dayNum < 1 || dayNum > 31) {
    return { isValid: false, errorMessage: 'Dia inválido. Use um valor entre 01 e 31' };
  }

  if (yearNum < 1900 || yearNum > 2100) {
    return { isValid: false, errorMessage: 'Ano inválido. Use um ano entre 1900 e 2100' };
  }

  // Valida data usando dayjs
  const parsedDate = dayjs(dateString, 'DD/MM/YYYY', true);
  
  if (!parsedDate.isValid()) {
    return { isValid: false, errorMessage: 'Data inválida. Verifique se o dia existe no mês informado' };
  }

  // Verifica se a data é futura (quando não permitido)
  if (!allowFuture && parsedDate.isAfter(dayjs(), 'day')) {
    return { isValid: false, errorMessage: 'Não é permitido usar datas futuras' };
  }

  // Verifica se a data é passada (quando não permitido)
  if (!allowPast && parsedDate.isBefore(dayjs(), 'day')) {
    return { isValid: false, errorMessage: 'Não é permitido usar datas passadas' };
  }

  // Valida data mínima
  if (minDate && parsedDate.isBefore(dayjs(minDate), 'day')) {
    return { isValid: false, errorMessage: `A data não pode ser anterior a ${dayjs(minDate).format('DD/MM/YYYY')}` };
  }

  // Valida data máxima
  if (maxDate && parsedDate.isAfter(dayjs(maxDate), 'day')) {
    return { isValid: false, errorMessage: `A data não pode ser posterior a ${dayjs(maxDate).format('DD/MM/YYYY')}` };
  }

  return { isValid: true };
}

/**
 * Valida o tamanho de um arquivo
 * 
 * @param fileUri - URI do arquivo
 * @param maxSizeMB - Tamanho máximo em MB (padrão: 80)
 * @returns Promise com isValid, errorMessage e fileSizeMB
 */
export async function validateFileSize(
  fileUri: string,
  maxSizeMB: number = 80
): Promise<{ isValid: boolean; errorMessage?: string; fileSizeMB?: number }> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    
    if (!fileInfo.exists) {
      return { isValid: false, errorMessage: 'Arquivo não encontrado' };
    }

    const fileSizeBytes = fileInfo.size || 0;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    if (fileSizeMB > maxSizeMB) {
      return {
        isValid: false,
        errorMessage: `Arquivo muito grande (${fileSizeMB.toFixed(2)}MB). O tamanho máximo permitido é ${maxSizeMB}MB`,
        fileSizeMB,
      };
    }

    return { isValid: true, fileSizeMB };
  } catch (error: any) {
    return {
      isValid: false,
      errorMessage: 'Não foi possível verificar o tamanho do arquivo',
    };
  }
}

/**
 * Valida o tipo de arquivo
 * 
 * @param mimeType - Tipo MIME do arquivo
 * @param allowedTypes - Array de tipos MIME permitidos
 * @param fileName - Nome do arquivo (para verificar extensão como fallback)
 * @returns Objeto com isValid e errorMessage
 */
export function validateFileType(
  mimeType: string | null | undefined,
  allowedTypes: string[],
  fileName?: string
): { isValid: boolean; errorMessage?: string } {
  if (!mimeType && !fileName) {
    return { isValid: false, errorMessage: 'Tipo de arquivo não identificado' };
  }

  // Verifica por MIME type
  if (mimeType) {
    const isAllowed = allowedTypes.some((allowed) => {
      // Permite tipos genéricos (ex: "image/*" permite qualquer imagem)
      if (allowed.endsWith('/*')) {
        const baseType = allowed.split('/')[0];
        return mimeType.startsWith(`${baseType}/`);
      }
      return mimeType === allowed || mimeType.includes(allowed);
    });

    if (isAllowed) {
      return { isValid: true };
    }
  }

  // Fallback: verifica por extensão do arquivo
  if (fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const allowedExtensions: Record<string, string[]> = {
      'application/pdf': ['pdf'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/*': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    };

    for (const allowedType of allowedTypes) {
      const extensions = allowedExtensions[allowedType] || [];
      if (extensions.includes(extension || '')) {
        return { isValid: true };
      }
    }
  }

  const allowedTypesStr = allowedTypes.join(', ');
  return {
    isValid: false,
    errorMessage: `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypesStr}`,
  };
}

/**
 * Valida arquivo completo (tamanho + tipo)
 * 
 * @param fileUri - URI do arquivo
 * @param mimeType - Tipo MIME do arquivo
 * @param fileName - Nome do arquivo
 * @param allowedTypes - Tipos MIME permitidos
 * @param maxSizeMB - Tamanho máximo em MB (padrão: 80)
 * @returns Promise com isValid e errorMessage
 */
export async function validateFile(
  fileUri: string,
  mimeType: string | null | undefined,
  fileName?: string,
  allowedTypes: string[] = ['application/pdf', 'image/*'],
  maxSizeMB: number = 80
): Promise<{ isValid: boolean; errorMessage?: string }> {
  // Valida tipo
  const typeValidation = validateFileType(mimeType, allowedTypes, fileName);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  // Valida tamanho
  const sizeValidation = await validateFileSize(fileUri, maxSizeMB);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return { isValid: true };
}

/**
 * Mostra alerta se arquivo exceder o tamanho máximo
 * 
 * @param fileUri - URI do arquivo
 * @param maxSizeMB - Tamanho máximo em MB (padrão: 80)
 * @returns Promise<boolean> - true se válido, false se excedeu
 */
export async function checkFileSizeAndAlert(
  fileUri: string,
  maxSizeMB: number = 80
): Promise<boolean> {
  const validation = await validateFileSize(fileUri, maxSizeMB);
  
  if (!validation.isValid) {
    Alert.alert(
      'Arquivo muito grande',
      validation.errorMessage || `O arquivo excede o tamanho máximo de ${maxSizeMB}MB`,
      [{ text: 'OK' }]
    );
    return false;
  }

  return true;
}

