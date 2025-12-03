import { supabase } from '@/src/lib/supabaseClient';

/**
 * Script para corrigir o setor do Salário Gestor
 * De: gestao
 * Para: now
 */

interface FixResult {
  success: boolean;
  message: string;
  updatedCount: number;
}

export async function fixGestorSalarySector(
  expenseName: string = 'Salário Gestor'
): Promise<FixResult> {
  try {
    console.log('🔍 Buscando despesas do Salário Gestor...');
    console.log(`   Nome: ${expenseName}`);

    // Busca todas as despesas (template + parcelas) com esse nome
    const { data: expenses, error: searchError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('type', 'DESPESA')
      .ilike('description', `%${expenseName}%`);

    if (searchError) {
      console.error('❌ Erro ao buscar despesas:', searchError);
      return {
        success: false,
        message: `Erro ao buscar: ${searchError.message}`,
        updatedCount: 0,
      };
    }

    if (!expenses || expenses.length === 0) {
      console.log('⚠️  Nenhuma despesa encontrada com esse nome.');
      return {
        success: false,
        message: 'Despesa não encontrada',
        updatedCount: 0,
      };
    }

    console.log(`✅ Encontrado ${expenses.length} despesa(s)`);

    let updatedCount = 0;

    for (const expense of expenses) {
      console.log(`\n📝 Processando: ${expense.description}`);
      console.log(`   ID: ${expense.id}`);
      console.log(`   Setor atual: ${expense.sector || 'null'}`);
      console.log(`   Parcela: ${expense.installment_number || 'N/A'}`);

      // Atualiza o setor para 'now'
      const { error: updateError } = await supabase
        .from('financial_transactions')
        .update({ sector: 'now' })
        .eq('id', expense.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar ${expense.id}:`, updateError);
        continue;
      }

      console.log(`✅ Setor atualizado para 'now'!`);
      updatedCount++;
    }

    console.log('\n========================================');
    console.log('✅ CORREÇÃO CONCLUÍDA!');
    console.log(`📊 Despesas atualizadas: ${updatedCount}`);
    console.log('========================================\n');

    return {
      success: true,
      message: 'Setores corrigidos com sucesso',
      updatedCount,
    };

  } catch (error) {
    console.error('❌ Erro na correção:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      updatedCount: 0,
    };
  }
}

// Função auxiliar para executar com feedback
export async function runSectorFixWithFeedback(
  expenseName?: string
): Promise<void> {
  console.log('\n========================================');
  console.log('  CORREÇÃO: Setor do Salário Gestor');
  console.log('  De: gestao → Para: now');
  console.log('========================================\n');

  const result = await fixGestorSalarySector(expenseName);

  if (result.success) {
    console.log('✅ Sucesso!');
    console.log(`   ${result.message}`);
    console.log(`   Atualizados: ${result.updatedCount}`);
  } else {
    console.log('❌ Falha!');
    console.log(`   ${result.message}`);
  }
}

// Exemplo de uso:
// import { runSectorFixWithFeedback } from './scripts/fixGestorSalarySector';
// runSectorFixWithFeedback('Salário Gestor');
