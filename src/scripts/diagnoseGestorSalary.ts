import { supabase } from '@/src/lib/supabaseClient';

/**
 * Script de diagnóstico para ver todas as despesas do Salário Gestor
 */

export async function diagnoseGestorSalary() {
  try {
    console.log('🔍 DIAGNÓSTICO: Salário Gestor\n');

    const { data: expenses, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('type', 'DESPESA')
      .ilike('description', '%Salário Gestor%')
      .order('date', { ascending: true });

    if (error) {
      console.error('❌ Erro:', error);
      return;
    }

    if (!expenses || expenses.length === 0) {
      console.log('⚠️  Nenhuma despesa encontrada');
      return;
    }

    console.log(`✅ Encontrado ${expenses.length} despesa(s)\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    expenses.forEach((expense, index) => {
      console.log(`📋 Despesa ${index + 1}:`);
      console.log(`   ID: ${expense.id}`);
      console.log(`   Descrição: ${expense.description}`);
      console.log(`   Data: ${expense.date}`);
      console.log(`   Valor: R$ ${expense.value}`);
      console.log(`   Parcela: ${expense.installment_number || 'N/A'}`);
      console.log(`   Is Fixed: ${expense.is_fixed}`);
      console.log(`   Setor: ${expense.sector}`);
      console.log(`   Categoria: ${expense.category}`);
      console.log(`   Criado em: ${expense.created_at}`);
      console.log(`   Centro de Custo: ${expense.cost_center_id}`);
      console.log('───────────────────────────────────────────────────────────\n');
    });

    // Agrupa por data + parcela
    const grouped: Record<string, any[]> = {};
    expenses.forEach(expense => {
      const key = `${expense.date}-${expense.installment_number}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(expense);
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 ANÁLISE DE DUPLICATAS:\n');

    Object.entries(grouped).forEach(([key, items]) => {
      if (items.length > 1) {
        console.log(`⚠️  DUPLICATA ENCONTRADA: ${key}`);
        console.log(`   Quantidade: ${items.length} despesas`);
        items.forEach((item, idx) => {
          console.log(`   ${idx + 1}. ID: ${item.id} | Criado: ${item.created_at}`);
        });
        console.log('');
      }
    });

    const duplicateCount = Object.values(grouped).filter(g => g.length > 1).length;
    if (duplicateCount === 0) {
      console.log('✅ Nenhuma duplicata encontrada!');
    } else {
      console.log(`⚠️  Total de grupos duplicados: ${duplicateCount}`);
    }

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
}
