import { supabase } from '@/src/lib/supabaseClient';

/**
 * Script para remover duplicatas do Salário Gestor
 * Mantém apenas um conjunto de parcelas (o mais recente)
 */

interface RemoveResult {
  success: boolean;
  message: string;
  removedCount: number;
}

export async function removeDuplicateGestorSalary(
  expenseName: string = 'Salário Gestor'
): Promise<RemoveResult> {
  try {
    console.log('🔍 Buscando duplicatas do Salário Gestor...');
    console.log(`   Nome: ${expenseName}`);

    // Busca todas as despesas com esse nome
    const { data: expenses, error: searchError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('type', 'DESPESA')
      .ilike('description', `%${expenseName}%`)
      .order('created_at', { ascending: false }); // Mais recentes primeiro

    if (searchError) {
      console.error('❌ Erro ao buscar despesas:', searchError);
      return {
        success: false,
        message: `Erro ao buscar: ${searchError.message}`,
        removedCount: 0,
      };
    }

    if (!expenses || expenses.length === 0) {
      console.log('⚠️  Nenhuma despesa encontrada.');
      return {
        success: false,
        message: 'Despesa não encontrada',
        removedCount: 0,
      };
    }

    console.log(`✅ Encontrado ${expenses.length} despesa(s)`);

    // Agrupa por installment_number
    const groupedByInstallment: Record<number, any[]> = {};
    
    expenses.forEach(expense => {
      const installmentNum = expense.installment_number || 0;
      if (!groupedByInstallment[installmentNum]) {
        groupedByInstallment[installmentNum] = [];
      }
      groupedByInstallment[installmentNum].push(expense);
    });

    let removedCount = 0;

    // Para cada número de parcela, mantém apenas a mais recente
    for (const [installmentNum, duplicates] of Object.entries(groupedByInstallment)) {
      if (duplicates.length > 1) {
        console.log(`\n📦 Parcela ${installmentNum}: ${duplicates.length} duplicata(s) encontrada(s)`);
        
        // Mantém a primeira (mais recente) e remove as outras
        const [keep, ...toRemove] = duplicates;
        
        console.log(`   ✅ Mantendo: ${keep.id} (criado em ${keep.created_at})`);
        
        for (const duplicate of toRemove) {
          console.log(`   ❌ Removendo: ${duplicate.id} (criado em ${duplicate.created_at})`);
          
          const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', duplicate.id);

          if (deleteError) {
            console.error(`      ❌ Erro ao remover ${duplicate.id}:`, deleteError);
          } else {
            console.log(`      ✅ Removido com sucesso`);
            removedCount++;
          }
        }
      }
    }

    if (removedCount === 0) {
      console.log('\n✅ Nenhuma duplicata encontrada!');
      return {
        success: true,
        message: 'Nenhuma duplicata encontrada',
        removedCount: 0,
      };
    }

    console.log('\n========================================');
    console.log('✅ REMOÇÃO CONCLUÍDA!');
    console.log(`📊 Duplicatas removidas: ${removedCount}`);
    console.log('========================================\n');

    return {
      success: true,
      message: 'Duplicatas removidas com sucesso',
      removedCount,
    };

  } catch (error) {
    console.error('❌ Erro na remoção:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      removedCount: 0,
    };
  }
}

// Função auxiliar para executar com feedback
export async function runRemoveDuplicatesWithFeedback(
  expenseName?: string
): Promise<void> {
  console.log('\n========================================');
  console.log('  REMOÇÃO DE DUPLICATAS');
  console.log('  Salário Gestor');
  console.log('========================================\n');

  const result = await removeDuplicateGestorSalary(expenseName);

  if (result.success) {
    console.log('✅ Sucesso!');
    console.log(`   ${result.message}`);
    console.log(`   Removidos: ${result.removedCount}`);
  } else {
    console.log('❌ Falha!');
    console.log(`   ${result.message}`);
  }
}

// Exemplo de uso:
// import { runRemoveDuplicatesWithFeedback } from './scripts/removeDuplicateGestorSalary';
// runRemoveDuplicatesWithFeedback('Salário Gestor');
