import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { removeOldGestorTemplate } from '../scripts/removeOldGestorTemplate';

export function RemoveOldTemplateButton() {
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    Alert.alert(
      'Remover Template Antigo',
      'Isso vai remover o template antigo do Salário Gestor (sem número de parcela). Continuar?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await removeOldGestorTemplate();
              
              if (result.success) {
                Alert.alert(
                  'Sucesso!',
                  result.message,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Erro', result.message);
              }
            } catch (error) {
              Alert.alert('Erro', 'Falha ao remover template antigo');
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={handleRemove}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.buttonText}>🗑️ Remover Template Antigo</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF9500',
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
