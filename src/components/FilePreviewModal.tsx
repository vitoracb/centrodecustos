import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';

export interface FilePreviewItem {
  fileUri: string;
  fileName: string;
  mimeType: string | null;
}

type FilePreviewModalProps = {
  visible: boolean;
  onClose: () => void;
  fileUri?: string;   // URL pública do Supabase (compatibilidade)
  fileName?: string;
  mimeType?: string | null;
  files?: FilePreviewItem[]; // Array de arquivos para navegação
  initialIndex?: number; // Índice inicial quando usando files
  showApproveButton?: boolean; // Mostra botão de aprovar (apenas para imagens)
  onApprove?: (currentFileUri?: string, currentIndex?: number) => void; // Callback quando aprovar, passa o fileUri e índice atual
  canApprove?: boolean; // Se pode aprovar (não foi aprovado ainda)
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  visible,
  onClose,
  fileUri,
  fileName,
  mimeType,
  files,
  initialIndex = 0,
  showApproveButton = false,
  onApprove,
  canApprove = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Determina se está usando array de arquivos ou arquivo único (compatibilidade)
  // Só considera multi-arquivo se houver mais de 1 arquivo (para mostrar navegação)
  const isMultiFile = files && files.length > 1;
  const currentFile = isMultiFile 
    ? (files[currentIndex] || files[0] || { fileUri: fileUri || '', fileName: fileName || 'Arquivo', mimeType: mimeType || null })
    : { fileUri: fileUri || '', fileName: fileName || 'Arquivo', mimeType: mimeType || null };

  // Atualiza índice quando initialIndex muda
  useEffect(() => {
    if (isMultiFile && initialIndex >= 0 && initialIndex < files.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, isMultiFile, files?.length]);

  // Reseta loading quando muda de arquivo
  useEffect(() => {
    setLoading(true);
    setErrorLoading(null);
  }, [currentFile.fileUri]);

  if (!currentFile.fileUri) {
    return null;
  }

  const isImage = currentFile.mimeType?.startsWith('image/');
  const isPdf =
    currentFile.mimeType === 'application/pdf' ||
    currentFile.fileUri.toLowerCase().endsWith('.pdf');

  const canGoPrevious = isMultiFile && currentIndex > 0;
  const canGoNext = isMultiFile && currentIndex < (files?.length || 0) - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

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
            <View style={styles.headerLeft}>
              {isMultiFile && (
                <TouchableOpacity
                  onPress={handlePrevious}
                  disabled={!canGoPrevious}
                  style={[styles.navButton, !canGoPrevious && styles.navButtonDisabled]}
                  hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                >
                  <ChevronLeft size={20} color={canGoPrevious ? "#1C1C1E" : "#C7C7CC"} />
                </TouchableOpacity>
              )}
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>
                  {currentFile.fileName}
                </Text>
                {isMultiFile && (
                  <Text style={styles.fileCounter}>
                    {currentIndex + 1} de {files.length}
                  </Text>
                )}
              </View>
              {isMultiFile && (
                <TouchableOpacity
                  onPress={handleNext}
                  disabled={!canGoNext}
                  style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
                  hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                >
                  <ChevronRight size={20} color={canGoNext ? "#1C1C1E" : "#C7C7CC"} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
              <X size={22} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {isImage && (
              <>
                <Image
                  source={{ uri: currentFile.fileUri }}
                  style={styles.image}
                  contentFit="contain"
                  cachePolicy="memory-disk"
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
                  source={{ uri: currentFile.fileUri }}
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

          {/* Botão de aprovar (para imagens e PDFs) */}
          {showApproveButton && (isImage || isPdf) && canApprove && onApprove && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => onApprove(currentFile.fileUri, isMultiFile ? currentIndex : undefined)}
                activeOpacity={0.8}
              >
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.approveButtonText}>Aprovar Orçamento</Text>
              </TouchableOpacity>
            </View>
          )}
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
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 8,
  },
  navButton: {
    padding: 4,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  fileCounter: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
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
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});