import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { fixGestorSalarySector } from '../scripts/fixGestorSalarySector';

interface FixGestorSectorButtonProps {
  expenseName?: string;
}

export function FixGestorSectorButton({
  expenseName = 'Salário Gestor',
}: FixGestorSectorButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleFix = async () => {
    Alert.alert(
      'Corrigir Setor do Salário',
      'Isso vai alterar o setor de "Gestão" para "Now" em todas as parcelas. Continuar?',
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
              const result = await fixGestorSalarySector(expenseName);
              
              if (result.success) {
                Alert.alert(
                  'Sucesso!',
                  `${result.updatedCount} despesa(s) corrigida(s).\n\nAgora o Salário Gestor aparecerá no setor "Now" nos relatórios.`,
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
        <Text style={styles.buttonText}>🔧 Corrigir Setor: Gestão → Now</Text>
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
