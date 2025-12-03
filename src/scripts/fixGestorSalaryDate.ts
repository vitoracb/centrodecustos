import { supabase } from '@/src/lib/supabaseClient';

/**
 * Script para corrigir a data da parcela 1/12 do salário do gestor
 * De: Dezembro
 * Para: Outubro
 */

interface FixResult {
  success: boolean;
  message: string;
  updatedCount: number;
}

export async function fixGestorSalaryDate(
  expenseName: string = 'Salário Gestor',
  targetMonth: number = 10, // Outubro
  targetYear: number = 2024
): Promise<FixResult> {
  try {
    console.log('🔍 Buscando despesa fixa do salário do gestor...');
    console.log(`   Nome: ${expenseName}`);
    console.log(`   Nova data: ${targetMonth}/${targetYear}`);

    // Busca o template (parcela 1/12) da despesa fixa
    const { data: templates, error: searchError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('type', 'DESPESA')
      .eq('is_fixed', true)
      .eq('installment_number', 1)
      .ilike('description', `%${expenseName}%`);

    if (searchError) {
      console.error('❌ Erro ao buscar template:', searchError);
      return {
        success: false,
        message: `Erro ao buscar: ${searchError.message}`,
        updatedCount: 0,
      };
    }

    if (!templates || templates.length === 0) {
      console.log('⚠️  Nenhuma despesa fixa encontrada com esse nome.');
      return {
        success: false,
        message: 'Despesa não encontrada',
        updatedCount: 0,
      };
    }

    console.log(`✅ Encontrado ${templates.length} template(s)`);

    let updatedCount = 0;

    for (const template of templates) {
      console.log(`\n📝 Processando: ${template.description}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Data atual: ${template.date}`);

      // Pega o dia da data atual
      const currentDate = new Date(template.date);
      const day = currentDate.getDate();

      // Cria nova data em outubro
      const newDate = new Date(targetYear, targetMonth - 1, day);
      const newDateStr = newDate.toISOString().split('T')[0]; // YYYY-MM-DD

      console.log(`   Nova data: ${newDateStr}`);

      // Atualiza o template
      const { error: updateError } = await supabase
        .from('financial_transactions')
        .update({ date: newDateStr })
        .eq('id', template.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar template ${template.id}:`, updateError);
        continue;
      }

      console.log(`✅ Template atualizado!`);

      // Busca todas as parcelas relacionadas
      const { data: installments, error: installmentsError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('type', 'DESPESA')
        .eq('description', template.description)
        .eq('cost_center_id', template.cost_center_id)
        .eq('is_fixed', false)
        .not('installment_number', 'is', null)
        .order('installment_number', { ascending: true });

      if (installmentsError) {
        console.error('❌ Erro ao buscar parcelas:', installmentsError);
        continue;
      }

      if (installments && installments.length > 0) {
        console.log(`   📦 Atualizando ${installments.length} parcela(s)...`);

        // Atualiza cada parcela
        for (const installment of installments) {
          const installmentNumber = installment.installment_number;
          
          // Calcula nova data (mês base + offset)
          let targetInstallmentMonth = targetMonth + (installmentNumber - 1);
          let targetInstallmentYear = targetYear;

          // Ajusta ano se passar de dezembro
          while (targetInstallmentMonth > 12) {
            targetInstallmentMonth -= 12;
            targetInstallmentYear += 1;
          }

          // Ajusta dia para não ultrapassar último dia do mês
          const lastDayOfMonth = new Date(targetInstallmentYear, targetInstallmentMonth, 0).getDate();
          const installmentDay = Math.min(day, lastDayOfMonth);

          const newInstallmentDate = new Date(targetInstallmentYear, targetInstallmentMonth - 1, installmentDay);
          const newInstallmentDateStr = newInstallmentDate.toISOString().split('T')[0];

          console.log(`      Parcela ${installmentNumber}: ${installment.date} → ${newInstallmentDateStr}`);

          const { error: installmentUpdateError } = await supabase
            .from('financial_transactions')
            .update({ date: newInstallmentDateStr })
            .eq('id', installment.id);

          if (installmentUpdateError) {
            console.error(`      ❌ Erro ao atualizar parcela ${installmentNumber}:`, installmentUpdateError);
          } else {
            console.log(`      ✅ Parcela ${installmentNumber} atualizada`);
          }
        }
      }

      updatedCount++;
    }

    console.log('\n========================================');
    console.log('✅ CORREÇÃO CONCLUÍDA!');
    console.log(`📊 Templates atualizados: ${updatedCount}`);
    console.log('========================================\n');

    return {
      success: true,
      message: 'Datas corrigidas com sucesso',
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
export async function runFixWithFeedback(
  expenseName?: string,
  targetMonth?: number,
  targetYear?: number
): Promise<void> {
  console.log('\n========================================');
  console.log('  CORREÇÃO: Data do Salário do Gestor');
  console.log('========================================\n');

  const result = await fixGestorSalaryDate(expenseName, targetMonth, targetYear);

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
// import { runFixWithFeedback } from './scripts/fixGestorSalaryDate';
// runFixWithFeedback('Salário Gestor', 10, 2024);
