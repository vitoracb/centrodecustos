/**
 * Configuração customizada do Toast
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, SuccessToast, InfoToast } from 'react-native-toast-message';

export const toastConfig = {
  success: (props: any) => (
    <SuccessToast
      {...props}
      style={styles.successToast}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={styles.errorToast}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={styles.infoToast}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
    />
  ),
};

const styles = StyleSheet.create({
  successToast: {
    borderLeftColor: '#34C759',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorToast: {
    borderLeftColor: '#FF3B30',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoToast: {
    borderLeftColor: '#0A84FF',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contentContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  text1: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  text2: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: 2,
  },
});

