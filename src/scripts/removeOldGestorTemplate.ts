import { supabase } from '@/src/lib/supabaseClient';

/**
 * Script para remover o template antigo do Salário Gestor
 * Remove apenas o template SEM número de parcela (N/A)
 */

interface RemoveResult {
  success: boolean;
  message: string;
  removedId?: string;
}

export async function removeOldGestorTemplate(): Promise<RemoveResult> {
  try {
    console.log('🔍 Buscando template antigo do Salário Gestor...');

    // Busca o template SEM installment_number
    const { data: oldTemplate, error: searchError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('type', 'DESPESA')
      .ilike('description', '%Salário Gestor%')
      .eq('date', '2025-10-01')
      .eq('is_fixed', true)
      .is('installment_number', null)
      .single();

    if (searchError) {
      if (searchError.code === 'PGRST116') {
        console.log('✅ Nenhum template antigo encontrado.');
        return {
          success: true,
          message: 'Nenhum template antigo encontrado',
        };
      }
      console.error('❌ Erro ao buscar:', searchError);
      return {
        success: false,
        message: `Erro ao buscar: ${searchError.message}`,
      };
    }

    if (!oldTemplate) {
      console.log('✅ Nenhum template antigo encontrado.');
      return {
        success: true,
        message: 'Nenhum template antigo encontrado',
      };
    }

    console.log(`\n📋 Template antigo encontrado:`);
    console.log(`   ID: ${oldTemplate.id}`);
    console.log(`   Data: ${oldTemplate.date}`);
    console.log(`   Parcela: ${oldTemplate.installment_number || 'N/A'}`);
    console.log(`   Criado em: ${oldTemplate.created_at}`);

    // Remove o template antigo
    const { error: deleteError } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', oldTemplate.id);

    if (deleteError) {
      console.error(`❌ Erro ao remover:`, deleteError);
      return {
        success: false,
        message: `Erro ao remover: ${deleteError.message}`,
      };
    }

    console.log(`\n✅ Template antigo removido com sucesso!`);
    console.log(`   ID removido: ${oldTemplate.id}`);

    return {
      success: true,
      message: 'Template antigo removido com sucesso',
      removedId: oldTemplate.id,
    };

  } catch (error) {
    console.error('❌ Erro:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Função auxiliar para executar com feedback
export async function runRemoveOldTemplateWithFeedback(): Promise<void> {
  console.log('\n========================================');
  console.log('  REMOÇÃO: Template Antigo');
  console.log('  Salário Gestor sem número de parcela');
  console.log('========================================\n');

  const result = await removeOldGestorTemplate();

  console.log('\n========================================');
  if (result.success) {
    console.log('  ✅ SUCESSO');
    console.log(`  ${result.message}`);
    if (result.removedId) {
      console.log(`  ID removido: ${result.removedId}`);
    }
  } else {
    console.log('  ❌ FALHA');
    console.log(`  ${result.message}`);
  }
  console.log('========================================\n');
}
