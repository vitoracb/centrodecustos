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
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';

interface FilePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  fileUri?: string;
  fileName?: string;
  mimeType?: string | null;
}

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export const FilePreviewModal = ({
  visible,
  onClose,
  onSave,
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
  
  // Timeout para detectar quando o PDF não está carregando
  useEffect(() => {
    if (visible && isPdf && loading) {
      const timeout = setTimeout(() => {
        if (loading && !webSource) {
          setError('O PDF está demorando para carregar. Use o botão "Abrir" para visualizar em um aplicativo externo.');
          setLoading(false);
        }
      }, 8000); // 8 segundos de timeout
      
      return () => clearTimeout(timeout);
    }
  }, [visible, isPdf, loading, webSource]);

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
        
        // Verifica se é uma URL remota (HTTP/HTTPS) - arquivo do banco de dados
        const isRemoteUrl = fileUri.startsWith('http://') || fileUri.startsWith('https://');
        
        if (isRemoteUrl) {
          // Para arquivos remotos do banco de dados
          if (isPdf) {
            // Para PDFs remotos, usa Google Docs Viewer para melhor compatibilidade
            console.log('📥 Carregando PDF remoto:', fileUri);
            if (isMounted) {
              // Usa Google Docs Viewer que funciona muito bem com PDFs remotos
              const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUri)}&embedded=true`;
              const html = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes" />
                    <style>
                      * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                      }
                      html, body {
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background: #000;
                      }
                      iframe {
                        width: 100%;
                        height: 100%;
                        border: none;
                      }
                    </style>
                  </head>
                  <body>
                    <iframe src="${viewerUrl}" frameborder="0"></iframe>
                  </body>
                </html>
              `;
              setWebSource({ type: 'html', html });
              setLoading(false);
            }
          } else if (!isImage) {
            // Para outros arquivos remotos (não PDF, não imagem), usa diretamente
            if (isMounted) {
              setWebSource({ type: 'uri', uri: fileUri });
              setLoading(false);
            }
          } else {
            // Para imagens remotas, não precisa processar
            if (isMounted) {
              setLoading(false);
            }
          }
          return;
        }
        
        // Para arquivos locais, precisa processar
        let uriToRead = fileUri;
        
        // Para content:// URIs no Android, precisamos copiar para o cache primeiro
        if (fileUri.startsWith('content://')) {
          const fileExtension = fileName?.split('.').pop() ?? (isPdf ? 'pdf' : 'bin');
          const cacheDir = (FileSystem as any).cacheDirectory || '';
          if (cacheDir) {
            const dest = `${cacheDir}${Date.now()}.${fileExtension}`;
            try {
              await FileSystem.copyAsync({ from: fileUri, to: dest });
              uriToRead = dest;
            } catch (copyError) {
              console.warn('Erro ao copiar arquivo:', copyError);
              if (isMounted) {
                setError('Não foi possível acessar o arquivo local. No futuro, os arquivos estarão no banco de dados e serão acessíveis por todos.');
                setLoading(false);
              }
              return;
            }
          }
        }
        
        if (isPdf) {
          // Para PDFs locais, converte para base64 e usa HTML com embed
          try {
            const base64 = await FileSystem.readAsStringAsync(uriToRead, {
              encoding: (FileSystem as any).EncodingType?.Base64 || 'base64' as any,
            });
            if (isMounted) {
              const html = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes" />
                    <style>
                      * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                      }
                      html, body {
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background: #000;
                      }
                      embed {
                        width: 100%;
                        height: 100%;
                        border: none;
                      }
                    </style>
                  </head>
                  <body>
                    <embed src="data:application/pdf;base64,${base64}#toolbar=1&navpanes=1&scrollbar=1" type="application/pdf" />
                  </body>
                </html>
              `;
              setWebSource({ type: 'html', html });
              setLoading(false);
            }
          } catch (readError) {
            console.warn('Erro ao processar PDF local:', readError);
            if (isMounted) {
              setError('Não foi possível carregar o PDF local. Use o botão "Abrir" para visualizar. Quando os arquivos estiverem no banco de dados, isso será resolvido automaticamente.');
              setLoading(false);
            }
          }
        } else if (!isImage) {
          // Para outros arquivos locais, tenta base64
          try {
            const base64 = await FileSystem.readAsStringAsync(uriToRead, {
              encoding: (FileSystem as any).EncodingType?.Base64 || 'base64' as any,
            });
            if (isMounted) {
              const type = mimeType ?? 'application/octet-stream';
              setWebSource({ type: 'uri', uri: `data:${type};base64,${base64}` });
              setLoading(false);
            }
          } catch (readError) {
            console.warn('Erro ao ler arquivo local:', readError);
            if (isMounted) {
              setError('Não foi possível carregar o arquivo local.');
              setLoading(false);
            }
          }
        } else {
          // Para imagens, não precisa carregar nada
          if (isMounted) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.warn('Erro ao carregar arquivo:', error);
        if (isMounted) {
          setError('Erro ao processar arquivo.');
          setLoading(false);
        }
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
        // Chama onSave se fornecido (para marcar como lido)
        onSave?.();
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar o arquivo.');
    }
  };

  const handleOpenExternal = async () => {
    if (!fileUri) return;
    try {
      // Para abrir PDFs, usa Sharing que permite escolher o app
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
      }
    } catch (error) {
      console.warn('Erro ao abrir arquivo externo:', error);
      Alert.alert('Erro', 'Não foi possível abrir o arquivo. Tente usar o botão Salvar.');
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
            <View style={styles.headerActions}>
              {isPdf && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleOpenExternal}
                >
                  <Text style={styles.shareText}>Abrir</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleShare}
              >
                <Text style={styles.shareText}>Salvar</Text>
              </TouchableOpacity>
            </View>
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
                  allowFileAccess={true}
                  allowUniversalAccessFromFileURLs={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  mixedContentMode="always"
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error: ', nativeEvent);
                    setError('Erro ao carregar o PDF. Use o botão "Abrir" para visualizar em um aplicativo externo.');
                    setLoading(false);
                  }}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView HTTP error: ', nativeEvent);
                    setError('Erro HTTP ao carregar o PDF.');
                    setLoading(false);
                  }}
                  onLoadEnd={() => {
                    setLoading(false);
                  }}
                  onLoadStart={() => {
                    // Não seta loading aqui porque já está sendo controlado
                  }}
                  onLoad={() => {
                    setLoading(false);
                  }}
                  onMessage={(event) => {
                    console.log('WebView message:', event.nativeEvent.data);
                  }}
                  onShouldStartLoadWithRequest={() => true}
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
                  allowFileAccess={true}
                  allowUniversalAccessFromFileURLs={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  mixedContentMode="always"
                  onLoad={() => {
                    if (isMounted) setLoading(false);
                  }}
                  onLoadEnd={() => {
                    if (isMounted) setLoading(false);
                  }}
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error: ', nativeEvent);
                    if (isMounted) {
                      if (isPdf && fileUri?.startsWith('http')) {
                        setError('Não foi possível carregar o PDF. Use o botão "Abrir" para visualizar em um aplicativo externo.');
                      } else {
                        setError('Erro ao carregar o arquivo no visualizador.');
                      }
                      setLoading(false);
                    }
                  }}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView HTTP error: ', nativeEvent);
                    if (isMounted) {
                      if (isPdf && fileUri?.startsWith('http')) {
                        setError('Erro ao carregar o PDF. Verifique sua conexão ou use o botão "Abrir".');
                      } else {
                        setError('Erro de rede ao carregar o arquivo.');
                      }
                      setLoading(false);
                    }
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
    paddingTop: 50,
    paddingBottom: 28,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  headerButton: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 60,
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

