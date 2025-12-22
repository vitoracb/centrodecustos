import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { supabase } from './supabaseClient';

/**
 * Converte base64 para Uint8Array (compatível com React Native)
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove possíveis espaços e quebras de linha
  const cleanBase64 = base64.replace(/\s/g, '');

  // Usa atob se disponível (navegador/Web), senão usa implementação manual
  let binaryString: string;
  if (typeof atob !== 'undefined') {
    binaryString = atob(cleanBase64);
  } else {
    // Implementação manual de base64 decode para React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    while (i < cleanBase64.length) {
      const encoded1 = chars.indexOf(cleanBase64.charAt(i++));
      const encoded2 = chars.indexOf(cleanBase64.charAt(i++));
      const encoded3 = chars.indexOf(cleanBase64.charAt(i++));
      const encoded4 = chars.indexOf(cleanBase64.charAt(i++));

      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }
    binaryString = result;
  }

  // Converte string binária para Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Faz upload de um arquivo para o Supabase Storage
 * @param fileUri URI local do arquivo (file:// ou content://)
 * @param fileName Nome do arquivo
 * @param mimeType Tipo MIME do arquivo (opcional)
 * @param bucket Nome do bucket no Supabase Storage (padrão: 'expense-documents')
 * @returns URL pública do arquivo ou null em caso de erro
 */
export async function uploadFileToStorage(
  fileUri: string,
  fileName: string,
  mimeType?: string | null,
  bucket: string = 'expense-documents',
  folder: string = 'expenses'
): Promise<string | null> {
  try {
    // Verifica se é uma URL remota (http/https)
    if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
      console.log('🔄 Arquivo remoto detectado, baixando para cache antes do upload:', fileUri);
      try {
        // Cria um nome de arquivo seguro para o cache
        const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_') || 'temp_file';
        const downloadDest = `${FileSystem.cacheDirectory}${Date.now()}_${safeFileName}`;

        const downloadResult = await FileSystem.downloadAsync(fileUri, downloadDest);

        if (downloadResult.status === 200) {
          fileUri = downloadResult.uri;
          console.log('✅ Arquivo baixado para cache locais:', fileUri);
        } else {
          console.warn('⚠️ Falha ao baixar arquivo remoto, status:', downloadResult.status);
          return fileUri; // Retorna a URL original em caso de falha no download
        }
      } catch (downloadError) {
        console.error('❌ Erro ao baixar arquivo remoto:', downloadError);
        return fileUri; // Retorna a URL original em caso de erro
      }
    }

    // Lê o arquivo como base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: (FileSystem as any).EncodingType?.Base64 || 'base64' as any,
    });

    // Converte base64 para Uint8Array (compatível com React Native)
    const byteArray = base64ToUint8Array(base64);

    // Gera um nome único para o arquivo
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // Determina o content type
    const contentType = mimeType || 'application/octet-stream';

    // Faz upload para o Supabase Storage usando ArrayBuffer
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, byteArray, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('❌ Erro ao fazer upload do arquivo:', error);

      // Erro de RLS (Row-Level Security)
      if (error.message?.includes('row-level security') || error.message?.includes('violates row-level security')) {
        console.error('🔒 Erro de política RLS. Execute o arquivo supabase_storage_policies.sql no Supabase SQL Editor para configurar as políticas de acesso.');
        Alert.alert(
          'Erro de Permissão',
          'O bucket precisa ter políticas RLS configuradas. Execute o arquivo supabase_storage_policies.sql no Supabase SQL Editor.'
        );
        return null;
      }

      // Se o bucket não existir
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        console.warn('⚠️ Bucket não encontrado. Verifique se o bucket configurado existe no Supabase Storage.');
        Alert.alert(
          'Bucket não encontrado',
          'O bucket de arquivos não foi encontrado no Supabase Storage. Verifique o nome do bucket nas configurações.'
        );
        return null;
      }

      return null;
    }

    // Obtém a URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (urlData?.publicUrl) {
      console.log('✅ Arquivo enviado com sucesso:', urlData.publicUrl);
      return urlData.publicUrl;
    }

    return null;
  } catch (error: any) {
    console.error('❌ Erro inesperado ao fazer upload:', error);
    // Se for um erro de RLS, já foi tratado acima
    if (error?.message?.includes('row-level security') || error?.message?.includes('violates row-level security')) {
      return null; // Já foi exibido o Alert acima
    }
    // Para outros erros, mostra mensagem genérica
    Alert.alert(
      'Erro ao fazer upload',
      error?.message || 'Ocorreu um erro inesperado ao fazer upload do arquivo. Verifique sua conexão e tente novamente.'
    );
    return null;
  }
}

/**
 * Faz upload de múltiplos arquivos para o Supabase Storage
 * @param files Array de objetos com fileUri, fileName e mimeType
 * @param bucket Nome do bucket no Supabase Storage
 * @returns Array de URLs públicas dos arquivos (null para arquivos que falharam)
 */
export async function uploadMultipleFilesToStorage(
  files: { fileUri: string; fileName: string; mimeType?: string | null }[],
  bucket: string = 'expense-documents',
  folder: string = 'expenses'
): Promise<(string | null)[]> {
  const uploadPromises = files.map((file) =>
    uploadFileToStorage(file.fileUri, file.fileName, file.mimeType, bucket, folder)
  );
  return Promise.all(uploadPromises);
}

