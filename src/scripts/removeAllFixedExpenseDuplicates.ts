import { supabase } from '@/src/lib/supabaseClient';

/**
 * Script para remover TODAS as duplicatas de despesas fixas
 * Verifica todas as despesas com mesmo nome, data e installment_number
 */

interface RemoveResult {
  success: boolean;
  message: string;
  removedCount: number;
  details: string[];
}

export async function removeAllFixedExpenseDuplicates(): Promise<RemoveResult> {
  try {
    console.log('🔍 Buscando TODAS as duplicatas de despesas fixas...');

    // Busca todas as despesas fixas (templates e parcelas)
    const { data: allExpenses, error: searchError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('type', 'DESPESA')
      .order('created_at', { ascending: false }); // Mais recentes primeiro

    if (searchError) {
      console.error('❌ Erro ao buscar despesas:', searchError);
      return {
        success: false,
        message: `Erro ao buscar: ${searchError.message}`,
        removedCount: 0,
        details: [],
      };
    }

    if (!allExpenses || allExpenses.length === 0) {
      console.log('⚠️  Nenhuma despesa encontrada.');
      return {
        success: false,
        message: 'Nenhuma despesa encontrada',
        removedCount: 0,
        details: [],
      };
    }

    console.log(`✅ Encontrado ${allExpenses.length} despesa(s) no total`);

    // Agrupa por: description + date + installment_number
    const groupedExpenses: Record<string, any[]> = {};
    
    allExpenses.forEach(expense => {
      const description = expense.description || 'sem-nome';
      const date = expense.date || 'sem-data';
      const installmentNum = expense.installment_number || 0;
      const key = `${description}|${date}|${installmentNum}`;
      
      if (!groupedExpenses[key]) {
        groupedExpenses[key] = [];
      }
      groupedExpenses[key].push(expense);
    });

    let removedCount = 0;
    const details: string[] = [];

    // Para cada grupo, mantém apenas a mais recente
    for (const [key, duplicates] of Object.entries(groupedExpenses)) {
      if (duplicates.length > 1) {
        const [description, date, installmentNum] = key.split('|');
        console.log(`\n📦 Duplicata encontrada:`);
        console.log(`   Descrição: ${description}`);
        console.log(`   Data: ${date}`);
        console.log(`   Parcela: ${installmentNum}`);
        console.log(`   Quantidade: ${duplicates.length} duplicata(s)`);
        
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
            details.push(`${description} - ${date} - Parcela ${installmentNum}`);
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
        details: [],
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
      details,
    };

  } catch (error) {
    console.error('❌ Erro na remoção:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      removedCount: 0,
      details: [],
    };
  }
}

// Função auxiliar para executar com feedback
export async function runRemoveAllDuplicatesWithFeedback(): Promise<void> {
  console.log('\n========================================');
  console.log('  REMOÇÃO DE TODAS AS DUPLICATAS');
  console.log('  Despesas Fixas');
  console.log('========================================\n');

  const result = await removeAllFixedExpenseDuplicates();

  if (result.success) {
    console.log('✅ Sucesso!');
    console.log(`   ${result.message}`);
    console.log(`   Removidos: ${result.removedCount}`);
    if (result.details.length > 0) {
      console.log('\n   Despesas corrigidas:');
      result.details.forEach(detail => console.log(`   - ${detail}`));
    }
  } else {
    console.log('❌ Falha!');
    console.log(`   ${result.message}`);
  }
}

// Exemplo de uso:
// import { runRemoveAllDuplicatesWithFeedback } from './scripts/removeAllFixedExpenseDuplicates';
// runRemoveAllDuplicatesWithFeedback();
