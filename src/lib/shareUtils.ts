import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

/**
 * Compartilha um arquivo
 */
export const shareFile = async (fileUri: string, mimeType?: string): Promise<void> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      throw new Error('Compartilhamento não disponível neste dispositivo');
    }
    
    await Sharing.shareAsync(fileUri, {
      mimeType: mimeType || 'application/octet-stream',
      dialogTitle: 'Compartilhar arquivo',
    });
  } catch (error) {
    console.error('Erro ao compartilhar arquivo:', error);
    throw error;
  }
};
