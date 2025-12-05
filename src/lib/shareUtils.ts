import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

/**
 * Compartilha um arquivo
 * - Se a URI for remota (http/https), baixa primeiro para o cache local
 * - Se já for um path local (file://), compartilha diretamente
 */
export const shareFile = async (fileUri: string, mimeType?: string): Promise<void> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Compartilhamento não disponível neste dispositivo');
    }

    let localUri = fileUri;

    // Se for URL remota, baixa para o cache antes de compartilhar
    if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
      const fileNameMatch = fileUri.split('/').pop() || 'arquivo';
      const safeName = fileNameMatch.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const destPath = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}${safeName}`;

      const downloadResult = await FileSystem.downloadAsync(fileUri, destPath);
      localUri = downloadResult.uri;
    }

    await Sharing.shareAsync(localUri, {
      mimeType: mimeType || 'application/octet-stream',
      dialogTitle: 'Compartilhar arquivo',
    });
  } catch (error) {
    console.error('Erro ao compartilhar arquivo:', error);
    throw error;
  }
};
