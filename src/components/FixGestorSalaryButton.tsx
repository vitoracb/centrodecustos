import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { fixGestorSalaryDate } from '../scripts/fixGestorSalaryDate';

interface FixGestorSalaryButtonProps {
  expenseName?: string;
  targetMonth?: number;
  targetYear?: number;
}

export function FixGestorSalaryButton({
  expenseName = 'Salário',
  targetMonth = 10,
  targetYear = 2024,
}: FixGestorSalaryButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleFix = async () => {
    Alert.alert(
      'Corrigir Data do Salário',
      `Isso vai alterar a data da parcela 1/12 para ${targetMonth}/${targetYear}. Continuar?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Corrigir',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await fixGestorSalaryDate(expenseName, targetMonth, targetYear);
              
              if (result.success) {
                Alert.alert(
                  'Sucesso!',
                  `${result.updatedCount} despesa(s) corrigida(s).\n\n${result.message}`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Erro', result.message);
              }
            } catch (error) {
              Alert.alert('Erro', 'Falha ao executar correção');
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
      onPress={handleFix}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.buttonText}>🔧 Corrigir Data Salário Gestor</Text>
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
