import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { X, Download, Share } from 'lucide-react-native';

interface ReportPreviewModalProps {
  visible: boolean;
  html?: string | null;
  onClose: () => void;
  onDownload: () => void;
  onShare?: () => void;
  downloadLabel: string;
  title?: string;
  isExporting?: boolean;
}

export const ReportPreviewModal = ({
  visible,
  html,
  onClose,
  onDownload,
  onShare,
  downloadLabel,
  title = 'Prévia do Relatório',
  isExporting = false,
}: ReportPreviewModalProps) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewContainer}>
            {html ? (
              <WebView
                originWhitelist={['*']}
                source={{ html }}
                startInLoadingState
                style={styles.webview}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0A84FF" />
                <Text style={styles.loadingText}>Preparando prévia...</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
            {onShare && (
              <TouchableOpacity
                style={[styles.shareButton, isExporting && styles.buttonDisabled]}
                onPress={onShare}
                activeOpacity={0.8}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.shareText}>Gerando...</Text>
                  </>
                ) : (
                  <>
                    <Share size={18} color="#FFFFFF" />
                    <Text style={styles.shareText}>Compartilhar</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.downloadButton, isExporting && styles.buttonDisabled]}
              onPress={onDownload}
              activeOpacity={0.8}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.downloadText}>Gerando...</Text>
                </>
              ) : (
                <>
                  <Download size={18} color="#FFFFFF" />
                  <Text style={styles.downloadText}>{downloadLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  previewContainer: {
    height: 400,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6C6C70',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  shareText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    paddingVertical: 14,
    borderRadius: 14,
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

