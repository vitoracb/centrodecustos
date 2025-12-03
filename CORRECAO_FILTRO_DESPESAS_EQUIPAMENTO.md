// 🔧 CORREÇÃO PARA FILTRAR DESPESAS POR EQUIPAMENTO
// 
// Localize no arquivo EquipmentDetailScreen.tsx a parte onde as despesas são listadas
// e aplique esta correção:

// ❌ ANTES (ERRADO - mostra todas as despesas):
const allExpenses = getExpensesByCenter(equipment.center);

// ✅ DEPOIS (CORRETO - filtra apenas do equipamento):
const equipmentExpenses = useMemo(() => {
  const allExpenses = getExpensesByCenter(equipment.center);
  return allExpenses.filter(expense => expense.equipmentId === equipment.id);
}, [getExpensesByCenter, equipment.center, equipment.id]);

// ---

// Se estiver usando diretamente no render, mude de:
{allExpenses.map(expense => ...)}

// Para:
{equipmentExpenses.map(expense => ...)}

// ---

// EXEMPLO COMPLETO DE COMO DEVE FICAR:

import { useMemo } from 'react';
// ... outros imports

export const EquipmentDetailScreen = () => {
  // ... código existente
  
  const { getExpensesByCenter } = useFinancial();
  
  // ✅ Filtra despesas apenas deste equipamento
  const equipmentExpenses = useMemo(() => {
    const allExpenses = getExpensesByCenter(equipment.center);
    return allExpenses.filter(expense => expense.equipmentId === equipment.id);
  }, [getExpensesByCenter, equipment.center, equipment.id]);

  // No render da aba Despesas:
  return (
    <View>
      {equipmentExpenses.length > 0 ? (
        equipmentExpenses.map(expense => (
          <View key={expense.id}>
            {/* Card da despesa */}
          </View>
        ))
      ) : (
        <Text>Nenhuma despesa encontrada para este equipamento</Text>
      )}
    </View>
  );
};
