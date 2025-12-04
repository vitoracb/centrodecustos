import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { diagnoseGestorSalary } from '../scripts/diagnoseGestorSalary';

export function DiagnoseGestorButton() {
  const [loading, setLoading] = useState(false);

  const handleDiagnose = async () => {
    setLoading(true);
    try {
      await diagnoseGestorSalary();
      Alert.alert(
        'Diagnóstico Completo',
        'Verifique o console do Metro para ver os detalhes.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Falha ao executar diagnóstico');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={handleDiagnose}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.buttonText}>🔍 Diagnosticar Salário Gestor</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0A84FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
