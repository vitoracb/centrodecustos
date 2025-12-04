import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { removeAllFixedExpenseDuplicates } from '../scripts/removeAllFixedExpenseDuplicates';

export function RemoveAllDuplicatesButton() {
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    Alert.alert(
      'Remover TODAS as Duplicatas',
      'Isso vai verificar TODAS as despesas e remover duplicatas (mesmo nome, data e parcela). Continuar?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover Tudo',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await removeAllFixedExpenseDuplicates();
              
              if (result.success) {
                if (result.removedCount === 0) {
                  Alert.alert(
                    'Nenhuma Duplicata',
                    'Não foram encontradas duplicatas.',
                    [{ text: 'OK' }]
                  );
                } else {
                  const detailsText = result.details.length > 0 
                    ? '\n\nDespesas corrigidas:\n' + result.details.slice(0, 5).join('\n') + (result.details.length > 5 ? '\n...' : '')
                    : '';
                  
                  Alert.alert(
                    'Sucesso!',
                    `${result.removedCount} duplicata(s) removida(s).${detailsText}`,
                    [{ text: 'OK' }]
                  );
                }
              } else {
                Alert.alert('Erro', result.message);
              }
            } catch (error) {
              Alert.alert('Erro', 'Falha ao remover duplicatas');
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
        <Text style={styles.buttonText}>🗑️ Remover TODAS as Duplicatas</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF3B30',
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
