import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { removeDuplicateGestorSalary } from '../scripts/removeDuplicateGestorSalary';

interface RemoveDuplicateGestorButtonProps {
  expenseName?: string;
}

export function RemoveDuplicateGestorButton({
  expenseName = 'Salário Gestor',
}: RemoveDuplicateGestorButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    Alert.alert(
      'Remover Duplicatas',
      'Isso vai remover todas as duplicatas do Salário Gestor, mantendo apenas as mais recentes. Continuar?',
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
              const result = await removeDuplicateGestorSalary(expenseName);
              
              if (result.success) {
                if (result.removedCount === 0) {
                  Alert.alert(
                    'Nenhuma Duplicata',
                    'Não foram encontradas duplicatas.',
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Sucesso!',
                    `${result.removedCount} duplicata(s) removida(s).\n\nApenas as parcelas mais recentes foram mantidas.`,
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
        <Text style={styles.buttonText}>🗑️ Remover Duplicatas Salário</Text>
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
