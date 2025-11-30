import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

export const shareFile = async (fileUri: string, fileName: string) => {
  try {
    // Verifica se o compartilhamento está disponível
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      Alert.alert(
        'Compartilhamento não disponível',
        'Seu dispositivo não suporta compartilhamento de arquivos.'
      );
      return;
    }

    // Determina o mimeType baseado na extensão do arquivo
    let mimeType = 'application/octet-stream';
    let uti = '';
    
    if (fileUri.endsWith('.html') || fileUri.endsWith('.pdf')) {
      mimeType = fileUri.endsWith('.pdf') ? 'application/pdf' : 'text/html';
      uti = fileUri.endsWith('.pdf') ? 'com.adobe.pdf' : 'public.html';
    } else if (fileUri.endsWith('.csv') || fileUri.endsWith('.xlsx')) {
      mimeType = fileUri.endsWith('.xlsx') 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
      uti = fileUri.endsWith('.xlsx') 
        ? 'org.openxmlformats.spreadsheetml.sheet'
        : 'public.comma-separated-values-text';
    }

    // Compartilha o arquivo
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: `Compartilhar ${fileName}`,
      UTI: uti || undefined,
    });
  } catch (error: any) {
    console.error('❌ Erro ao compartilhar arquivo:', error);
    Alert.alert('Erro ao compartilhar', 'Não foi possível compartilhar o arquivo.');
  }
};

