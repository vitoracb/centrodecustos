/**
 * Script para corrigir parcelas duplicadas no mesmo mês
 * 
 * PROBLEMA:
 * Algumas despesas fixas têm duas parcelas no mesmo mês (ex: 01/10 e 30/10)
 * 
 * SOLUÇÃO:
 * Remove todas as parcelas geradas (is_fixed = false) e regenera corretamente
 * a partir da data do template
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');

  console.log('🔍 Buscando parcelas duplicadas no mesmo mês...\n');

  // Busca todos os templates
  const { data: templates, error: templatesError } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('type', 'DESPESA')
    .eq('is_fixed', true)
    .order('created_at', { ascending: true });

  if (templatesError) {
    console.error('❌ Erro ao buscar templates:', templatesError);
    process.exit(1);
  }

  console.log(`✅ Encontrados ${templates?.length || 0} templates\n`);

  let totalDuplicates = 0;

  for (const template of templates || []) {
    if (!template.fixed_duration_months) continue;

    // Busca todas as parcelas geradas
    const { data: installments } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('type', 'DESPESA')
      .eq('description', template.description)
      .eq('cost_center_id', template.cost_center_id)
      .eq('is_fixed', false)
      .order('date', { ascending: true });

    if (!installments || installments.length === 0) continue;

    // Agrupa por mês
    const byMonth = new Map<string, any[]>();
    for (const inst of installments) {
      const month = inst.date.substring(0, 7); // YYYY-MM
      if (!byMonth.has(month)) {
        byMonth.set(month, []);
      }
      byMonth.get(month)!.push(inst);
    }

    // Verifica se há duplicatas
    const duplicateMonths = Array.from(byMonth.entries()).filter(([_, items]) => items.length > 1);

    if (duplicateMonths.length > 0) {
      console.log(`⚠️  ${template.description}:`);
      console.log(`   Template: ${template.date}`);
      console.log(`   Meses com duplicatas: ${duplicateMonths.length}`);
      
      for (const [month, items] of duplicateMonths) {
        console.log(`   - ${month}: ${items.length} parcelas`);
        for (const item of items) {
          console.log(`     • ${item.date} (ID: ${item.id.substring(0, 8)}...)`);
        }
        totalDuplicates += items.length - 1;
      }
      console.log('');
    }
  }

  if (totalDuplicates === 0) {
    console.log('✅ Nenhuma duplicata encontrada!');
    return;
  }

  console.log('='.repeat(80));
  console.log(`\n📊 RESUMO:`);
  console.log(`   • Total de parcelas duplicadas: ${totalDuplicates}\n`);

  if (!executeMode) {
    console.log('🔍 MODO DRY-RUN: Nenhuma alteração será feita');
    console.log('   Execute com --execute para corrigir as duplicatas\n');
    return;
  }

  console.log('⚠️  INICIANDO CORREÇÃO...\n');

  for (const template of templates || []) {
    if (!template.fixed_duration_months) continue;

    console.log(`🔄 Processando: ${template.description}`);

    // Remove TODAS as parcelas geradas
    const { error: deleteError } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('type', 'DESPESA')
      .eq('description', template.description)
      .eq('cost_center_id', template.cost_center_id)
      .eq('is_fixed', false);

    if (deleteError) {
      console.error(`   ❌ Erro ao remover parcelas:`, deleteError);
      continue;
    }

    console.log(`   ✅ Parcelas antigas removidas`);

    // Regenera as parcelas corretamente
    // Converte a data do banco (YYYY-MM-DD) para evitar problemas de timezone
    const [year, month, day] = template.date.split('-').map(Number);
    const creationMonth = month;
    const creationYear = year;
    const creationDay = day;

    for (let offset = 1; offset < template.fixed_duration_months; offset++) {
      let targetMonth = creationMonth + offset;
      let targetYear = creationYear;

      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear++;
      }

      const lastDay = new Date(targetYear, targetMonth, 0).getDate();
      const day = Math.min(creationDay, lastDay);
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const payload = {
        type: 'DESPESA',
        status: 'CONFIRMADO',
        cost_center_id: template.cost_center_id,
        equipment_id: template.equipment_id,
        value: template.value,
        date: dateStr,
        category: template.category,
        description: template.description,
        payment_method: template.payment_method,
        reference: template.reference,
        is_fixed: false,
        sector: template.sector,
        fixed_duration_months: null,
        installment_number: offset + 1,
      };

      await supabase.from('financial_transactions').insert(payload);
    }

    console.log(`   ✅ ${template.fixed_duration_months - 1} parcelas regeneradas\n`);
  }

  console.log('✅ Correção concluída!');
}

main();
