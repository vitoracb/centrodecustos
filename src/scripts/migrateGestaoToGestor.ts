import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Script de migração: Renomear categoria 'gestao' para 'gestor'
 * 
 * Este script atualiza todas as despesas que têm category='gestao'
 * para category='gestor' no AsyncStorage.
 */

interface Expense {
  id: string;
  name: string;
  category: string;
  date: string;
  value: number;
  center: string;
  [key: string]: any;
}

export async function migrateGestaoToGestor(): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> {
  try {
    console.log('🔄 Iniciando migração de categoria gestao → gestor...');

    // Buscar todas as despesas do AsyncStorage
    const expensesJson = await AsyncStorage.getItem('expenses');
    
    if (!expensesJson) {
      console.log('✅ Nenhuma despesa encontrada. Migração não necessária.');
      return { success: true, migratedCount: 0 };
    }

    const expenses: Expense[] = JSON.parse(expensesJson);
    let migratedCount = 0;

    // Atualizar categoria de 'gestao' para 'gestor'
    const updatedExpenses = expenses.map(expense => {
      if (expense.category === 'gestao') {
        migratedCount++;
        console.log(`  ✓ Migrando despesa: ${expense.name} (${expense.id})`);
        return {
          ...expense,
          category: 'gestor',
        };
      }
      return expense;
    });

    // Salvar despesas atualizadas
    if (migratedCount > 0) {
      await AsyncStorage.setItem('expenses', JSON.stringify(updatedExpenses));
      console.log(`✅ Migração concluída! ${migratedCount} despesa(s) atualizada(s).`);
    } else {
      console.log('✅ Nenhuma despesa com categoria "gestao" encontrada.');
    }

    return {
      success: true,
      migratedCount,
    };

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return {
      success: false,
      migratedCount: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Função auxiliar para executar a migração com feedback visual
export async function runMigrationWithFeedback(): Promise<void> {
  console.log('\n========================================');
  console.log('  MIGRAÇÃO: gestao → gestor');
  console.log('========================================\n');

  const result = await migrateGestaoToGestor();

  console.log('\n========================================');
  if (result.success) {
    console.log('  ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO');
    console.log(`  📊 Despesas migradas: ${result.migratedCount}`);
  } else {
    console.log('  ❌ MIGRAÇÃO FALHOU');
    console.log(`  ⚠️  Erro: ${result.error}`);
  }
  console.log('========================================\n');
}
