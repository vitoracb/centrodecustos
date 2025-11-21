import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';

interface FilePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  fileUri?: string;
  fileName?: string;
  mimeType?: string | null;
}

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export const FilePreviewModal = ({
  visible,
  onClose,
  fileUri,
  fileName,
  mimeType,
}: FilePreviewModalProps) => {
  const isImage =
    fileUri &&
    ((!!mimeType && IMAGE_MIME_TYPES.some((type) => mimeType?.includes(type))) ||
      /\.(png|jpe?g|webp)$/i.test(fileUri));
  const isPdf = fileUri && (mimeType?.includes('pdf') || /\.pdf$/i.test(fileUri));
  
  // Debug logs
  React.useEffect(() => {
    if (visible && fileUri) {
      console.log('FilePreviewModal - fileUri:', fileUri);
      console.log('FilePreviewModal - mimeType:', mimeType);
      console.log('FilePreviewModal - isPdf:', isPdf);
      console.log('FilePreviewModal - isImage:', isImage);
    }
  }, [visible, fileUri, mimeType, isPdf, isImage]);
  const [webSource, setWebSource] = useState<
    | { type: 'html'; html: string }
    | { type: 'uri'; uri: string }
    | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !fileUri) {
      setWebSource(null);
      setLoading(false);
      setError(null);
      return;
    }
    
    let isMounted = true;
    const loadFile = async () => {
      try {
        setLoading(true);
        setError(null);
        let uriToRead = fileUri;
        
        // Para content:// URIs no Android, precisamos copiar para o cache primeiro
        if (fileUri.startsWith('content://')) {
          const fileExtension = fileName?.split('.').pop() ?? (isPdf ? 'pdf' : 'bin');
          const dest = `${FileSystem.cacheDirectory}${Date.now()}.${fileExtension}`;
          try {
            await FileSystem.copyAsync({ from: fileUri, to: dest });
            uriToRead = dest;
          } catch (copyError) {
            console.warn('Erro ao copiar arquivo:', copyError);
            if (isMounted) {
              setError('Não foi possível acessar o arquivo.');
            }
            return;
          }
        }
        
        if (isPdf) {
          try {
            const base64 = await FileSystem.readAsStringAsync(uriToRead, {
              encoding: FileSystem.EncodingType.Base64,
            });
            if (isMounted) {
              const html = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta name="viewport" content="initial-scale=1, maximum-scale=3" />
                    <style>
                      html, body {
                        margin: 0;
                        padding: 0;
                        background: #000;
                        height: 100%;
                      }
                      iframe {
                        border: none;
                        width: 100%;
                        height: 100%;
                      }
                    </style>
                  </head>
                  <body>
                    <iframe src="data:application/pdf;base64,${base64}#toolbar=1" />
                  </body>
                </html>
              `;
              setWebSource({ type: 'html', html });
            }
          } catch (readError) {
            console.warn('Erro ao ler PDF:', readError);
            if (isMounted) {
              setError('Não foi possível carregar o PDF.');
            }
          }
        } else if (!isImage) {
          // Para outros arquivos, tenta base64
          try {
            const base64 = await FileSystem.readAsStringAsync(uriToRead, {
              encoding: FileSystem.EncodingType.Base64,
            });
            if (isMounted) {
              const type = mimeType ?? 'application/octet-stream';
              setWebSource({ type: 'uri', uri: `data:${type};base64,${base64}` });
            }
          } catch (readError) {
            console.warn('Erro ao ler arquivo:', readError);
            if (isMounted) {
              setError('Não foi possível carregar o arquivo.');
            }
          }
        }
      } catch (error) {
        console.warn('Erro ao carregar arquivo:', error);
        if (isMounted) {
          setError('Erro ao processar arquivo.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadFile();
    return () => {
      isMounted = false;
    };
  }, [visible, isImage, isPdf, fileUri, mimeType, fileName]);

  const handleShare = async () => {
    if (!fileUri) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType ?? undefined,
          UTI: mimeType ?? undefined,
        });
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar o arquivo.');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.closeText}>Fechar</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              {fileName ?? 'Arquivo'}
            </Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleShare}
            >
              <Text style={styles.shareText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.previewContainer}>
          {!fileUri ? (
            <View style={styles.loading}>
              <Text style={styles.errorText}>Arquivo não encontrado</Text>
            </View>
          ) : isImage ? (
            <Image source={{ uri: fileUri }} style={styles.imageFull} resizeMode="contain" />
          ) : isPdf ? (
            <>
              {loading ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>Carregando PDF...</Text>
                </View>
              ) : error && !webSource ? (
                <View style={styles.loading}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : webSource ? (
                <WebView
                  originWhitelist={['*']}
                  source={
                    webSource.type === 'html'
                      ? { html: webSource.html }
                      : { uri: webSource.uri }
                  }
                  style={styles.webview}
                  allowFileAccess
                  allowUniversalAccessFromFileURLs
                  javaScriptEnabled
                  domStorageEnabled
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error: ', nativeEvent);
                    setError('Erro ao carregar o PDF no visualizador.');
                  }}
                  onLoadEnd={() => {
                    setLoading(false);
                  }}
                />
              ) : (
                <View style={styles.loading}>
                  <Text style={styles.errorText}>Preparando PDF...</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {loading ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>Carregando...</Text>
                </View>
              ) : error ? (
                <View style={styles.loading}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : webSource ? (
                <WebView
                  originWhitelist={['*']}
                  source={
                    webSource.type === 'html'
                      ? { html: webSource.html }
                      : { uri: webSource.uri }
                  }
                  style={styles.webview}
                  allowFileAccess
                  allowUniversalAccessFromFileURLs
                  javaScriptEnabled
                  domStorageEnabled
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error: ', nativeEvent);
                    setError('Erro ao carregar o arquivo no visualizador.');
                  }}
                />
              ) : (
                <View style={styles.loading}>
                  <Text style={styles.errorText}>Arquivo não disponível</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  shareText: {
    color: '#0A84FF',
    fontSize: 15,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFull: {
    width: '100%',
    height: height * 0.85,
  },
  webview: {
    width: '100%',
    height: '100%',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  externalButton: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  externalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

