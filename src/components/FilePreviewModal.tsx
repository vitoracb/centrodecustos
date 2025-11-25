import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

type FilePreviewModalProps = {
  visible: boolean;
  onClose: () => void;
  fileUri?: string;   // URL pública do Supabase
  fileName?: string;
  mimeType?: string | null;
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  visible,
  onClose,
  fileUri,
  fileName,
  mimeType,
}) => {
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);

  if (!fileUri) {
    return null;
  }

  const isImage = mimeType?.startsWith('image/');
  const isPdf =
    mimeType === 'application/pdf' ||
    fileUri.toLowerCase().endsWith('.pdf');

  // Se quiser usar Google Docs Viewer em vez de abrir o PDF direto, descomente:
  // const pdfUrl = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(fileUri)}`;
  const pdfUrl = fileUri; // tenta abrir o PDF direto

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {fileName || 'Arquivo'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
              <X size={22} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {isImage && (
              <>
                <Image
                  source={{ uri: fileUri }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoadStart={() => {
                    setLoading(true);
                    setErrorLoading(null);
                  }}
                  onLoadEnd={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setErrorLoading('Não foi possível carregar a imagem.');
                  }}
                />
              </>
            )}

            {isPdf && (
              <>
                <WebView
                  source={{ uri: pdfUrl }}
                  style={styles.webview}
                  onLoadStart={() => {
                    setLoading(true);
                    setErrorLoading(null);
                  }}
                  onLoadEnd={() => setLoading(false)}
                  onError={(e) => {
                    console.log('❌ Erro ao carregar PDF:', e.nativeEvent);
                    setLoading(false);
                    setErrorLoading('Não foi possível carregar o PDF.');
                  }}
                  originWhitelist={['*']}
                  // melhora comportamento em iOS
                  allowsInlineMediaPlayback
                  javaScriptEnabled
                />
              </>
            )}

            {!isImage && !isPdf && (
              <View style={styles.fallback}>
                <Text style={styles.fallbackText}>
                  Pré-visualização não disponível para este tipo de arquivo.
                </Text>
              </View>
            )}

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>
                  {isPdf ? 'Carregando PDF...' : 'Carregando arquivo...'}
                </Text>
              </View>
            )}

            {errorLoading && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorLoading}</Text>
                {isPdf && (
                  <Text style={styles.errorHint}>
                    Tente abrir o arquivo em outro app ou baixe o PDF diretamente.
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 12,
  },
  content: {
    width: '100%',
    height: Platform.OS === 'ios' ? 500 : 520,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F2F2F7',
  },
  fallbackText: {
    color: '#3A3A3C',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  errorBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(255,59,48,0.9)',
  },
  errorText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  errorHint: {
    color: '#FFEFEF',
    fontSize: 12,
    marginTop: 4,
  },
});